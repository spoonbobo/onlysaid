#!/usr/bin/env python3
"""
Fixed test script for WebSocket ASR endpoint that sends WebM audio data.
Tests the /asr endpoint which expects WebM format (not raw PCM).
"""

import asyncio
import websockets
import json
import time
import argparse
import logging
from pathlib import Path
import subprocess
import tempfile
import os
import math
import struct

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def generate_sine_wave_pcm(frequency=440, duration=2.0, sample_rate=16000, amplitude=0.8):
    """Generate a sine wave as PCM audio data"""
    samples = int(sample_rate * duration)
    audio_data = []
    
    for i in range(samples):
        # Generate sine wave
        t = i / sample_rate
        sample = amplitude * math.sin(2 * math.pi * frequency * t)
        # Convert to 16-bit PCM
        pcm_sample = int(sample * 32767)
        # Clamp to 16-bit range
        pcm_sample = max(-32768, min(32767, pcm_sample))
        audio_data.append(struct.pack('<h', pcm_sample))  # Little-endian 16-bit
    
    return b''.join(audio_data)

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
        
        # Add some envelope/modulation
        envelope = math.sin(2 * math.pi * 5 * t) * 0.1 + 0.9  # 5Hz modulation
        sample *= envelope
        
        # Convert to 16-bit PCM
        pcm_sample = int(sample * 32767)
        pcm_sample = max(-32768, min(32767, pcm_sample))
        audio_data.append(struct.pack('<h', pcm_sample))
    
    return b''.join(audio_data)

def convert_pcm_to_webm(pcm_data, sample_rate=16000, chunk_duration_ms=1000):
    """Convert PCM data to WebM format using FFmpeg, yielding chunks"""
    try:
        # Create temporary files
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as wav_file:
            wav_path = wav_file.name
            
            # Write PCM data as WAV file
            import wave
            with wave.open(wav_path, 'wb') as wav:
                wav.setnchannels(1)  # mono
                wav.setsampwidth(2)  # 16-bit
                wav.setframerate(sample_rate)
                wav.writeframes(pcm_data)
        
        # Convert WAV to WebM using FFmpeg, streaming output
        cmd = [
            'ffmpeg',
            '-i', wav_path,
            '-f', 'webm',
            '-c:a', 'libopus',
            '-ar', str(sample_rate),
            '-ac', '1',
            '-b:a', '64k',
            # Output chunked WebM segments
            '-f', 'segment',
            '-segment_time', str(chunk_duration_ms / 1000.0),
            '-segment_format', 'webm',
            '-'  # Output to stdout
        ]
        
        logger.info(f"Converting PCM to WebM with FFmpeg: {' '.join(cmd)}")
        
        process = subprocess.run(
            cmd,
            capture_output=True,
            check=True
        )
        
        # Clean up
        os.unlink(wav_path)
        
        return process.stdout
        
    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg conversion failed: {e}")
        logger.error(f"FFmpeg stderr: {e.stderr.decode()}")
        return None
    except Exception as e:
        logger.error(f"Error converting PCM to WebM: {e}")
        return None

def convert_pcm_to_webm_simple(pcm_data, sample_rate=16000):
    """Convert PCM data to WebM format using FFmpeg (simple version)"""
    try:
        # Use FFmpeg to convert PCM to WebM in one go
        cmd = [
            'ffmpeg',
            '-f', 's16le',  # Input format: signed 16-bit little endian PCM
            '-ar', str(sample_rate),  # Sample rate
            '-ac', '1',  # Channels (mono)
            '-i', 'pipe:0',  # Input from stdin
            '-f', 'webm',  # Output format
            '-c:a', 'libopus',  # Audio codec
            '-b:a', '64k',  # Bitrate
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
        logger.error(f"FFmpeg stderr: {e.stderr.decode()}")
        return None
    except FileNotFoundError:
        logger.error("FFmpeg not found. Please install FFmpeg.")
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
            await self.websocket.close()
            logger.info("Disconnected from WebSocket")
    
    async def send_webm_chunks(self, webm_data, chunk_size=None, show_raw=False):
        """Send WebM data in chunks and listen for responses"""
        if not self.websocket:
            logger.error("WebSocket not connected")
            return False, []
            
        responses = []
        
        if chunk_size is None:
            # For WebM, we should send the entire file as it has its own structure
            # But we can still chunk it for testing purposes
            chunk_size = min(8192, len(webm_data))  # 8KB chunks or smaller
        
        try:
            total_chunks = (len(webm_data) + chunk_size - 1) // chunk_size
            logger.info(f"Sending {len(webm_data)} bytes WebM data in {total_chunks} chunks")
            
            for i in range(0, len(webm_data), chunk_size):
                chunk = webm_data[i:i + chunk_size]
                chunk_num = i // chunk_size + 1
                
                logger.info(f"Sending WebM chunk {chunk_num}/{total_chunks} ({len(chunk)} bytes)")
                if show_raw:
                    logger.debug(f"Raw WebM chunk data (first 20 bytes): {chunk[:20]!r}")
                
                await self.websocket.send(chunk)
                
                # Try to receive immediate response after each chunk
                try:
                    response = await asyncio.wait_for(
                        self.websocket.recv(), 
                        timeout=2.0
                    )
                    
                    if show_raw:
                        logger.info(f"RAW RESPONSE after chunk {chunk_num}: {response!r}")
                    
                    # Try to parse as JSON
                    try:
                        parsed_response = json.loads(response)
                        logger.info(f"CHUNK {chunk_num} RESPONSE: {parsed_response}")
                        
                        # Highlight if audio is detected
                        if parsed_response.get('status') != 'no_audio_detected':
                            logger.info(f"🎉 AUDIO DETECTED in chunk {chunk_num}!")
                        
                        responses.append({
                            'chunk': chunk_num,
                            'raw': response,
                            'parsed': parsed_response
                        })
                    except json.JSONDecodeError:
                        logger.info(f"CHUNK {chunk_num} TEXT RESPONSE: {response}")
                        responses.append({
                            'chunk': chunk_num,
                            'raw': response,
                            'parsed': None
                        })
                        
                except asyncio.TimeoutError:
                    logger.debug(f"No immediate response after chunk {chunk_num}")
                
                # Small delay between chunks
                await asyncio.sleep(0.1)
                
            return True, responses
        except Exception as e:
            logger.error(f"Failed to send WebM data: {e}")
            return False, responses
    
    async def receive_remaining_messages(self, timeout=10, show_raw=False):
        """Receive any remaining messages from the WebSocket"""
        if not self.websocket:
            logger.error("WebSocket not connected")
            return []
            
        messages = []
        start_time = time.time()
        
        logger.info("Listening for additional responses...")
        try:
            while time.time() - start_time < timeout:
                try:
                    message = await asyncio.wait_for(
                        self.websocket.recv(), 
                        timeout=1.0
                    )
                    
                    if show_raw:
                        logger.info(f"RAW ADDITIONAL RESPONSE: {message!r}")
                    
                    try:
                        parsed_message = json.loads(message)
                        logger.info(f"ADDITIONAL JSON RESPONSE: {parsed_message}")
                        
                        if parsed_message.get('status') not in ['no_audio_detected', None]:
                            logger.info(f"🎯 PROCESSING STATUS: {parsed_message.get('status')}")
                        
                        messages.append({
                            'raw': message,
                            'parsed': parsed_message
                        })
                    except json.JSONDecodeError:
                        logger.info(f"ADDITIONAL TEXT RESPONSE: {message}")
                        messages.append({
                            'raw': message,
                            'parsed': None
                        })
                        
                except asyncio.TimeoutError:
                    continue
                except websockets.exceptions.ConnectionClosed:
                    logger.warning("WebSocket connection closed")
                    break
                    
        except Exception as e:
            logger.error(f"Error receiving messages: {e}")
            
        return messages
    
    async def test_with_webm_audio(self, audio_file=None, show_raw=False):
        """Test with properly formatted WebM audio data"""
        logger.info("Testing with WebM audio data...")
        
        if not await self.connect():
            return False
        
        try:
            # Generate or load audio data
            if audio_file and Path(audio_file).exists():
                if audio_file.lower().endswith(('.webm', '.opus')):
                    # Load WebM file directly
                    with open(audio_file, 'rb') as f:
                        webm_data = f.read()
                    logger.info(f"Loaded WebM file: {audio_file} ({len(webm_data)} bytes)")
                else:
                    # Load other formats and try to convert
                    logger.info(f"Loading and converting {audio_file} to WebM...")
                    # For simplicity, assume it's raw PCM or let FFmpeg handle it
                    with open(audio_file, 'rb') as f:
                        raw_data = f.read()
                    webm_data = convert_pcm_to_webm_simple(raw_data)
                    if webm_data is None:
                        logger.error("Failed to convert audio file to WebM")
                        return False
            else:
                # Generate test audio and convert to WebM
                logger.info("Generating test audio and converting to WebM...")
                pcm_data = generate_speech_like_audio(duration=5.0, amplitude=0.8)
                logger.info(f"Generated PCM audio: {len(pcm_data)} bytes")
                
                webm_data = convert_pcm_to_webm_simple(pcm_data)
                if webm_data is None:
                    logger.error("Failed to convert generated audio to WebM")
                    return False
            
            logger.info(f"WebM data ready: {len(webm_data)} bytes")
            if show_raw:
                logger.debug(f"WebM data header (first 50 bytes): {webm_data[:50]!r}")
            
            # Send the WebM data
            success, chunk_responses = await self.send_webm_chunks(
                webm_data, 
                chunk_size=8192,  # 8KB chunks
                show_raw=show_raw
            )
            
            if success:
                logger.info("✓ Successfully sent WebM audio data")
                
                # Wait for any additional responses
                additional_responses = await self.receive_remaining_messages(
                    timeout=15, 
                    show_raw=show_raw
                )
                
                # Summary
                logger.info("=== RESPONSE SUMMARY ===")
                logger.info(f"Immediate chunk responses: {len(chunk_responses)}")
                logger.info(f"Additional responses: {len(additional_responses)}")
                
                # Check for transcriptions and audio detection
                transcriptions = []
                audio_detected = False
                
                for resp in chunk_responses + additional_responses:
                    if resp.get('parsed'):
                        parsed = resp['parsed']
                        
                        # Check audio detection
                        if parsed.get('status') != 'no_audio_detected':
                            audio_detected = True
                            logger.info(f"🎯 Status: {parsed.get('status')}")
                        
                        # Check for transcriptions
                        if parsed.get('lines'):
                            transcriptions.extend(parsed['lines'])
                        if parsed.get('buffer_transcription') and parsed['buffer_transcription'].strip():
                            transcriptions.append(parsed['buffer_transcription'])
                
                if audio_detected:
                    logger.info("🎉 AUDIO WAS DETECTED by the server!")
                else:
                    logger.warning("⚠️  Audio might not be detected (WebM conversion may need tuning)")
                
                if transcriptions:
                    logger.info("🎤 TRANSCRIPTIONS FOUND:")
                    for i, transcription in enumerate(transcriptions, 1):
                        logger.info(f"  {i}: {transcription}")
                else:
                    logger.info("📝 No transcriptions yet (may need real speech or longer audio)")
                
                return True
            else:
                logger.error("✗ Failed to send WebM audio data")
                return False
                
        except Exception as e:
            logger.error(f"Test failed with error: {e}")
            return False
        finally:
            await self.disconnect()

    async def test_connection(self):
        """Test basic WebSocket connection"""
        logger.info("Testing WebSocket connection...")
        
        if await self.connect():
            logger.info("✓ Connection test passed")
            await self.disconnect()
            return True
        else:
            logger.error("✗ Connection test failed")
            return False

async def run_tests(host="onlysaid-dev.com", audio_file=None, show_raw=False):
    """Run all tests with proper WebM format"""
    tester = ASRWebSocketTester(host=host)
    
    logger.info("Starting FIXED ASR WebSocket tests...")
    logger.info(f"Target: ws://{host}/asr")
    logger.info(f"Show raw responses: {show_raw}")
    logger.info("📝 Configuration notes:")
    logger.info("  - Server expects WebM format audio (not raw PCM)")
    logger.info("  - Converting generated audio to WebM using FFmpeg")
    logger.info("  - Sending in chunks appropriate for WebM data")
    
    tests = [
        ("Connection Test", tester.test_connection()),
        ("WebM Audio Test", tester.test_with_webm_audio(audio_file, show_raw)),
    ]
    
    results = []
    for test_name, test_coro in tests:
        logger.info(f"\n{'='*60}")
        logger.info(f"--- {test_name} ---")
        logger.info(f"{'='*60}")
        try:
            result = await test_coro
            results.append((test_name, result))
        except Exception as e:
            logger.error(f"{test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    logger.info(f"\n{'='*60}")
    logger.info("--- FINAL TEST SUMMARY ---")
    logger.info(f"{'='*60}")
    passed = 0
    for test_name, result in results:
        status = "PASS" if result else "FAIL"
        logger.info(f"{test_name}: {status}")
        if result:
            passed += 1
    
    logger.info(f"Tests passed: {passed}/{len(results)}")
    return passed == len(results)

def main():
    parser = argparse.ArgumentParser(description="Test ASR WebSocket endpoint with proper WebM format")
    parser.add_argument("--host", default="onlysaid-dev.com", help="WebSocket host (default: onlysaid-dev.com)")
    parser.add_argument("--audio-file", help="Path to audio file for testing (will be converted to WebM)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging")
    parser.add_argument("--show-raw", action="store_true", help="Show raw response data")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Check for FFmpeg
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        logger.error("FFmpeg is required for WebM conversion. Please install FFmpeg.")
        exit(1)
    
    try:
        success = asyncio.run(run_tests(
            host=args.host,
            audio_file=args.audio_file,
            show_raw=args.show_raw
        ))
        exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("Tests interrupted by user")
        exit(1)
    except Exception as e:
        logger.error(f"Tests failed with error: {e}")
        exit(1)

if __name__ == "__main__":
    main() 