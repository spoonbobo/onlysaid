#!/usr/bin/env python3
"""
Voice Cloning Streaming TTS Server using FastAPI and Coqui TTS
"""

import asyncio
import json
import os
import tempfile
import uuid
import base64
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import soundfile as sf
import numpy as np
from asyncio_throttle import Throttler

from .tts_manager import TTSManager
from .models import StreamingChunk
from .utils import (
    split_text_into_sentences,
    validate_audio_file,
    load_config,
    setup_logging
)


# Global TTS manager instance
tts_manager: Optional[TTSManager] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup resources"""
    global tts_manager
    
    # Initialize TTS manager
    config_path = os.getenv("TTS_MODELS_CONFIG_PATH", "config/models.json")
    tts_manager = TTSManager(config_path)
    await tts_manager.initialize()
    
    logger.info("Voice Cloning TTS Server started successfully")
    yield
    
    # Cleanup
    if tts_manager:
        await tts_manager.cleanup()
    logger.info("Voice Cloning TTS Server stopped")


# Create FastAPI app
app = FastAPI(
    title="Voice Cloning Streaming TTS API",
    description="Voice cloning Text-to-Speech API with streaming support using Coqui TTS",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup logging
setup_logging()

# Rate limiting
rate_limiter = Throttler(rate_limit=100, period=60)


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Voice Cloning Streaming TTS API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    global tts_manager
    if not tts_manager or not tts_manager.is_ready():
        raise HTTPException(status_code=503, detail="TTS service not ready")
    return {"status": "healthy", "models_loaded": len(tts_manager.loaded_models)}


@app.post("/api/voice-clone/upload/stream")
async def stream_voice_clone_upload(
    audio_file: UploadFile = File(...),
    text: str = Form(...),
    language: str = Form("en"),
    model_name: Optional[str] = Form(None)
):
    """Stream voice cloning with uploaded WAV file"""
    global tts_manager
    if not tts_manager:
        raise HTTPException(status_code=503, detail="TTS service not ready")
    
    # Validate audio file
    if not validate_audio_file(audio_file):
        raise HTTPException(status_code=400, detail="Invalid audio file")
    
    async def generate_voice_clone_stream():
        temp_audio_path = None
        try:
            # Save uploaded file temporarily - use a proper temp file approach
            temp_audio_fd, temp_audio_path = tempfile.mkstemp(suffix='.wav')
            try:
                content = await audio_file.read()
                os.write(temp_audio_fd, content)
            finally:
                os.close(temp_audio_fd)  # Always close the file descriptor
            
            # Split text into sentences for streaming
            sentences = split_text_into_sentences(text, max_length=500)
            
            for i, sentence in enumerate(sentences):
                if sentence.strip():
                    # Apply rate limiting
                    async with rate_limiter:
                        # Synthesize audio for this sentence with voice cloning
                        audio_data = await tts_manager.synthesize(
                            text=sentence,
                            language=language,
                            model_name=model_name,
                            speaker_wav=temp_audio_path,
                            speed=1.0
                        )
                    
                    # Create temporary file for this chunk - use mkstemp instead
                    chunk_fd, chunk_path = tempfile.mkstemp(suffix='.wav')
                    try:
                        os.close(chunk_fd)  # Close immediately, we only need the path
                        sf.write(chunk_path, audio_data, tts_manager.sample_rate)
                        
                        # Read and encode audio data as base64
                        with open(chunk_path, 'rb') as f:
                            audio_bytes = f.read()
                        
                        # Create streaming chunk with base64 encoded audio
                        chunk_data = {
                            "chunk_id": i,
                            "audio_data": base64.b64encode(audio_bytes).decode('utf-8'),
                            "text": sentence,
                            "is_final": (i == len(sentences) - 1),
                            "sample_rate": tts_manager.sample_rate
                        }
                        
                        yield f"data: {json.dumps(chunk_data)}\n\n"
                        
                        # Small delay to prevent overwhelming the client
                        await asyncio.sleep(0.1)
                    finally:
                        # Clean up chunk file - now it should work
                        if os.path.exists(chunk_path):
                            try:
                                os.unlink(chunk_path)
                            except OSError:
                                pass  # Ignore if file is still locked
            
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            logger.error(f"Voice cloning streaming error: {str(e)}")
            error_chunk = {
                "error": str(e),
                "chunk_id": -1,
                "is_final": True
            }
            yield f"data: {json.dumps(error_chunk)}\n\n"
        finally:
            # Clean up temp file
            if temp_audio_path and os.path.exists(temp_audio_path):
                try:
                    os.unlink(temp_audio_path)
                except OSError:
                    pass  # Ignore if file is still locked
    
    return StreamingResponse(
        generate_voice_clone_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )


@app.post("/api/voice-clone/filepath/stream")
async def stream_voice_clone_filepath(
    text: str = Form(...),
    audio_file_path: str = Form(...),
    language: str = Form("en"),
    model_name: Optional[str] = Form(None)
):
    """Stream voice cloning with WAV file path"""
    global tts_manager
    if not tts_manager:
        raise HTTPException(status_code=503, detail="TTS service not ready")
    
    # Validate file path
    if not os.path.exists(audio_file_path):
        raise HTTPException(status_code=400, detail=f"Audio file not found: {audio_file_path}")
    
    # Check if it's a valid audio file
    if not audio_file_path.lower().endswith(('.wav', '.mp3', '.flac')):
        raise HTTPException(status_code=400, detail="Invalid audio file format. Supported: wav, mp3, flac")
    
    async def generate_voice_clone_stream():
        try:
            # Split text into sentences for streaming
            sentences = split_text_into_sentences(text, max_length=500)
            
            for i, sentence in enumerate(sentences):
                if sentence.strip():
                    # Apply rate limiting
                    async with rate_limiter:
                        # Synthesize audio for this sentence with voice cloning
                        audio_data = await tts_manager.synthesize(
                            text=sentence,
                            language=language,
                            model_name=model_name,
                            speaker_wav=audio_file_path,
                            speed=1.0
                        )
                    
                    # Create temporary file for this chunk - use mkstemp instead
                    chunk_fd, chunk_path = tempfile.mkstemp(suffix='.wav')
                    try:
                        os.close(chunk_fd)  # Close immediately, we only need the path
                        sf.write(chunk_path, audio_data, tts_manager.sample_rate)
                        
                        # Read and encode audio data as base64
                        with open(chunk_path, 'rb') as f:
                            audio_bytes = f.read()
                        
                        # Create streaming chunk with base64 encoded audio
                        chunk_data = {
                            "chunk_id": i,
                            "audio_data": base64.b64encode(audio_bytes).decode('utf-8'),
                            "text": sentence,
                            "is_final": (i == len(sentences) - 1),
                            "sample_rate": tts_manager.sample_rate
                        }
                        
                        yield f"data: {json.dumps(chunk_data)}\n\n"
                        
                        # Small delay to prevent overwhelming the client
                        await asyncio.sleep(0.1)
                    finally:
                        # Clean up chunk file - now it should work
                        if os.path.exists(chunk_path):
                            try:
                                os.unlink(chunk_path)
                            except OSError:
                                pass  # Ignore if file is still locked
            
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            logger.error(f"Voice cloning streaming error: {str(e)}")
            error_chunk = {
                "error": str(e),
                "chunk_id": -1,
                "is_final": True
            }
            yield f"data: {json.dumps(error_chunk)}\n\n"
    
    return StreamingResponse(
        generate_voice_clone_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )


@app.websocket("/ws/voice-clone")
async def websocket_voice_clone(websocket: WebSocket):
    """WebSocket endpoint for real-time voice cloning with text chunks"""
    global tts_manager
    if not tts_manager:
        await websocket.close(code=1011, reason="TTS service not ready")
        return
    
    await websocket.accept()
    logger.info("WebSocket connection established")
    
    # Session state
    session_id = str(uuid.uuid4())
    reference_audio_path = None
    chunk_counter = 0
    audio_chunks = []  # Store audio chunks for final combination
    session_config = {
        "language": "en",
        "model_name": None,
        "speed": 1.0,
        "combine_chunks": True,
        "streaming_mode": True  # True for real-time, False for batch processing
    }
    
    try:
        while True:
            # Receive message from client
            message = await websocket.receive_text()
            data = json.loads(message)
            
            message_type = data.get("type")
            
            if message_type == "init":
                # Initialize session with reference audio
                reference_audio_b64 = data.get("reference_audio")
                session_config["language"] = data.get("language", "en")
                session_config["model_name"] = data.get("model_name")
                session_config["speed"] = float(data.get("speed", 1.0))
                session_config["combine_chunks"] = data.get("combine_chunks", True)
                session_config["streaming_mode"] = data.get("streaming_mode", True)
                
                if not reference_audio_b64:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "error": "Reference audio is required for initialization"
                    }))
                    continue
                
                # Validate speed parameter
                if not (0.1 <= session_config["speed"] <= 3.0):
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "error": "Speed must be between 0.1 and 3.0"
                    }))
                    continue
                
                # Save reference audio temporarily
                try:
                    audio_data = base64.b64decode(reference_audio_b64)
                    ref_audio_fd, reference_audio_path = tempfile.mkstemp(suffix='.wav')
                    try:
                        os.write(ref_audio_fd, audio_data)
                    finally:
                        os.close(ref_audio_fd)
                    
                    # Reset session state
                    chunk_counter = 0
                    audio_chunks = []
                    
                    # Send initialization success
                    await websocket.send_text(json.dumps({
                        "type": "init_success",
                        "session_id": session_id,
                        "config": session_config
                    }))
                    
                    logger.info(f"Session {session_id} initialized with config: {session_config}")
                    
                except Exception as e:
                    logger.error(f"Failed to initialize session: {str(e)}")
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "error": f"Failed to initialize session: {str(e)}"
                    }))
            
            elif message_type == "text_chunk":
                # Process text chunk and return audio
                if not reference_audio_path:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "error": "Session not initialized. Send 'init' message first."
                    }))
                    continue
                
                text_chunk = data.get("text", "").strip()
                is_final = data.get("is_final", False)
                
                if not text_chunk:
                    if is_final:
                        # Process final combination if enabled
                        if session_config["combine_chunks"] and audio_chunks:
                            await process_final_combination(websocket, session_id, audio_chunks, session_config)
                        else:
                            await websocket.send_text(json.dumps({
                                "type": "session_complete",
                                "session_id": session_id
                            }))
                    continue
                
                try:
                    # Apply rate limiting
                    async with rate_limiter:
                        # Synthesize audio for this text chunk
                        audio_data = await tts_manager.synthesize(
                            text=text_chunk,
                            language=session_config["language"],
                            model_name=session_config["model_name"],
                            speaker_wav=reference_audio_path,
                            speed=session_config["speed"]
                        )
                    
                    # Store audio chunk info for potential combination
                    chunk_info = {
                        "chunk_id": chunk_counter,
                        "audio_data": audio_data,
                        "text": text_chunk,
                        "is_final": is_final
                    }
                    
                    if session_config["combine_chunks"]:
                        audio_chunks.append(chunk_info)
                    
                    # Send individual chunk if in streaming mode
                    if session_config["streaming_mode"]:
                        # Create temporary file for this chunk
                        chunk_fd, chunk_path = tempfile.mkstemp(suffix='.wav')
                        try:
                            os.close(chunk_fd)
                            sf.write(chunk_path, audio_data, tts_manager.sample_rate)
                            
                            # Read and encode audio data as base64
                            with open(chunk_path, 'rb') as f:
                                audio_bytes = f.read()
                            
                            # Send audio chunk back to client
                            response_data = {
                                "type": "audio_chunk",
                                "session_id": session_id,
                                "chunk_id": chunk_counter,
                                "audio_data": base64.b64encode(audio_bytes).decode('utf-8'),
                                "text": text_chunk,
                                "is_final": is_final,
                                "sample_rate": tts_manager.sample_rate,
                                "speed": session_config["speed"]
                            }
                            
                            await websocket.send_text(json.dumps(response_data))
                            logger.info(f"Sent audio chunk {chunk_counter} for session {session_id}")
                        
                        finally:
                            # Clean up chunk file
                            if os.path.exists(chunk_path):
                                try:
                                    os.unlink(chunk_path)
                                except OSError:
                                    pass
                    
                    chunk_counter += 1
                    
                    # Process final combination if this is the last chunk
                    if is_final:
                        if session_config["combine_chunks"]:
                            await process_final_combination(websocket, session_id, audio_chunks, session_config)
                        else:
                            await websocket.send_text(json.dumps({
                                "type": "session_complete",
                                "session_id": session_id
                            }))
                
                except Exception as e:
                    logger.error(f"Error processing text chunk: {str(e)}")
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "error": f"Error processing text chunk: {str(e)}"
                    }))
            
            elif message_type == "update_config":
                # Update session configuration
                if "speed" in data:
                    new_speed = float(data["speed"])
                    if 0.1 <= new_speed <= 3.0:
                        session_config["speed"] = new_speed
                        await websocket.send_text(json.dumps({
                            "type": "config_updated",
                            "session_id": session_id,
                            "config": session_config
                        }))
                    else:
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "error": "Speed must be between 0.1 and 3.0"
                        }))
                
                if "combine_chunks" in data:
                    session_config["combine_chunks"] = bool(data["combine_chunks"])
                
                if "streaming_mode" in data:
                    session_config["streaming_mode"] = bool(data["streaming_mode"])
            
            elif message_type == "ping":
                # Health check
                await websocket.send_text(json.dumps({
                    "type": "pong",
                    "session_id": session_id
                }))
            
            else:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "error": f"Unknown message type: {message_type}"
                }))
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {str(e)}")
    finally:
        # Clean up reference audio file
        if reference_audio_path and os.path.exists(reference_audio_path):
            try:
                os.unlink(reference_audio_path)
            except OSError:
                pass
        logger.info(f"Session {session_id} cleaned up")


async def process_final_combination(websocket: WebSocket, session_id: str, audio_chunks: list, session_config: dict):
    """Process and combine all audio chunks into a final seamless audio file"""
    try:
        if not audio_chunks:
            await websocket.send_text(json.dumps({
                "type": "session_complete",
                "session_id": session_id
            }))
            return
        
        logger.info(f"Combining {len(audio_chunks)} audio chunks for session {session_id}")
        
        # Combine all audio chunks
        combined_audio = []
        combined_text = []
        
        for chunk in audio_chunks:
            combined_audio.append(chunk["audio_data"])
            combined_text.append(chunk["text"])
        
        # Concatenate audio data
        if combined_audio:
            final_audio = np.concatenate(combined_audio, axis=0)
            
            # Create temporary file for combined audio
            combined_fd, combined_path = tempfile.mkstemp(suffix='.wav')
            try:
                os.close(combined_fd)
                sf.write(combined_path, final_audio, tts_manager.sample_rate)
                
                # Read combined audio
                with open(combined_path, 'rb') as f:
                    combined_audio_bytes = f.read()
                
                # Check if audio data is too large for single WebSocket message
                audio_b64 = base64.b64encode(combined_audio_bytes).decode('utf-8')
                max_chunk_size = 800000  # ~800KB to stay under 1MB limit with JSON overhead
                
                if len(audio_b64) > max_chunk_size:
                    # Send audio in chunks
                    await send_large_audio_chunked(
                        websocket, session_id, audio_b64, combined_text, 
                        audio_chunks, session_config, final_audio, max_chunk_size
                    )
                else:
                    # Send as single message
                    response_data = {
                        "type": "combined_audio",
                        "session_id": session_id,
                        "audio_data": audio_b64,
                        "text": " ".join(combined_text),
                        "total_chunks": len(audio_chunks),
                        "sample_rate": tts_manager.sample_rate,
                        "speed": session_config["speed"],
                        "duration": len(final_audio) / tts_manager.sample_rate
                    }
                    
                    await websocket.send_text(json.dumps(response_data))
                    logger.info(f"Sent combined audio for session {session_id} ({len(final_audio)} samples)")
                
                # Send session complete
                await websocket.send_text(json.dumps({
                    "type": "session_complete",
                    "session_id": session_id
                }))
            
            finally:
                # Clean up combined file
                if os.path.exists(combined_path):
                    try:
                        os.unlink(combined_path)
                    except OSError:
                        pass
        
    except Exception as e:
        logger.error(f"Error combining audio chunks: {str(e)}")
        await websocket.send_text(json.dumps({
            "type": "error",
            "error": f"Error combining audio chunks: {str(e)}"
        }))


async def send_large_audio_chunked(websocket: WebSocket, session_id: str, audio_b64: str, 
                                 combined_text: list, audio_chunks: list, session_config: dict, 
                                 final_audio: np.ndarray, max_chunk_size: int):
    """Send large audio data in chunks to avoid WebSocket message size limits"""
    try:
        total_size = len(audio_b64)
        num_chunks = (total_size + max_chunk_size - 1) // max_chunk_size  # Ceiling division
        
        logger.info(f"Sending large audio in {num_chunks} chunks (total size: {total_size} bytes)")
        
        # Send initial metadata
        metadata = {
            "type": "combined_audio_start",
            "session_id": session_id,
            "text": " ".join(combined_text),
            "total_chunks": len(audio_chunks),
            "total_audio_chunks": num_chunks,
            "sample_rate": tts_manager.sample_rate,
            "speed": session_config["speed"],
            "duration": len(final_audio) / tts_manager.sample_rate,
            "total_size": total_size
        }
        
        await websocket.send_text(json.dumps(metadata))
        
        # Send audio chunks
        for i in range(num_chunks):
            start_idx = i * max_chunk_size
            end_idx = min((i + 1) * max_chunk_size, total_size)
            chunk_data = audio_b64[start_idx:end_idx]
            
            chunk_message = {
                "type": "combined_audio_chunk",
                "session_id": session_id,
                "chunk_index": i,
                "total_chunks": num_chunks,
                "audio_data": chunk_data,
                "is_final": (i == num_chunks - 1)
            }
            
            await websocket.send_text(json.dumps(chunk_message))
            logger.info(f"Sent audio chunk {i+1}/{num_chunks} ({len(chunk_data)} bytes)")
            
            # Small delay to prevent overwhelming the connection
            await asyncio.sleep(0.01)
        
        # Send completion message
        completion_message = {
            "type": "combined_audio_complete",
            "session_id": session_id,
            "total_chunks": num_chunks
        }
        
        await websocket.send_text(json.dumps(completion_message))
        logger.info(f"Completed sending large audio for session {session_id}")
        
    except Exception as e:
        logger.error(f"Error sending large audio chunks: {str(e)}")
        await websocket.send_text(json.dumps({
            "type": "error",
            "error": f"Error sending large audio chunks: {str(e)}"
        }))


if __name__ == "__main__":
    # Load configuration
    config = load_config()
    
    # Run server
    uvicorn.run(
        "main:app",
        host=config.get("server", {}).get("host", "0.0.0.0"),
        port=config.get("server", {}).get("port", 8000),
        workers=config.get("server", {}).get("workers", 1),
        reload=config.get("server", {}).get("debug", False),
        access_log=True,
        log_level="info"
    ) 