#!/usr/bin/env python3
"""
Client example for testing the voice cloning streaming TTS API
"""

import asyncio
import aiohttp
import json
import base64
from pathlib import Path
import argparse


class VoiceCloningClient:
    """Client for interacting with the Voice Cloning TTS API"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def health_check(self):
        """Check if the TTS service is healthy"""
        async with self.session.get(f"{self.base_url}/health") as response:
            return await response.json()
    
    async def stream_voice_clone_upload(self, text: str, reference_audio: str, 
                                      language: str = "en", output_dir: str = "voice_clone_chunks"):
        """Stream voice cloning with uploaded audio file"""
        if not Path(reference_audio).exists():
            print(f"Reference audio file not found: {reference_audio}")
            return False
        
        # Prepare form data
        data = aiohttp.FormData()
        data.add_field('text', text)
        data.add_field('language', language)
        
        with open(reference_audio, 'rb') as f:
            data.add_field('audio_file', f, filename=Path(reference_audio).name)
        
        # Create output directory
        Path(output_dir).mkdir(exist_ok=True)
        
        async with self.session.post(f"{self.base_url}/api/voice-clone/upload/stream", data=data) as response:
            if response.status == 200:
                chunk_count = 0
                async for line in response.content:
                    line = line.decode('utf-8').strip()
                    if line.startswith("data: "):
                        data_str = line[6:]  # Remove "data: " prefix
                        if data_str == "[DONE]":
                            print("Voice cloning streaming completed")
                            break
                        
                        try:
                            chunk_data = json.loads(data_str)
                            if "error" in chunk_data:
                                print(f"Error: {chunk_data['error']}")
                                break
                            
                            # Decode base64 audio data and save chunk
                            audio_data_b64 = chunk_data.get("audio_data")
                            if audio_data_b64:
                                audio_data = base64.b64decode(audio_data_b64)
                                chunk_file = Path(output_dir) / f"voice_clone_chunk_{chunk_count:03d}.wav"
                                with open(chunk_file, "wb") as f:
                                    f.write(audio_data)
                                print(f"Saved chunk {chunk_count}: {chunk_data.get('text', '')[:50]}...")
                                chunk_count += 1
                        
                        except json.JSONDecodeError:
                            continue
                
                return True
            else:
                error = await response.json()
                print(f"Error: {error}")
                return False
    
    async def stream_voice_clone_filepath(self, text: str, audio_file_path: str, 
                                        language: str = "en", output_dir: str = "voice_clone_chunks"):
        """Stream voice cloning with audio file path"""
        # Prepare form data
        data = aiohttp.FormData()
        data.add_field('text', text)
        data.add_field('audio_file_path', audio_file_path)
        data.add_field('language', language)
        
        # Create output directory
        Path(output_dir).mkdir(exist_ok=True)
        
        async with self.session.post(f"{self.base_url}/api/voice-clone/filepath/stream", data=data) as response:
            if response.status == 200:
                chunk_count = 0
                async for line in response.content:
                    line = line.decode('utf-8').strip()
                    if line.startswith("data: "):
                        data_str = line[6:]  # Remove "data: " prefix
                        if data_str == "[DONE]":
                            print("Voice cloning streaming completed")
                            break
                        
                        try:
                            chunk_data = json.loads(data_str)
                            if "error" in chunk_data:
                                print(f"Error: {chunk_data['error']}")
                                break
                            
                            # Decode base64 audio data and save chunk
                            audio_data_b64 = chunk_data.get("audio_data")
                            if audio_data_b64:
                                audio_data = base64.b64decode(audio_data_b64)
                                chunk_file = Path(output_dir) / f"voice_clone_chunk_{chunk_count:03d}.wav"
                                with open(chunk_file, "wb") as f:
                                    f.write(audio_data)
                                print(f"Saved chunk {chunk_count}: {chunk_data.get('text', '')[:50]}...")
                                chunk_count += 1
                        
                        except json.JSONDecodeError:
                            continue
                
                return True
            else:
                error = await response.json()
                print(f"Error: {error}")
                return False


async def main():
    """Main function for testing the voice cloning client"""
    parser = argparse.ArgumentParser(description="Voice Cloning TTS API Client Example")
    parser.add_argument("--url", default="http://localhost:8000", help="TTS API base URL")
    parser.add_argument("--text", default="Hello, this is a test of voice cloning with streaming.", help="Text to synthesize")
    parser.add_argument("--language", default="en", help="Language code")
    parser.add_argument("--mode", choices=["upload", "filepath"], default="upload", help="Voice cloning mode")
    parser.add_argument("--reference-audio", required=True, help="Reference audio file path")
    parser.add_argument("--output-dir", default="voice_clone_output", help="Output directory for chunks")
    
    args = parser.parse_args()
    
    async with VoiceCloningClient(args.url) as client:
        try:
            # Health check
            print("Checking TTS service health...")
            health = await client.health_check()
            print(f"Health status: {health}")
            
            # Perform voice cloning
            if args.mode == "upload":
                print(f"\nStreaming voice cloning with upload: '{args.text}'")
                print(f"Reference audio: {args.reference_audio}")
                success = await client.stream_voice_clone_upload(
                    text=args.text,
                    reference_audio=args.reference_audio,
                    language=args.language,
                    output_dir=args.output_dir
                )
                if success:
                    print("Voice cloning with upload completed successfully")
            
            elif args.mode == "filepath":
                print(f"\nStreaming voice cloning with filepath: '{args.text}'")
                print(f"Reference audio path: {args.reference_audio}")
                success = await client.stream_voice_clone_filepath(
                    text=args.text,
                    audio_file_path=args.reference_audio,
                    language=args.language,
                    output_dir=args.output_dir
                )
                if success:
                    print("Voice cloning with filepath completed successfully")
        
        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(main()) 