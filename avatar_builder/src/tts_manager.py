"""
TTS Manager for handling TTS operations with Coqui TTS
"""

import asyncio
import os
import tempfile
import time
from pathlib import Path
from typing import Dict, List, Optional, Any, Union, AsyncGenerator
import json
import numpy as np
from loguru import logger

try:
    from TTS.api import TTS
    from TTS.utils.manage import ModelManager
    from TTS.utils.synthesizer import Synthesizer
except ImportError as e:
    logger.error(f"TTS import error: {e}")
    TTS = None
    ModelManager = None
    Synthesizer = None

from .utils import (
    load_config,
    get_available_models_from_config,
    get_available_languages_from_config,
    normalize_text,
    create_directories
)


class TTSManager:
    """Manager class for TTS operations"""
    
    def __init__(self, config_path: str = "config/models.json"):
        self.config_path = config_path
        self.config = {}
        self.loaded_models: Dict[str, Any] = {}
        self.default_model = None
        self.sample_rate = 22050
        self.is_initialized = False
        self.model_manager = None
        
        # Create necessary directories
        create_directories()
    
    async def initialize(self):
        """Initialize the TTS manager"""
        try:
            # Load configuration
            self.config = load_config(self.config_path)
            if not self.config:
                raise ValueError("Failed to load configuration")
            
            # Set sample rate from config
            self.sample_rate = self.config.get("streaming", {}).get("sample_rate", 22050)
            
            # Initialize model manager
            if TTS is not None:
                self.model_manager = ModelManager()
            
            # Load default models
            await self._load_default_models()
            
            self.is_initialized = True
            logger.info("TTS Manager initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize TTS Manager: {e}")
            raise
    
    async def _load_default_models(self):
        """Load default models from configuration"""
        default_models = self.config.get("default_models", {})
        
        for model_key, model_info in default_models.items():
            try:
                model_name = model_info.get("model_name")
                if model_name and TTS is not None:
                    logger.info(f"Loading model: {model_name}")
                    
                    # Create TTS instance
                    tts_instance = TTS(model_name=model_name, progress_bar=False)
                    
                    self.loaded_models[model_key] = {
                        "instance": tts_instance,
                        "info": model_info,
                        "name": model_name
                    }
                    
                    # Set first loaded model as default
                    if self.default_model is None:
                        self.default_model = model_key
                        
                    logger.info(f"Successfully loaded model: {model_name}")
                    
            except Exception as e:
                logger.error(f"Failed to load model {model_key}: {e}")
                continue
    
    def is_ready(self) -> bool:
        """Check if TTS manager is ready"""
        return self.is_initialized and len(self.loaded_models) > 0
    
    def get_available_languages(self) -> List[Dict[str, Any]]:
        """Get available languages"""
        return get_available_languages_from_config(self.config)
    
    def get_available_models(self) -> List[Dict[str, Any]]:
        """Get available models"""
        return get_available_models_from_config(self.config)
    
    def _get_model_instance(self, model_name: Optional[str] = None) -> Any:
        """Get TTS model instance"""
        if model_name:
            # Try to find exact match
            for key, model_data in self.loaded_models.items():
                if model_data["name"] == model_name or key == model_name:
                    return model_data["instance"]
        
        # Use default model
        if self.default_model and self.default_model in self.loaded_models:
            return self.loaded_models[self.default_model]["instance"]
        
        # Use first available model
        if self.loaded_models:
            return list(self.loaded_models.values())[0]["instance"]
        
        return None
    
    async def synthesize(
        self,
        text: str,
        language: str = "en",
        model_name: Optional[str] = None,
        speaker_id: Optional[str] = None,
        speaker_wav: Optional[str] = None,
        speed: float = 1.0
    ) -> np.ndarray:
        """Synthesize speech from text"""
        if not self.is_ready():
            raise RuntimeError("TTS Manager not ready")
        
        # Normalize text
        text = normalize_text(text)
        
        # Get model instance
        tts_instance = self._get_model_instance(model_name)
        if tts_instance is None:
            raise RuntimeError("No TTS model available")
        
        try:
            # Prepare synthesis parameters
            synthesis_kwargs = {
                "text": text,
                "language": language if hasattr(tts_instance, 'languages') else None,
                "speaker": speaker_id if hasattr(tts_instance, 'speakers') else None,
                "speaker_wav": speaker_wav if speaker_wav and os.path.exists(speaker_wav) else None,
                "speed": speed
            }
            
            # Remove None values
            synthesis_kwargs = {k: v for k, v in synthesis_kwargs.items() if v is not None}
            
            # Run synthesis in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            audio_data = await loop.run_in_executor(
                None,
                lambda: tts_instance.tts(**synthesis_kwargs)
            )
            
            # Convert to numpy array if needed
            if not isinstance(audio_data, np.ndarray):
                audio_data = np.array(audio_data)
            
            # Ensure float32 format
            if audio_data.dtype != np.float32:
                audio_data = audio_data.astype(np.float32)
            
            # Normalize audio
            if np.max(np.abs(audio_data)) > 0:
                audio_data = audio_data / np.max(np.abs(audio_data)) * 0.95
            
            return audio_data
            
        except Exception as e:
            logger.error(f"TTS synthesis error: {e}")
            raise RuntimeError(f"TTS synthesis failed: {str(e)}")
    
    async def synthesize_streaming(
        self,
        text: str,
        language: str = "en",
        model_name: Optional[str] = None,
        speaker_id: Optional[str] = None,
        speaker_wav: Optional[str] = None,
        speed: float = 1.0,
        chunk_size: int = 1024
    ) -> AsyncGenerator[np.ndarray, None]:
        """Synthesize speech with streaming output"""
        if not self.is_ready():
            raise RuntimeError("TTS Manager not ready")
        
        # For now, we'll simulate streaming by chunking the complete audio
        # In a real implementation, you'd use a streaming-capable TTS model
        audio_data = await self.synthesize(
            text=text,
            language=language,
            model_name=model_name,
            speaker_id=speaker_id,
            speaker_wav=speaker_wav,
            speed=speed
        )
        
        # Yield audio in chunks
        for i in range(0, len(audio_data), chunk_size):
            chunk = audio_data[i:i + chunk_size]
            yield chunk
            # Small delay to simulate streaming
            await asyncio.sleep(0.01)
    
    async def clone_voice(
        self,
        text: str,
        reference_audio_path: str,
        language: str = "en",
        model_name: Optional[str] = None,
        speed: float = 1.0
    ) -> np.ndarray:
        """Clone voice from reference audio"""
        if not os.path.exists(reference_audio_path):
            raise FileNotFoundError(f"Reference audio file not found: {reference_audio_path}")
        
        # Use XTTS or similar voice cloning model
        return await self.synthesize(
            text=text,
            language=language,
            model_name=model_name or "tts_models/multilingual/multi-dataset/xtts_v2",
            speaker_wav=reference_audio_path,
            speed=speed
        )
    
    def get_model_info(self, model_name: Optional[str] = None) -> Dict[str, Any]:
        """Get information about a specific model"""
        if model_name:
            for key, model_data in self.loaded_models.items():
                if model_data["name"] == model_name or key == model_name:
                    return model_data["info"]
        
        # Return default model info
        if self.default_model and self.default_model in self.loaded_models:
            return self.loaded_models[self.default_model]["info"]
        
        return {}
    
    def get_supported_languages(self, model_name: Optional[str] = None) -> List[str]:
        """Get supported languages for a model"""
        model_info = self.get_model_info(model_name)
        return model_info.get("languages", ["en"])
    
    def supports_voice_cloning(self, model_name: Optional[str] = None) -> bool:
        """Check if model supports voice cloning"""
        model_info = self.get_model_info(model_name)
        return model_info.get("supports_voice_cloning", False)
    
    def supports_streaming(self, model_name: Optional[str] = None) -> bool:
        """Check if model supports streaming"""
        model_info = self.get_model_info(model_name)
        return model_info.get("supports_streaming", False)
    
    async def preload_model(self, model_name: str) -> bool:
        """Preload a specific model"""
        try:
            if TTS is None:
                return False
                
            logger.info(f"Preloading model: {model_name}")
            tts_instance = TTS(model_name=model_name, progress_bar=False)
            
            # Generate a key for the model
            model_key = model_name.replace("/", "_").replace("-", "_")
            
            self.loaded_models[model_key] = {
                "instance": tts_instance,
                "info": {
                    "model_name": model_name,
                    "description": f"Preloaded model: {model_name}",
                    "supports_streaming": True,
                    "supports_voice_cloning": "xtts" in model_name.lower(),
                    "languages": ["en"]  # Default, should be detected
                },
                "name": model_name
            }
            
            logger.info(f"Successfully preloaded model: {model_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to preload model {model_name}: {e}")
            return False
    
    async def unload_model(self, model_name: str) -> bool:
        """Unload a specific model"""
        try:
            model_key = None
            for key, model_data in self.loaded_models.items():
                if model_data["name"] == model_name or key == model_name:
                    model_key = key
                    break
            
            if model_key:
                del self.loaded_models[model_key]
                logger.info(f"Unloaded model: {model_name}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to unload model {model_name}: {e}")
            return False
    
    async def cleanup(self):
        """Cleanup resources"""
        try:
            self.loaded_models.clear()
            self.is_initialized = False
            logger.info("TTS Manager cleanup completed")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get TTS manager statistics"""
        return {
            "is_ready": self.is_ready(),
            "loaded_models": len(self.loaded_models),
            "default_model": self.default_model,
            "sample_rate": self.sample_rate,
            "model_names": [model_data["name"] for model_data in self.loaded_models.values()]
        } 