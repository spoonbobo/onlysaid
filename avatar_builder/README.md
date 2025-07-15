# Voice Cloning Streaming TTS API

A high-performance voice cloning Text-to-Speech API built with FastAPI and Coqui TTS, supporting streaming audio output from reference voice samples.

## Features

- 🎭 **Voice Cloning**: Clone voices from reference audio samples
- 🔄 **Streaming Audio**: Real-time chunked audio streaming
- 📁 **Flexible Input**: Support for file upload or file path
- 🌐 **Multi-language**: Support for 70+ languages
- ⚡ **High Performance**: Async processing with FastAPI
- 🔧 **Configurable**: Flexible model and voice configuration

## Quick Start

### Prerequisites

- Python 3.9+
- UV package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd avatar_builder
```

2. Install dependencies using UV:
```bash
uv sync
```

3. Start the server:
```bash
python start_server.py
```

The server will be available at `http://localhost:8000`

### Basic Usage

#### Voice Cloning with File Upload (Streaming)
```bash
curl -X POST "http://localhost:8000/api/voice-clone/upload/stream" \
  -F "text=Hello, this is my cloned voice!" \
  -F "language=en" \
  -F "audio_file=@reference_voice.wav"
```

#### Voice Cloning with File Path (Streaming)
```bash
curl -X POST "http://localhost:8000/api/voice-clone/filepath/stream" \
  -F "text=Hello, this is my cloned voice!" \
  -F "language=en" \
  -F "audio_file_path=/path/to/reference_voice.wav"
```

## API Endpoints

### Core Endpoints

- `GET /` - API information
- `GET /health` - Health check

### Voice Cloning Endpoints

- `POST /api/voice-clone/upload/stream` - Stream voice cloning with uploaded WAV file
- `POST /api/voice-clone/filepath/stream` - Stream voice cloning with WAV file path

## Configuration

### Models Configuration

Edit `config/models.json` to configure available models:

```json
{
  "languages": {
    "en": "English",
    "es": "Spanish",
    "fr": "French"
  },
  "default_models": {
    "multilingual": {
      "model_name": "tts_models/multilingual/multi-dataset/xtts_v2",
      "description": "XTTS v2 - High quality multilingual TTS with voice cloning",
      "supports_streaming": true,
      "supports_voice_cloning": true,
      "languages": ["en", "es", "fr", "de", "it", "pt"]
    }
  }
}
```

### Environment Variables

Copy `config.env` and customize:

```bash
# Server Configuration
TTS_SERVER_HOST=0.0.0.0
TTS_SERVER_PORT=8000

# Model Configuration
TTS_MODELS_CONFIG_PATH=config/models.json

# Audio Configuration
TTS_SAMPLE_RATE=22050
TTS_CHUNK_SIZE=1024

# GPU Configuration
TTS_USE_GPU=false
```

## Client Examples

### Python Client

```python
import asyncio
import aiohttp

async def clone_voice_upload():
    async with aiohttp.ClientSession() as session:
        data = aiohttp.FormData()
        data.add_field('text', 'Hello, this is my cloned voice!')
        data.add_field('language', 'en')
        
        with open('reference_voice.wav', 'rb') as f:
            data.add_field('audio_file', f, filename='reference_voice.wav')
        
        async with session.post("http://localhost:8000/api/voice-clone/upload/stream", data=data) as response:
            if response.status == 200:
                async for line in response.content:
                    line = line.decode('utf-8').strip()
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            print("Voice cloning completed")
                            break
                        # Process audio chunk
                        print(f"Received chunk: {data_str[:100]}...")

asyncio.run(clone_voice_upload())
```

### JavaScript Client

```javascript
async function cloneVoiceUpload() {
    const formData = new FormData();
    formData.append('text', 'Hello, this is my cloned voice!');
    formData.append('language', 'en');
    
    const fileInput = document.getElementById('audioFile');
    formData.append('audio_file', fileInput.files[0]);
    
    const response = await fetch('http://localhost:8000/api/voice-clone/upload/stream', {
        method: 'POST',
        body: formData
    });
    
    if (response.ok) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6);
                    if (data === '[DONE]') {
                        console.log('Voice cloning completed');
                        return;
                    }
                    // Process audio chunk
                    console.log('Received chunk:', data.substring(0, 100) + '...');
                }
            }
        }
    }
}
```

## Voice Cloning

The API supports voice cloning using reference audio samples:

### Requirements
- Reference audio: 3-30 seconds
- Supported formats: WAV, MP3, FLAC
- Clear speech, minimal background noise
- Single speaker

### Upload Mode
Upload an audio file directly:
```bash
curl -X POST "http://localhost:8000/api/voice-clone/upload/stream" \
  -F "text=Your text here" \
  -F "language=en" \
  -F "audio_file=@reference.wav"
```

### File Path Mode
Provide a server-side file path:
```bash
curl -X POST "http://localhost:8000/api/voice-clone/filepath/stream" \
  -F "text=Your text here" \
  -F "language=en" \
  -F "audio_file_path=/path/to/reference.wav"
```

## Streaming Protocol

The streaming API uses Server-Sent Events (SSE) to deliver audio chunks:

```
POST /api/voice-clone/upload/stream
Content-Type: multipart/form-data

text=Long text to be streamed...
language=en
audio_file=<binary_data>
```

Response:
```
data: {"chunk_id": 0, "text": "First sentence.", "audio_data": "...", "is_final": false}
data: {"chunk_id": 1, "text": "Second sentence.", "audio_data": "...", "is_final": true}
data: [DONE]
```

## Supported Languages

The API supports 70+ languages including:

- **European**: English, Spanish, French, German, Italian, Portuguese, Dutch, Russian, Polish, Czech, Hungarian, Romanian, Bulgarian, Croatian, Slovak, Slovenian, Estonian, Latvian, Lithuanian, Maltese, Catalan, Basque, Galician, Welsh, Irish, Icelandic, Macedonian, Albanian, Serbian, Bosnian, Montenegrin, Ukrainian, Belarusian, Kazakh, Kyrgyz, Uzbek, Tajik, Mongolian, Georgian, Armenian, Azerbaijani

- **Middle Eastern**: Hebrew, Persian, Arabic, Urdu

- **Asian**: Chinese, Japanese, Korean, Hindi, Bengali, Tamil, Telugu, Malayalam, Kannada, Gujarati, Punjabi, Odia, Assamese, Nepali, Sinhala, Myanmar, Khmer, Lao, Thai, Vietnamese, Indonesian, Malay, Filipino

- **African**: Swahili, Amharic, Yoruba, Igbo, Hausa, Zulu, Afrikaans, Xhosa

## Performance Optimization

### GPU Acceleration
Enable GPU support by setting:
```bash
TTS_USE_GPU=true
TTS_GPU_DEVICE=0
```

### Concurrent Requests
Configure concurrent request limits:
```bash
TTS_MAX_CONCURRENT_REQUESTS=10
```

## Development

### Running Tests
```bash
uv run python test_server.py
```

### Development Server
```bash
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### Using the Client Example
```bash
# Voice cloning with upload
uv run python examples/client_example.py \
  --mode upload \
  --text "Hello, this is a test of voice cloning." \
  --reference-audio assets/reference_audio/voice_recording_20250712_110126_preprocessed.wav

# Voice cloning with file path
uv run python examples/client_example.py \
  --mode filepath \
  --text "Hello, this is a test of voice cloning." \
  --reference-audio assets/reference_audio/voice_recording_20250712_110126_preprocessed.wav
```

## Monitoring

### Health Check
```bash
curl http://localhost:8000/health
```

### Metrics
- Models loaded
- Active connections
- Processing statistics

## Troubleshooting

### Common Issues

1. **Model Loading Errors**
   - Check model names in configuration
   - Ensure sufficient memory/disk space
   - Verify network connectivity for model downloads

2. **Audio Quality Issues**
   - Use high-quality reference audio (22kHz+)
   - Ensure reference audio is 3-30 seconds long
   - Check that reference audio has minimal background noise

3. **Performance Issues**
   - Enable GPU acceleration
   - Increase concurrent request limits
   - Use shorter text chunks for faster streaming

### Logging
Logs are available in `logs/tts_server.log` with configurable levels:
```bash
TTS_LOG_LEVEL=DEBUG
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Coqui TTS](https://github.com/coqui-ai/TTS) - The underlying TTS engine
- [FastAPI](https://fastapi.tiangolo.com/) - The web framework
- [UV](https://docs.astral.sh/uv/) - Package management 