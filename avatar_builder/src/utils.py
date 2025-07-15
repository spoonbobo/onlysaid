"""
Utility functions for TTS API
"""

import json
import os
import re
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional
from loguru import logger
import soundfile as sf


def load_config(config_path: str = "config/models.json") -> Dict[str, Any]:
    """Load configuration from JSON file"""
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error(f"Configuration file not found: {config_path}")
        return {}
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in configuration file: {e}")
        return {}


def setup_logging(log_level: str = "INFO", log_file: Optional[str] = None):
    """Setup logging configuration"""
    logger.remove()  # Remove default handler
    
    # Console handler
    logger.add(
        sys.stderr,
        level=log_level,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        colorize=True
    )
    
    # File handler (if specified)
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        logger.add(
            log_file,
            level=log_level,
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            rotation="10 MB",
            retention="7 days",
            compression="zip"
        )


def split_text_into_sentences(text: str, max_length: int = 500) -> List[str]:
    """Split text into sentences with maximum length constraint"""
    # Basic sentence splitting patterns
    sentence_patterns = [
        r'(?<=[.!?])\s+',  # Split on sentence endings
        r'(?<=[.!?])\n+',  # Split on sentence endings with newlines
        r'\n\n+',          # Split on paragraph breaks
    ]
    
    sentences = [text]
    
    # Apply each pattern
    for pattern in sentence_patterns:
        new_sentences = []
        for sentence in sentences:
            new_sentences.extend(re.split(pattern, sentence))
        sentences = [s.strip() for s in new_sentences if s.strip()]
    
    # Further split long sentences
    final_sentences = []
    for sentence in sentences:
        if len(sentence) <= max_length:
            final_sentences.append(sentence)
        else:
            # Split long sentences at punctuation or conjunctions
            parts = split_long_sentence(sentence, max_length)
            final_sentences.extend(parts)
    
    return [s for s in final_sentences if s.strip()]


def split_long_sentence(sentence: str, max_length: int) -> List[str]:
    """Split a long sentence into smaller parts"""
    if len(sentence) <= max_length:
        return [sentence]
    
    # Try to split at natural breakpoints
    breakpoints = [
        r',\s+',           # Commas
        r';\s+',           # Semicolons
        r'\s+and\s+',      # And conjunctions
        r'\s+or\s+',       # Or conjunctions
        r'\s+but\s+',      # But conjunctions
        r'\s+because\s+',  # Because conjunctions
        r'\s+when\s+',     # When conjunctions
        r'\s+where\s+',    # Where conjunctions
        r'\s+which\s+',    # Which conjunctions
        r'\s+that\s+',     # That conjunctions
    ]
    
    parts = [sentence]
    
    for pattern in breakpoints:
        new_parts = []
        for part in parts:
            if len(part) > max_length:
                split_parts = re.split(f'({pattern})', part)
                # Rejoin parts that are too short
                current_part = ""
                for i, split_part in enumerate(split_parts):
                    if len(current_part + split_part) <= max_length:
                        current_part += split_part
                    else:
                        if current_part:
                            new_parts.append(current_part.strip())
                        current_part = split_part
                if current_part:
                    new_parts.append(current_part.strip())
            else:
                new_parts.append(part)
        parts = new_parts
    
    # If still too long, split at word boundaries
    final_parts = []
    for part in parts:
        if len(part) <= max_length:
            final_parts.append(part)
        else:
            words = part.split()
            current_part = ""
            for word in words:
                if len(current_part + " " + word) <= max_length:
                    current_part += " " + word if current_part else word
                else:
                    if current_part:
                        final_parts.append(current_part.strip())
                    current_part = word
            if current_part:
                final_parts.append(current_part.strip())
    
    return [p for p in final_parts if p.strip()]


def validate_audio_file(audio_file) -> bool:
    """Validate uploaded audio file"""
    if not audio_file:
        return False
    
    # Check file size (max 50MB)
    if hasattr(audio_file, 'size') and audio_file.size > 50 * 1024 * 1024:
        return False
    
    # Check file extension
    allowed_extensions = ['.wav', '.mp3', '.flac', '.ogg', '.m4a']
    if hasattr(audio_file, 'filename'):
        ext = Path(audio_file.filename).suffix.lower()
        if ext not in allowed_extensions:
            return False
    
    return True


def get_audio_duration(audio_path: str) -> float:
    """Get duration of audio file in seconds"""
    try:
        info = sf.info(audio_path)
        return info.frames / info.samplerate
    except Exception as e:
        logger.error(f"Error getting audio duration: {e}")
        return 0.0


def normalize_text(text: str) -> str:
    """Normalize text for TTS processing"""
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Remove special characters that might cause issues
    text = re.sub(r'[^\w\s.,!?;:\-\'"()[\]{}]', '', text)
    
    # Normalize quotation marks
    text = re.sub(r'[""''`]', '"', text)
    
    # Normalize dashes
    text = re.sub(r'[–—]', '-', text)
    
    # Remove extra spaces around punctuation
    text = re.sub(r'\s+([.,!?;:])', r'\1', text)
    text = re.sub(r'([.,!?;:])\s+', r'\1 ', text)
    
    return text.strip()


def create_directories():
    """Create necessary directories for the application"""
    directories = [
        "models/cache",
        "models/custom",
        "assets/reference_audio",
        "logs",
        "temp"
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)


def get_available_models_from_config(config: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract available models from configuration"""
    models = []
    
    # Add default models
    default_models = config.get("default_models", {})
    for model_key, model_info in default_models.items():
        model_data = {
            "name": model_info.get("model_name", model_key),
            "description": model_info.get("description", ""),
            "languages": model_info.get("languages", []),
            "supports_streaming": model_info.get("supports_streaming", False),
            "supports_voice_cloning": model_info.get("supports_voice_cloning", False),
            "is_multilingual": len(model_info.get("languages", [])) > 1,
            "speakers": model_info.get("speakers", [])
        }
        models.append(model_data)
    
    # Add custom models
    custom_models = config.get("custom_models", [])
    for model_info in custom_models:
        model_data = {
            "name": model_info.get("name", ""),
            "description": model_info.get("description", ""),
            "languages": [model_info.get("language", "en")],
            "supports_streaming": model_info.get("supports_streaming", False),
            "supports_voice_cloning": model_info.get("supports_voice_cloning", False),
            "is_multilingual": False,
            "speakers": []
        }
        models.append(model_data)
    
    return models


def get_available_languages_from_config(config: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract available languages from configuration"""
    languages_dict = config.get("languages", {})
    models = get_available_models_from_config(config)
    
    languages = []
    for code, name in languages_dict.items():
        # Find models that support this language
        supporting_models = [
            model["name"] for model in models 
            if code in model["languages"]
        ]
        
        if supporting_models:  # Only include languages with available models
            languages.append({
                "code": code,
                "name": name,
                "models": supporting_models
            })
    
    return languages


def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe file operations"""
    # Remove invalid characters
    filename = re.sub(r'[<>:"/\\|?*]', '', filename)
    
    # Replace spaces with underscores
    filename = re.sub(r'\s+', '_', filename)
    
    # Limit length
    if len(filename) > 100:
        filename = filename[:100]
    
    return filename


def format_duration(seconds: float) -> str:
    """Format duration in seconds to human-readable format"""
    if seconds < 60:
        return f"{seconds:.1f}s"
    elif seconds < 3600:
        minutes = int(seconds // 60)
        seconds = seconds % 60
        return f"{minutes}m {seconds:.1f}s"
    else:
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        seconds = seconds % 60
        return f"{hours}h {minutes}m {seconds:.1f}s"


def calculate_audio_stats(audio_data, sample_rate: int) -> Dict[str, Any]:
    """Calculate statistics for audio data"""
    import numpy as np
    
    duration = len(audio_data) / sample_rate
    rms = np.sqrt(np.mean(audio_data**2))
    peak = np.max(np.abs(audio_data))
    
    return {
        "duration": duration,
        "sample_rate": sample_rate,
        "samples": len(audio_data),
        "rms": float(rms),
        "peak": float(peak),
        "dynamic_range": float(peak / rms) if rms > 0 else 0
    } 