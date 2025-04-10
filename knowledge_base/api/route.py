from typing import List, Dict, Any
import os
from starlette.background import BackgroundTask
from fastapi import Request, Depends, Response, HTTPException
from fastapi.routing import APIRouter
from fastapi.responses import PlainTextResponse, StreamingResponse
from schemas.document import QueryRequest
from loguru import logger
from pydantic import BaseModel
import json
import asyncio

router = APIRouter()

# Dependency to get the KB manager from app state
def get_kb_manager(request: Request):
    return request.app.state.kb_manager

@router.get("/api/list_documents")
async def list_documents(request: Request) -> Dict[str, Any]:
    """
    List all available knowledge base sources, folder structures, and documents.
    """
    kb_manager = request.app.state.kb_manager
    data_sources = kb_manager.get_data_sources()
    logger.info(data_sources)
    
    # Prepare response structure compatible with the frontend
    response = {
        "dataSources": data_sources,
        "folderStructures": {},
        "documents": {}
    }
    
    # Add folder structures and documents for each source
    for source in data_sources:
        source_id = source["id"]
        response["folderStructures"][source_id] = kb_manager.get_folder_structure(source_id)
        response["documents"][source_id] = kb_manager.get_documents(source_id)
    
    return response

@router.post("/api/sync")
async def kb_sync(request: Request) -> Dict[str, Any]:
    """
    Synchronize the knowledge base.
    """
    kb_manager = request.app.state.kb_manager
    # Reload all documents
    kb_manager.load_documents()
    kb_manager.create_indices()
    return {"status": "success", "message": "Knowledge base synchronized"}

@router.post("/api/query")
async def query_knowledge_base(request: Request, query: QueryRequest):
    kb_manager = request.app.state.kb_manager
    
    if query.streaming:
        # Generate a unique ID for this streaming session
        session_id = f"stream_{os.urandom(8).hex()}"
        
        # Store the query parameters for potential reconnection
        kb_manager.store_message(session_id, {
            "query": query.dict(),
            "current_content": "",
            "is_complete": False
        })
        
        # Return a streaming response with cleanup task
        return StreamingResponse(
            stream_tokens(kb_manager, query, session_id),
            media_type="text/event-stream",
            background=BackgroundTask(cleanup_session, kb_manager, session_id)
        )
    else:
        # Return a regular JSON response
        answer = kb_manager.answer_with_context(query)
        return {"status": "success", "results": answer}

async def cleanup_session(kb_manager, session_id):
    """Clean up session data after streaming ends"""
    kb_manager.remove_message(session_id)

async def stream_tokens(kb_manager, query, session_id):
    """Generate server-sent events for streaming tokens with disconnect handling"""
    accumulated_content = ""
    
    # Send initial event
    yield "event: start\ndata: {}\n\n"
    gen = await kb_manager.stream_answer_with_context(query)
    
    try:
        # Use the async streaming method
        async for chunk in gen:
            # Extract the text from the CompletionResponse object
            if hasattr(chunk, 'delta'):
                token = chunk.delta
            elif hasattr(chunk, 'text'):
                token = chunk.text
            elif isinstance(chunk, dict) and 'text' in chunk:
                token = chunk['text']
            elif isinstance(chunk, str):
                token = chunk
            else:
                # Log the unexpected type for debugging
                logger.warning(f"Unexpected token type: {type(chunk)}, value: {chunk}")
                token = str(chunk)
                
            accumulated_content += token
            
            # Update stored content
            kb_manager.update_message_content(session_id, accumulated_content)
            
            data = json.dumps({"token": token})
            yield f"event: token\ndata: {data}\n\n"
            
            # Small delay to prevent overwhelming the client
            await asyncio.sleep(0.01)
    except Exception as e:
        logger.error(f"Streaming error: {str(e)}")
        # We'll mark the session as complete even on error
    finally:
        # Mark session as complete
        if session_id in kb_manager._message_store:
            kb_manager._message_store[session_id]["is_complete"] = True
        
        # Send completion event
        yield "event: end\ndata: {}\n\n"
