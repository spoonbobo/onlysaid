#!/usr/bin/env python3
"""
Test script for WebSocket ASR endpoint that properly handles WebM audio streaming.
"""

import asyncio
import websockets
import json
import time
import argparse
import logging
from pathlib import Path
import struct
import math
import subprocess

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_ffmpeg_available():
    """Check if FFmpeg is available"""
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def generate_speech_like_audio(duration=3.0, sample_rate=16000, amplitude=0.7):
    """Generate more speech-like audio with multiple frequencies"""
    samples = int(sample_rate * duration)
    audio_data = []
    
    # Speech-like frequencies (formants)
    f1, f2, f3 = 800, 1200, 2400  # Typical vowel formants
    
    for i in range(samples):
        t = i / sample_rate
        # Combine multiple frequencies to simulate speech
        sample = (
            amplitude * 0.5 * math.sin(2 * math.pi * f1 * t) +
            amplitude * 0.3 * math.sin(2 * math.pi * f2 * t) + 
            amplitude * 0.2 * math.sin(2 * math.pi * f3 * t)
        )
        
        # Add some envelope/modulation to make it more speech-like
        envelope = math.sin(2 * math.pi * 5 * t) * 0.1 + 0.9  # 5Hz modulation
        sample *= envelope
        
        # Convert to 16-bit PCM
        pcm_sample = int(sample * 32767)
        pcm_sample = max(-32768, min(32767, pcm_sample))
        audio_data.append(struct.pack('<h', pcm_sample))
    
    return b''.join(audio_data)

def convert_pcm_to_webm(pcm_data, sample_rate=16000):
    """Convert PCM data to WebM format using FFmpeg"""
    try:
        cmd = [
            'ffmpeg',
            '-f', 's16le',  # Input format: signed 16-bit little endian PCM
            '-ar', str(sample_rate),  # Sample rate
            '-ac', '1',  # Channels (mono)
            '-i', 'pipe:0',  # Input from stdin
            '-f', 'webm',  # Output format
            '-c:a', 'libopus',  # Audio codec
            '-b:a', '64k',  # Bitrate
            '-application', 'voip',  # Optimize for voice
            'pipe:1'  # Output to stdout
        ]
        
        logger.info("Converting PCM to WebM using FFmpeg...")
        
        process = subprocess.run(
            cmd,
            input=pcm_data,
            capture_output=True,
            check=True
        )
        
        logger.info(f"Conversion successful: {len(pcm_data)} bytes PCM -> {len(process.stdout)} bytes WebM")
        return process.stdout
        
    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg conversion failed: {e}")
        if e.stderr:
            logger.error(f"FFmpeg stderr: {e.stderr.decode()}")
        return None
    except Exception as e:
        logger.error(f"Error converting PCM to WebM: {e}")
        return None

class ASRWebSocketTester:
    def __init__(self, host="onlysaid-dev.com", endpoint="/asr"):
        self.ws_url = f"ws://{host}{endpoint}"
        self.websocket = None
        
    async def connect(self):
        """Connect to the WebSocket endpoint"""
        try:
            logger.info(f"Connecting to {self.ws_url}")
            self.websocket = await websockets.connect(
                self.ws_url,
                ping_interval=20,
                ping_timeout=10,
                close_timeout=10
            )
            logger.info("Successfully connected to WebSocket")
            return True
        except Exception as e:
            logger.error(f"Failed to connect: {e}")
            return False
    
    async def disconnect(self):
        """Disconnect from the WebSocket"""
        if self.websocket:
            try:
                await self.websocket.close()
                logger.info("Disconnected from WebSocket")
            except Exception as e:
                logger.warning(f"Error during disconnect: {e}")
    
    def is_connected(self):
        """Check if WebSocket is connected"""
        return self.websocket is not None and not self.websocket.closed
    
    async def send_webm_stream(self, webm_data, show_raw=False):
        """Send WebM data as a stream"""
        if not self.websocket:
            logger.error("WebSocket not connected")
            return False, []
            
        responses = []
        
        try:
            # Send in reasonable chunks
            chunk_size = 8192  # 8KB chunks
            total_chunks = (len(webm_data) + chunk_size - 1) // chunk_size
            
            logger.info(f"Sending {len(webm_data)} bytes WebM data in {total_chunks} chunks")
            
            for i in range(0, len(webm_data), chunk_size):
                chunk = webm_data[i:i + chunk_size]
                chunk_num = i // chunk_size + 1
                
                logger.info(f"Sending chunk {chunk_num}/{total_chunks} ({len(chunk)} bytes)")
                if show_raw:
                    logger.debug(f"Raw chunk: {chunk[:20]!r}...")
                
                # Send chunk
                await self.websocket.send(chunk)
                
                # Check for immediate responses
                try:
                    response = await asyncio.wait_for(
                        self.websocket.recv(), 
                        timeout=1.0
                    )
                    
                    if show_raw:
                        logger.info(f"RAW RESPONSE: {response!r}")
                    
                    try:
                        parsed = json.loads(response)
                        logger.info(f"RESPONSE: {parsed}")
                        
                        if parsed.get('status') != 'no_audio_detected':
                            logger.info(f"🎉 Status: {parsed.get('status')}")
                        
                        responses.append({
                            'chunk': chunk_num,
                            'parsed': parsed,
                            'raw': response
                        })
                    except json.JSONDecodeError:
                        logger.info(f"TEXT RESPONSE: {response}")
                        responses.append({
                            'chunk': chunk_num,
                            'raw': response
                        })
                        
                except asyncio.TimeoutError:
                    logger.debug(f"No immediate response for chunk {chunk_num}")
                except websockets.exceptions.ConnectionClosed:
                    logger.warning(f"Connection closed at chunk {chunk_num}")
                    break
                
                # Small delay between chunks
                await asyncio.sleep(0.1)
            
            # Send end signal
            logger.info("Sending end-of-stream signal...")
            await self.websocket.send(b'')
            
            return True, responses
            
        except websockets.exceptions.ConnectionClosed as e:
            logger.warning(f"WebSocket connection closed: {e}")
            return False, responses
        except Exception as e:
            logger.error(f"Error during streaming: {e}")
            return False, responses
    
    async def wait_for_final_results(self, timeout=15, show_raw=False):
        """Wait for final transcription results"""
        logger.info("Waiting for final results...")
        responses = []
        start_time = time.time()
        
        try:
            while time.time() - start_time < timeout:
                try:
                    response = await asyncio.wait_for(
                        self.websocket.recv(), 
                        timeout=2.0
                    )
                    
                    if show_raw:
                        logger.info(f"RAW FINAL: {response!r}")
                    
                    try:
                        parsed = json.loads(response)
                        logger.info(f"FINAL: {parsed}")
                        
                        if parsed.get('type') == 'ready_to_stop':
                            logger.info("🏁 Server ready to stop")
                            responses.append(parsed)
                            break
                        
                        responses.append(parsed)
                        
                    except json.JSONDecodeError:
                        logger.info(f"FINAL TEXT: {response}")
                        responses.append({'raw': response})
                        
                except asyncio.TimeoutError:
                    logger.debug("No response, continuing...")
                    continue
                except websockets.exceptions.ConnectionClosed:
                    logger.info("Connection closed by server")
                    break
                    
        except Exception as e:
            logger.error(f"Error waiting for results: {e}")
            
        return responses
    
    async def test_webm_streaming(self, audio_file=None, show_raw=False):
        """Test WebM audio streaming"""
        logger.info("Testing WebM streaming...")
        
        if not await self.connect():
            return False
        
        try:
            # Generate or load audio
            if audio_file and Path(audio_file).exists():
                with open(audio_file, 'rb') as f:
                    webm_data = f.read()
                logger.info(f"Loaded WebM file: {len(webm_data)} bytes")
            else:
                if not check_ffmpeg_available():
                    logger.error("FFmpeg required for audio generation")
                    return False
                
                logger.info("Generating speech-like audio...")
                pcm_data = generate_speech_like_audio(duration=5.0, amplitude=0.8)
                logger.info(f"Generated PCM: {len(pcm_data)} bytes")
                
                webm_data = convert_pcm_to_webm(pcm_data)
                if webm_data is None:
                    return False
                    
                logger.info(f"WebM data: {len(webm_data)} bytes")
            
            # Stream the data
            success, stream_responses = await self.send_webm_stream(webm_data, show_raw)
            
            if not success:
                logger.error("Failed to stream WebM data")
                return False
            
            logger.info(f"✓ Streamed data ({len(stream_responses)} responses)")
            
            # Wait for final results
            final_responses = await self.wait_for_final_results(timeout=20, show_raw=show_raw)
            
            # Analyze results
            all_responses = stream_responses + final_responses
            logger.info("=== RESULTS ===")
            logger.info(f"Total responses: {len(all_responses)}")
            
            audio_detected = False
            transcriptions = []
            
            for resp in all_responses:
                parsed = resp.get('parsed') if isinstance(resp, dict) else resp
                if parsed and isinstance(parsed, dict):
                    if parsed.get('status') != 'no_audio_detected':
                        audio_detected = True
                        logger.info(f"🎯 Status: {parsed.get('status')}")
                    
                    if parsed.get('lines'):
                        for line in parsed['lines']:
                            if line.get('text'):
                                transcriptions.append(line['text'])
                    
                    if parsed.get('buffer_transcription'):
                        text = parsed['buffer_transcription'].strip()
                        if text:
                            transcriptions.append(text)
            
            if audio_detected:
                logger.info("🎉 AUDIO DETECTED!")
            else:
                logger.info("📝 No audio detected")
            
            if transcriptions:
                logger.info("🎤 TRANSCRIPTIONS:")
                for i, text in enumerate(set(transcriptions), 1):
                    logger.info(f"  {i}: {text}")
            else:
                logger.info("📝 No transcriptions")
            
            return True
            
        except Exception as e:
            logger.error(f"Test failed: {e}")
            return False
        finally:
            await self.disconnect()

async def main():
    parser = argparse.ArgumentParser(description="Test WebM streaming to ASR")
    parser.add_argument("--host", default="onlysaid-dev.com", help="WebSocket host")
    parser.add_argument("--audio-file", help="Path to WebM file")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose logging")
    parser.add_argument("--show-raw", action="store_true", help="Show raw responses")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    tester = ASRWebSocketTester(host=args.host)
    
    logger.info("=== WebM Streaming Test ===")
    logger.info(f"Target: ws://{args.host}/asr")
    
    try:
        success = await tester.test_webm_streaming(args.audio_file, args.show_raw)
        return success
    except KeyboardInterrupt:
        logger.info("Test interrupted")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)