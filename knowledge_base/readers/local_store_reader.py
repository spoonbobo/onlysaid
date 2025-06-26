from llama_index.core import DocumentSummaryIndex, SimpleDirectoryReader
from loguru import logger
import os
from datetime import datetime
import uuid
from readers.base_reader import BaseReader
from schemas.document import Document


class LocalStoreReader(BaseReader):
    def __init__(self):
        self.local_path = None
        self.documents = None
        
    def configure(self, config: dict):
        path = config.get("url")
        if not path:
            raise ValueError("Path must be provided for LocalStoreReader")
        
        # Normalize path
        self.local_path = os.path.normpath(path)
        
        # Validate path exists
        if not os.path.exists(self.local_path):
            raise ValueError(f"Path does not exist: {self.local_path}")
        
        # Validate path is a directory
        if not os.path.isdir(self.local_path):
            raise ValueError(f"Path is not a directory: {self.local_path}")

    def load_documents(self):
        logger.info(f"Loading documents from {self.local_path}")
        
        try:
            raw_documents = SimpleDirectoryReader(input_dir=self.local_path, recursive=True).load_data()
            logger.info(f"Loaded {len(raw_documents)} documents from {self.local_path}")
            
            # Transform llama_index documents into structured format for frontend
            structured_documents = []
            
            for doc in raw_documents:
                metadata = doc.metadata
                file_path = metadata.get('file_path', '')
                file_name = metadata.get('file_name', '')
                
                # Extract folder structure from file path
                relative_path = os.path.relpath(file_path, self.local_path)
                folder_path = os.path.dirname(relative_path)
                
                # Determine document type from extension
                file_ext = os.path.splitext(file_name)[1].upper().lstrip('.')
                doc_type = file_ext if file_ext else "TXT"
                
                # Create structured document using the schema
                structured_doc = Document(
                    id=str(uuid.uuid4()),
                    title=file_name,
                    type=doc_type,
                    date=metadata.get('last_modified_date', datetime.now().strftime('%Y-%m-%d')),
                    tags=[doc_type],
                    source="local_store",
                    description=doc.text[:150] + "..." if len(doc.text) > 150 else doc.text,
                    url=f"file://{file_path}",
                    folderId=folder_path,
                    original_doc=doc
                )
                
                structured_documents.append(structured_doc)
            
            return structured_documents
        except Exception as e:
            logger.error(f"Error loading documents: {str(e)}")
            raise