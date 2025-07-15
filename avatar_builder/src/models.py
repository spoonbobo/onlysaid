"""
Pydantic models for TTS API
"""

from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field
import base64


class TTSRequest(BaseModel):
    """Request model for basic TTS synthesis"""
    text: str = Field(..., description="Text to synthesize", min_length=1, max_length=5000)
    language: str = Field(default="en", description="Language code (e.g., 'en', 'es', 'fr')")
    model_name: Optional[str] = Field(None, description="Specific model to use")
    speaker_id: Optional[str] = Field(None, description="Speaker ID for multi-speaker models")
    speaker_wav: Optional[str] = Field(None, description="Path to reference speaker audio file")
    speed: float = Field(default=1.0, description="Speech speed multiplier", ge=0.1, le=3.0)


class TTSStreamRequest(BaseModel):
    """Request model for streaming TTS synthesis"""
    text: str = Field(..., description="Text to synthesize", min_length=1, max_length=10000)
    language: str = Field(default="en", description="Language code")
    model_name: Optional[str] = Field(None, description="Specific model to use")
    speaker_id: Optional[str] = Field(None, description="Speaker ID for multi-speaker models")
    speaker_wav: Optional[str] = Field(None, description="Path to reference speaker audio file")
    speed: float = Field(default=1.0, description="Speech speed multiplier", ge=0.1, le=3.0)
    max_sentence_length: Optional[int] = Field(500, description="Maximum sentence length for chunking")
    chunk_overlap: Optional[int] = Field(50, description="Overlap between chunks in characters")


class TTSResponse(BaseModel):
    """Response model for TTS synthesis"""
    audio_url: str = Field(..., description="URL to the generated audio file")
    duration: float = Field(..., description="Duration of the audio in seconds")
    sample_rate: int = Field(..., description="Sample rate of the audio")
    text: str = Field(..., description="Original text that was synthesized")
    language: str = Field(..., description="Language used for synthesis")
    model_name: str = Field(..., description="Model used for synthesis")


class StreamingChunk(BaseModel):
    """Model for streaming audio chunks"""
    chunk_id: int = Field(..., description="Unique identifier for this chunk")
    audio_data: bytes = Field(..., description="Audio data as bytes")
    text: str = Field(..., description="Text that was synthesized in this chunk")
    is_final: bool = Field(..., description="Whether this is the final chunk")
    duration: Optional[float] = Field(None, description="Duration of this chunk in seconds")
    sample_rate: Optional[int] = Field(None, description="Sample rate of the audio")


class VoiceCloneRequest(BaseModel):
    """Request model for voice cloning"""
    text: str = Field(..., description="Text to synthesize", min_length=1, max_length=5000)
    language: str = Field(default="en", description="Language code")
    model_name: Optional[str] = Field(None, description="Specific model to use")
    reference_audio: str = Field(..., description="Base64 encoded reference audio")
    speed: float = Field(default=1.0, description="Speech speed multiplier", ge=0.1, le=3.0)


class LanguageInfo(BaseModel):
    """Information about a supported language"""
    code: str = Field(..., description="Language code (e.g., 'en', 'es')")
    name: str = Field(..., description="Human-readable language name")
    models: List[str] = Field(..., description="Available models for this language")


class LanguageListResponse(BaseModel):
    """Response model for language list"""
    languages: List[LanguageInfo] = Field(..., description="List of supported languages")


class ModelInfo(BaseModel):
    """Information about a TTS model"""
    name: str = Field(..., description="Model name")
    description: str = Field(..., description="Model description")
    languages: List[str] = Field(..., description="Supported languages")
    supports_streaming: bool = Field(..., description="Whether model supports streaming")
    supports_voice_cloning: bool = Field(..., description="Whether model supports voice cloning")
    is_multilingual: bool = Field(..., description="Whether model is multilingual")
    speakers: Optional[List[str]] = Field(None, description="Available speakers for multi-speaker models")


class ModelListResponse(BaseModel):
    """Response model for model list"""
    models: List[ModelInfo] = Field(..., description="List of available models")


class WebSocketMessage(BaseModel):
    """WebSocket message model"""
    type: str = Field(..., description="Message type (e.g., 'tts_request', 'audio_chunk', 'error')")
    data: Dict[str, Any] = Field(..., description="Message data")


class TTSWebSocketRequest(BaseModel):
    """WebSocket TTS request model"""
    text: str = Field(..., description="Text to synthesize")
    language: str = Field(default="en", description="Language code")
    model_name: Optional[str] = Field(None, description="Specific model to use")
    speaker_id: Optional[str] = Field(None, description="Speaker ID")
    speaker_wav: Optional[str] = Field(None, description="Reference speaker audio path")
    speed: float = Field(default=1.0, description="Speech speed multiplier", ge=0.1, le=3.0)
    stream: bool = Field(default=True, description="Whether to stream the response")


class TTSWebSocketResponse(BaseModel):
    """WebSocket TTS response model"""
    chunk_id: int = Field(..., description="Chunk identifier")
    text: str = Field(..., description="Text for this chunk")
    audio_data: str = Field(..., description="Base64 encoded audio data")
    sample_rate: int = Field(..., description="Sample rate")
    is_final: bool = Field(..., description="Whether this is the final chunk")
    duration: Optional[float] = Field(None, description="Duration of this chunk")


class ErrorResponse(BaseModel):
    """Error response model"""
    error: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, description="Error code")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")


class HealthCheckResponse(BaseModel):
    """Health check response model"""
    status: str = Field(..., description="Service status")
    models_loaded: int = Field(..., description="Number of loaded models")
    uptime: Optional[float] = Field(None, description="Service uptime in seconds")
    version: str = Field(..., description="API version")


class VoiceCloneResponse(BaseModel):
    """Response model for voice cloning"""
    audio_url: str = Field(..., description="URL to the cloned voice audio")
    duration: float = Field(..., description="Duration of the audio")
    similarity_score: Optional[float] = Field(None, description="Similarity score to reference voice")
    model_used: str = Field(..., description="Model used for cloning")


class BatchTTSRequest(BaseModel):
    """Request model for batch TTS processing"""
    texts: List[str] = Field(..., description="List of texts to synthesize", min_items=1, max_items=100)
    language: str = Field(default="en", description="Language code")
    model_name: Optional[str] = Field(None, description="Specific model to use")
    speaker_id: Optional[str] = Field(None, description="Speaker ID")
    speed: float = Field(default=1.0, description="Speech speed multiplier", ge=0.1, le=3.0)
    output_format: str = Field(default="wav", description="Output audio format")


class BatchTTSResponse(BaseModel):
    """Response model for batch TTS processing"""
    results: List[TTSResponse] = Field(..., description="List of synthesis results")
    total_duration: float = Field(..., description="Total duration of all audio files")
    processing_time: float = Field(..., description="Total processing time in seconds") 