from typing import Dict, AsyncGenerator, List, Optional, Any
import os
import uuid
import json
import asyncio
import time

from qdrant_client import QdrantClient
from loguru import logger
from llama_index.core import VectorStoreIndex, StorageContext
from llama_index.vector_stores.qdrant import QdrantVectorStore # type: ignore
from llama_index.embeddings.ollama import OllamaEmbedding # type: ignore
from llama_index.core.llms import ChatMessage
from llama_index.llms.deepseek import DeepSeek # type: ignore
from redis import RedisCluster

from schemas.document import Folder, DataSource, KnowledgeBaseRegistration
from schemas.document import QueryRequest
from readers.base_reader import BaseReader
from readers.local_store_reader import LocalStoreReader
from prompts.lang import lng_map, lng_prompt

class KBManager:
    """Manages configurable data sources and communicates with qdrant"""
    sources: Dict[str, type[BaseReader]] = {
        "local_store": LocalStoreReader,
        "onlysaid-kb": LocalStoreReader
    }

    def __init__(
        self,
        qdrant_client: QdrantClient
    ):
        self.qdrant_client = qdrant_client
        self.embed_model = OllamaEmbedding(
            model_name=os.getenv("EMBED_MODEL"),
            base_url=os.getenv("OLLAMA_API_BASE_URL")
        )
        self.llm = DeepSeek(
            model=os.getenv("OPENAI_MODEL"),
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # TODO: replace with envs
        redis_host = "redis-node-5"
        redis_port = 6379
        redis_password = "bitnami"
        
        self.redis_client = RedisCluster( # type: ignore
            host=redis_host,
            port=redis_port,
            password=redis_password,
            decode_responses=True,
            socket_timeout=5.0,
            socket_connect_timeout=5.0,
            retry_on_timeout=True,
            health_check_interval=30
        )
        
        self.redis_client.ping()
        logger.info("Redis client connected")
        
        # Remove self.indices as we'll rely on Qdrant and Redis tracking
        self._message_store = {}
        self.readers = {}
        self.kb_names: Dict[str, str] = {}
        # self.documents = {}  # We'll store documents in Redis instead
        self._kb_queue = asyncio.Queue()
        
        asyncio.create_task(self._process_kb_queue())
    
    async def _process_kb_queue(self):
        """Background task to process knowledge base registrations"""
        # TODO: if requested registered kb is already in redis, load from redis.
        while True:
            try:
                kb_item = await self._kb_queue.get()
                logger.info(f"Processing KB registration: {kb_item.id}")
                
                self._set_kb_status(kb_item.workspace_id, kb_item.id, "initializing")
                
                if kb_item.source not in self.sources:
                    logger.error(f"Unknown source type: {kb_item.source}")
                    self._set_kb_status(kb_item.workspace_id, kb_item.id, "error")
                    continue
                
                kb_config = {}
                
                if kb_item.source == "local_store":
                    if not kb_item.url:
                        logger.error(f"No path provided for local_store KB {kb_item.id}")
                        self._set_kb_status(kb_item.workspace_id, kb_item.id, "error")
                        continue
                    
                    path = os.path.normpath(kb_item.url)
                    if not os.path.exists(path):
                        logger.error(f"Path does not exist: {path} for KB {kb_item.id}")
                        self._set_kb_status(kb_item.workspace_id, kb_item.id, "error")
                        continue
                    
                    kb_config["path"] = path
                else:
                    kb_config["url"] = kb_item.url
                
                try:
                    reader = self.sources[kb_item.source]()
                    print(kb_config)
                    reader.configure(kb_config)
                    
                    docs = reader.load_documents()
                    self.readers[kb_item.id] = reader
                    # Store documents in Redis instead of self.documents
                    self._store_kb_docs(kb_item.workspace_id, kb_item.id, docs)
                    logger.info(f"Documents: {docs}")
                    
                    folder_structure = self._build_folder_structure(docs)
                    self._set_kb_folder_structure(kb_item.workspace_id, kb_item.id, folder_structure)
                    await asyncio.to_thread(self.create_indices, kb_item.id, kb_item.workspace_id)
                    
                    self._set_kb_status(kb_item.workspace_id, kb_item.id, "running")
                    logger.info(f"KB {kb_item.id} is now running")
                except Exception as e:
                    logger.error(f"Error processing KB {kb_item.id}: {str(e)}")
                    self._set_kb_status(kb_item.workspace_id, kb_item.id, "error")
            except Exception as e:
                logger.error(f"Error in KB queue processing: {str(e)}")
                await asyncio.sleep(5)
    
    def _get_kb_status_key(self, workspace_id: str, kb_id: str) -> str:
        """Generate Redis key for KB status"""
        return f"kb:{workspace_id}:{kb_id}:status"
    
    def _get_kb_folder_structure_key(self, workspace_id: str, kb_id: str) -> str:
        """Generate Redis key for KB folder structure"""
        return f"kb:{workspace_id}:{kb_id}:folder_structure"
    
    def _get_kb_docs_key(self, workspace_id: str, kb_id: str) -> str:
        """Generate Redis key for KB documents"""
        return f"kb:{workspace_id}:{kb_id}:docs"
    
    def _set_kb_status(self, workspace_id: str, kb_id: str, status: str) -> None:
        """Set KB status in Redis"""
        key = self._get_kb_status_key(workspace_id, kb_id)
        self.redis_client.set(key, status)
    
    def _get_kb_status(self, workspace_id: str, kb_id: str) -> str:
        """Get KB status from Redis"""
        key = self._get_kb_status_key(workspace_id, kb_id)
        status = self.redis_client.get(key)
        logger.info(f"Status of {kb_id} in {workspace_id}: {status} (query key: {key})")
        if not status:
            return "not_found"
        return status # type: ignore
    
    def _set_kb_folder_structure(self, workspace_id: str, kb_id: str, folder_structure: list) -> None:
        """Store KB folder structure in Redis"""
        key = self._get_kb_folder_structure_key(workspace_id, kb_id)
        self.redis_client.set(key, json.dumps(folder_structure))
    
    def _get_kb_folder_structure(self, workspace_id: str, kb_id: str) -> list:
        """Get KB folder structure from Redis"""
        key = self._get_kb_folder_structure_key(workspace_id, kb_id)
        folder_structure = self.redis_client.get(key)
        return json.loads(folder_structure) if folder_structure else [] # type: ignore
    
    def _store_kb_docs(self, workspace_id: str, kb_id: str, docs: list) -> None:
        """Store KB documents in Redis"""
        key = self._get_kb_docs_key(workspace_id, kb_id)
        
        # Convert documents to serializable format
        serializable_docs = []
        for doc in docs:
            if hasattr(doc, 'dict'):
                # If it's a Pydantic model
                doc_dict = doc.dict()
                # Handle the original_doc field separately
                if doc.original_doc:
                    # Store only essential info from original_doc
                    if hasattr(doc.original_doc, 'dict'):
                        doc_dict['original_doc'] = {
                            'id_': doc.original_doc.id_,
                            'metadata': doc.original_doc.metadata,
                            'text': doc.original_doc.text_resource.text if hasattr(doc.original_doc, 'text_resource') and doc.original_doc.text_resource else None
                        }
                serializable_docs.append(doc_dict)
            else:
                # If it's already a dict
                serializable_docs.append(doc)
        
        self.redis_client.set(key, json.dumps(serializable_docs))
        logger.info(f"Stored {len(serializable_docs)} documents for KB {kb_id} in Redis")
    
    def _get_kb_docs(self, workspace_id: str, kb_id: str) -> list:
        """Get KB documents from Redis"""
        key = self._get_kb_docs_key(workspace_id, kb_id)
        docs_json = self.redis_client.get(key)
        return json.loads(docs_json) if docs_json else [] # type: ignore
    
    def register_knowledge_base(self, kb_item: KnowledgeBaseRegistration):
        """Register a new knowledge base and queue it for processing"""
        self._set_kb_status(kb_item.workspace_id, kb_item.id, "disabled")
        
        self.kb_names[kb_item.id] = kb_item.name or kb_item.id
        
        asyncio.create_task(self._kb_queue.put(kb_item))
        
        return {"status": "queued", "id": kb_item.id}
    
    def get_kb_status(self, kb_id: str, workspace_id: str):
        """Get the status of a knowledge base"""
        return self._get_kb_status(workspace_id, kb_id)
    
    def create_indices(self, source_name=None, workspace_id=None):
        """Create vector indices for document sources and store in Qdrant
        
        Args:
            source_name: Optional name of specific source to index
            workspace_id: Optional workspace ID for the source
        """
        if source_name:
            sources_to_index = [source_name]
        else:
            # Get all sources from Redis keys matching pattern kb:*:*:docs
            sources_to_index = []
            for key in self.redis_client.scan_iter(match="kb:*:*:docs"):
                parts = key.split(":")
                if len(parts) >= 4:
                    kb_id = parts[2]
                    sources_to_index.append(kb_id)
        
        logger.info(f"Sources to index: {sources_to_index}")
        
        for src_name in sources_to_index:
            # If workspace_id is not provided, try to find it from Redis keys
            src_workspace_id = workspace_id
            if not src_workspace_id:
                for key in self.redis_client.scan_iter(match=f"kb:*:{src_name}:docs"):
                    parts = key.split(":")
                    if len(parts) >= 4:
                        src_workspace_id = parts[1]
                        break
            
            if not src_workspace_id:
                logger.warning(f"Could not find workspace_id for source {src_name}")
                continue
            
            docs = self._get_kb_docs(src_workspace_id, src_name)
            logger.info(f"Creating index for {src_name} with {len(docs)} documents")
            
            original_docs = []
            for doc in docs:
                if 'original_doc' in doc and doc['original_doc']:
                    # Reconstruct a Document object from the stored data
                    from llama_index.core import Document as LlamaDocument
                    from llama_index.core.schema import TextNode
                    
                    original_doc_data = doc['original_doc']
                    text = original_doc_data.get('text', '')
                    metadata = original_doc_data.get('metadata', {})
                    
                    original_doc = LlamaDocument(
                        text=text,
                        metadata=metadata,
                        id_=original_doc_data.get('id_')
                    )
                    original_docs.append(original_doc)
            
            if not original_docs:
                logger.warning(f"No original documents found for {src_name}")
                continue
            
            collection_name = f"kb_{src_name}"
            
            # Delete the collection if it exists
            try:
                if self.qdrant_client.collection_exists(collection_name):
                    logger.info(f"Deleting existing collection {collection_name} for recreation")
                    self.qdrant_client.delete_collection(collection_name)
            except Exception as e:
                logger.error(f"Error checking/deleting collection {collection_name}: {str(e)}")
            
            vector_store = QdrantVectorStore(
                client=self.qdrant_client,
                collection_name=collection_name
            )
            
            storage_context = StorageContext.from_defaults(vector_store=vector_store)
            
            # Create the index but don't store it in memory
            VectorStoreIndex.from_documents(
                original_docs,
                storage_context=storage_context,
                embed_model=self.embed_model
            )
            
            # Store in Redis that this index has been created
            index_key = f"kb:{src_name}:index_created"
            self.redis_client.set(index_key, "true")
            
            logger.info(f"Successfully created index for {src_name} in Qdrant collection '{collection_name}'")
        
        return True

    def generate_context(self, workspace_id: str, query_text: str, knowledge_bases: Optional[List[str]] = None, top_k: int = 5):
       """Generate context from knowledge base for LLM augmentation"""
       results = self.query_knowledge_base(workspace_id, query_text, knowledge_bases, top_k)
       
       context = "Relevant information:\n\n"
       logger.info(f"Results: {len(results)}")
       for i, result in enumerate(results):
           context += f"[Document {i+1}] {result['text']}\n\n"
        
       return context

    def query_knowledge_base(self, workspace_id: str, query_text: str, knowledge_bases: Optional[List[str]] = None, top_k: int = 5):
        """Query the knowledge base and return relevant documents"""
        results = []
        
        if knowledge_bases and len(knowledge_bases) > 0:
            logger.info(f"Querying knowledge bases: {knowledge_bases}")
            sources_to_query = []
            for kb_id in knowledge_bases:
                status = self._get_kb_status(workspace_id, kb_id)
                logger.info(f"Checking status of {kb_id} in {workspace_id}: {status}")
                if status == "running":
                    sources_to_query.append(kb_id)
            
            not_running = [kb_id for kb_id in knowledge_bases if kb_id not in sources_to_query]
            if not_running:
                logger.warning(f"Some requested knowledge bases are not running: {not_running}")
        else:
            # Get all running knowledge bases from Redis
            sources_to_query = []
            for key in self.redis_client.scan_iter(match=f"kb:{workspace_id}:*:status"):
                parts = key.split(":")
                if len(parts) >= 4:
                    kb_id = parts[2]
                    status = self.redis_client.get(key)
                    if status == "running":
                        sources_to_query.append(kb_id)
        
        logger.info(f"Querying knowledge bases: {sources_to_query}")
        
        for source in sources_to_query:
            # Check if index exists
            index_key = f"kb:{source}:index_created"
            if not self.redis_client.exists(index_key):
                # Check if documents exist for this source
                docs_key = self._get_kb_docs_key(workspace_id, source)
                if self.redis_client.exists(docs_key):
                    logger.info(f"Creating index for {source} on demand")
                    self.create_indices(source, workspace_id)
                else:
                    logger.warning(f"No documents found for source {source}")
                    continue
            
            # Create a temporary query engine for this source
            collection_name = f"kb_{source}"
            vector_store = QdrantVectorStore(
                client=self.qdrant_client,
                collection_name=collection_name
            )
            storage_context = StorageContext.from_defaults(vector_store=vector_store)
            index = VectorStoreIndex.from_vector_store(
                vector_store=vector_store,
                storage_context=storage_context,
                embed_model=self.embed_model
            )
            
            query_engine = index.as_query_engine(
                similarity_top_k=top_k,
                llm=self.llm
            )
            response = query_engine.query(query_text)
            
            if hasattr(response, 'source_nodes'):
                for node in response.source_nodes:
                    results.append({
                        "source": source,
                        "text": node.node.text,
                        "score": node.score,
                        "metadata": node.node.metadata
                    })
        
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    async def stream_answer_with_context(self, query: QueryRequest):
        """Stream an answer using RAG with async support"""
        query_text = query.query[-1] if isinstance(query.query, list) else query.query
        
        context = self.generate_context(
            query.workspace_id,
            query_text,
            query.knowledge_bases,
            query.top_k
        )
        
        prompt_template = lng_prompt[query.preferred_language]
        prompt = prompt_template.format(
            preferred_language=lng_map[query.preferred_language],
            context=context,
            conversation_history=query.conversation_history,
            query=query_text
        )
        
        return await self.llm.astream_complete(prompt)
    
    def answer_with_context(self, query: QueryRequest):
        """Generate an answer using RAG with synchronous support"""
        try:
            query_text = query.query[-1] if isinstance(query.query, list) else query.query
            
            # Validate language
            if query.preferred_language not in lng_prompt:
                logger.warning(f"Unsupported language: {query.preferred_language}, defaulting to 'en'")
                query.preferred_language = "en"
            
            context = self.generate_context(
                query.workspace_id,
                query_text, 
                query.knowledge_bases, 
                query.top_k
            )
            
            prompt_template = lng_prompt[query.preferred_language]
            prompt = prompt_template.format(
                preferred_language=lng_map.get(query.preferred_language, "English"),
                context=context,
                conversation_history=query.conversation_history or "",
                query=query_text
            )
            
            response = self.llm.complete(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Error in answer_with_context: {str(e)}")
            raise  # Re-raise so the route handler can catch it
    
    def store_message(self, message_id: str, message_data: dict):
        """Store message data for potential resumption"""
        self._message_store[message_id] = message_data
        
        asyncio.create_task(self._expire_message(message_id, 1800))
    
    async def _expire_message(self, message_id: str, delay_seconds: int):
        """Remove message after delay"""
        await asyncio.sleep(delay_seconds)
        self.remove_message(message_id)
    
    def get_message_by_id(self, message_id: str):
        """Retrieve stored message data"""
        return self._message_store.get(message_id)
    
    def update_message_content(self, message_id: str, content: str):
        """Update the content of a stored message"""
        if message_id in self._message_store:
            self._message_store[message_id]["current_content"] = content
    
    def remove_message(self, message_id: str):
        """Remove a message from storage"""
        if message_id in self._message_store:
            del self._message_store[message_id]

    def _build_folder_structure(self, documents):
        """Build a hierarchical folder structure from document paths"""
        folders = {}
        root_folders = []
        
        for doc in documents:
            folder_id = doc.get("folderId", "") if isinstance(doc, dict) else doc.folderId
            if not folder_id:
                continue
                
            parts = folder_id.split('/')
            current_path = ""
            
            for i, part in enumerate(parts):
                if not part:
                    continue
                    
                parent_path = current_path
                current_path = os.path.join(current_path, part) if current_path else part
                
                if current_path not in folders:
                    folder = Folder(
                        id=current_path,
                        name=part,
                        folders=[],
                        files=[],
                        isOpen=False
                    )
                    folders[current_path] = folder
                    
                    if parent_path:
                        if parent_path in folders:
                            if folder not in folders[parent_path].folders:
                                folders[parent_path].folders.append(folder)
                    else:
                        if folder not in root_folders:
                            root_folders.append(folder)
        
        for doc in documents:
            doc_id = doc.get("id", "") if isinstance(doc, dict) else doc.id
            folder_id = doc.get("folderId", "") if isinstance(doc, dict) else doc.folderId
            if folder_id in folders:
                folders[folder_id].files.append(doc_id)
        
        return [folder.dict() for folder in root_folders]
    
    def get_data_sources(self, workspace_id: str):
        """Return information about available data sources"""
        sources = []
        # Get all document keys for this workspace
        for key in self.redis_client.scan_iter(match=f"kb:{workspace_id}:*:docs"):
            parts = key.split(":")
            if len(parts) >= 4:
                source_name = parts[2]
                status = self._get_kb_status(workspace_id, source_name)
                if status == "running":
                    display_name = source_name
                    
                    if source_name in self.kb_names:
                        display_name = self.kb_names[source_name]
                    elif "-" in source_name:
                        display_name = f"{source_name.split('-')[0]} KB"
                    
                    # Get document count
                    docs = self._get_kb_docs(workspace_id, source_name)
                    
                    source_info = DataSource(
                        id=source_name,
                        name=display_name,
                        icon="database",
                        count=len(docs)
                    )
                    sources.append(source_info.dict())
        return sources

    def get_data_source(self, workspace_id: str, kb_id: str) -> Optional[Dict[str, Any]]:
        """Return information about a specific data source if it is running."""
        status = self._get_kb_status(workspace_id, kb_id)
        if status == "running":
            display_name = kb_id  # Default
            if kb_id in self.kb_names:
                display_name = self.kb_names[kb_id]
            elif "-" in kb_id:  # Fallback logic
                display_name = f"{kb_id.split('-')[0]} KB"
            
            docs = self._get_kb_docs(workspace_id, kb_id)
            
            source_info = DataSource(
                id=kb_id,
                name=display_name,
                icon="database",  # Default icon
                count=len(docs)
            )
            return source_info.dict()
        return None

    def get_folder_structure(self, source_id, workspace_id):
        """Return the folder structure for a specific source"""
        if not workspace_id:
            logger.warning(f"Workspace ID not provided for folder structure retrieval of {source_id}")
            return []
            
        # Get folder structure from Redis
        return self._get_kb_folder_structure(workspace_id, source_id)
    
    def get_documents(self, source_id, workspace_id=None):
        """Return all documents for a specific source"""
        # If workspace_id is not provided, try to find it from Redis keys
        if not workspace_id:
            for key in self.redis_client.scan_iter(match=f"kb:*:{source_id}:docs"):
                parts = key.split(":")
                if len(parts) >= 4:
                    workspace_id = parts[1]
                    break
        
        if not workspace_id:
            logger.warning(f"Could not find workspace_id for source {source_id}")
            return []
        
        return self._get_kb_docs(workspace_id, source_id)

    def update_kb_status(self, kb_id: str, enabled: bool, workspace_id: str):
        """Update the status of a knowledge base (enable/disable)"""
        current_status = self._get_kb_status(workspace_id, kb_id)
        if current_status == "not_found":
            logger.warning(f"Knowledge base {kb_id} not found")
            return {"status": "error", "message": "Knowledge base not found"}
        
        if enabled:
            if current_status == "disabled":
                self._set_kb_status(workspace_id, kb_id, "running")
                logger.info(f"Knowledge base {kb_id} enabled")
        else:
            if current_status == "running":
                self._set_kb_status(workspace_id, kb_id, "disabled")
                logger.info(f"Knowledge base {kb_id} disabled")
        
        return {"status": "success", "id": kb_id, "enabled": enabled}

    def delete_knowledge_base(self, kb_id: str, workspace_id: str):
        """Delete a knowledge base completely"""
        current_status = self._get_kb_status(workspace_id, kb_id)
        if current_status == "not_found":
            logger.warning(f"Knowledge base {kb_id} not found")
            return {"status": "error", "message": "Knowledge base not found"}
        
        try:
            # Delete status key
            status_key = self._get_kb_status_key(workspace_id, kb_id)
            self.redis_client.delete(status_key)
            
            # Delete folder structure key
            folder_structure_key = self._get_kb_folder_structure_key(workspace_id, kb_id)
            self.redis_client.delete(folder_structure_key)
            
            # Delete documents key
            docs_key = self._get_kb_docs_key(workspace_id, kb_id)
            self.redis_client.delete(docs_key)
            
            # Delete index created flag
            index_key = f"kb:{kb_id}:index_created"
            self.redis_client.delete(index_key)
            
            if kb_id in self.readers:
                del self.readers[kb_id]
            
            # Delete the Qdrant collection
            collection_name = f"kb_{kb_id}"
            try:
                self.qdrant_client.delete_collection(collection_name)
                logger.info(f"Deleted Qdrant collection {collection_name}")
            except Exception as e:
                logger.error(f"Error deleting Qdrant collection {collection_name}: {str(e)}")
            
            logger.info(f"Knowledge base {kb_id} deleted")
            return {"status": "success", "message": f"Knowledge base {kb_id} deleted"}
        except Exception as e:
            logger.error(f"Error deleting knowledge base {kb_id}: {str(e)}")
            return {"status": "error", "message": str(e)}
