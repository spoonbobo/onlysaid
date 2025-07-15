#!/usr/bin/env python3
"""
WebSocket client example for testing real-time voice cloning with text chunks
"""

import asyncio
import websockets
import json
import base64
import argparse
from pathlib import Path


class WebSocketVoiceCloningClient:
    """WebSocket client for real-time voice cloning"""
    
    def __init__(self, url: str = "ws://localhost:8000/ws/voice-clone"):
        self.url = url
        self.websocket = None
        self.session_id = None
        self.large_audio_buffer = {}  # Buffer for large audio chunks
    
    async def connect(self):
        """Connect to WebSocket server"""
        self.websocket = await websockets.connect(self.url)
        print("Connected to WebSocket server")
    
    async def disconnect(self):
        """Disconnect from WebSocket server"""
        if self.websocket:
            await self.websocket.close()
            print("Disconnected from WebSocket server")
    
    async def initialize_session(self, reference_audio_path: str, language: str = "en", 
                               model_name: str = None, speed: float = 1.0, 
                               combine_chunks: bool = True, streaming_mode: bool = True):
        """Initialize voice cloning session with reference audio"""
        if not Path(reference_audio_path).exists():
            raise FileNotFoundError(f"Reference audio file not found: {reference_audio_path}")
        
        # Read and encode reference audio
        with open(reference_audio_path, 'rb') as f:
            audio_data = f.read()
        
        reference_audio_b64 = base64.b64encode(audio_data).decode('utf-8')
        
        # Send initialization message
        init_message = {
            "type": "init",
            "reference_audio": reference_audio_b64,
            "language": language,
            "model_name": model_name,
            "speed": speed,
            "combine_chunks": combine_chunks,
            "streaming_mode": streaming_mode
        }
        
        await self.websocket.send(json.dumps(init_message))
        
        # Wait for initialization response
        response = await self.websocket.recv()
        data = json.loads(response)
        
        if data["type"] == "init_success":
            self.session_id = data["session_id"]
            config = data.get("config", {})
            print(f"Session initialized: {self.session_id}")
            print(f"Configuration: {config}")
            return True
        elif data["type"] == "error":
            print(f"Initialization error: {data['error']}")
            return False
        else:
            print(f"Unexpected response: {data}")
            return False
    
    async def send_text_chunk(self, text: str, is_final: bool = False):
        """Send text chunk for voice synthesis"""
        if not self.session_id:
            raise RuntimeError("Session not initialized")
        
        message = {
            "type": "text_chunk",
            "text": text,
            "is_final": is_final
        }
        
        await self.websocket.send(json.dumps(message))
    
    async def update_config(self, speed: float = None, combine_chunks: bool = None, streaming_mode: bool = None):
        """Update session configuration"""
        if not self.session_id:
            raise RuntimeError("Session not initialized")
        
        message = {"type": "update_config"}
        
        if speed is not None:
            message["speed"] = speed
        if combine_chunks is not None:
            message["combine_chunks"] = combine_chunks
        if streaming_mode is not None:
            message["streaming_mode"] = streaming_mode
        
        await self.websocket.send(json.dumps(message))
    
    async def receive_audio_chunk(self, output_dir: str = "websocket_output"):
        """Receive and save audio chunk"""
        Path(output_dir).mkdir(exist_ok=True)
        
        response = await self.websocket.recv()
        data = json.loads(response)
        
        if data["type"] == "audio_chunk":
            # Decode and save individual audio chunk
            audio_data = base64.b64decode(data["audio_data"])
            chunk_id = data["chunk_id"]
            text = data["text"]
            is_final = data["is_final"]
            speed = data.get("speed", 1.0)
            
            output_file = Path(output_dir) / f"chunk_{chunk_id:03d}.wav"
            with open(output_file, "wb") as f:
                f.write(audio_data)
            
            print(f"Saved chunk {chunk_id} (speed: {speed}x): {text[:50]}{'...' if len(text) > 50 else ''}")
            return data
        
        elif data["type"] == "combined_audio":
            # Decode and save combined audio (small file)
            audio_data = base64.b64decode(data["audio_data"])
            text = data["text"]
            total_chunks = data["total_chunks"]
            duration = data.get("duration", 0)
            speed = data.get("speed", 1.0)
            
            output_file = Path(output_dir) / "combined_audio.wav"
            with open(output_file, "wb") as f:
                f.write(audio_data)
            
            print(f"Saved combined audio ({total_chunks} chunks, {duration:.2f}s, speed: {speed}x): {text[:100]}{'...' if len(text) > 100 else ''}")
            return data
        
        elif data["type"] == "combined_audio_start":
            # Start receiving large audio file
            session_id = data["session_id"]
            self.large_audio_buffer[session_id] = {
                "metadata": data,
                "chunks": {},
                "total_audio_chunks": data["total_audio_chunks"]
            }
            
            print(f"Starting to receive large combined audio ({data['total_audio_chunks']} chunks, {data['total_size']} bytes)")
            return data
        
        elif data["type"] == "combined_audio_chunk":
            # Receive chunk of large audio file
            session_id = data["session_id"]
            chunk_index = data["chunk_index"]
            
            if session_id in self.large_audio_buffer:
                self.large_audio_buffer[session_id]["chunks"][chunk_index] = data["audio_data"]
                
                received_chunks = len(self.large_audio_buffer[session_id]["chunks"])
                total_chunks = data["total_chunks"]
                
                print(f"Received audio chunk {chunk_index + 1}/{total_chunks} ({received_chunks}/{total_chunks} total)")
                
                if data["is_final"]:
                    # All chunks received, reconstruct the audio
                    return await self.reconstruct_large_audio(session_id, output_dir)
            
            return data
        
        elif data["type"] == "combined_audio_complete":
            # Large audio transmission complete
            session_id = data["session_id"]
            if session_id in self.large_audio_buffer:
                return await self.reconstruct_large_audio(session_id, output_dir)
            return data
        
        elif data["type"] == "config_updated":
            config = data.get("config", {})
            print(f"Configuration updated: {config}")
            return data
        
        elif data["type"] == "error":
            print(f"Error: {data['error']}")
            return None
        
        elif data["type"] == "session_complete":
            print("Session completed")
            return {"type": "session_complete"}
        
        else:
            print(f"Unexpected response: {data}")
            return None
    
    async def reconstruct_large_audio(self, session_id: str, output_dir: str):
        """Reconstruct large audio file from chunks"""
        try:
            buffer_data = self.large_audio_buffer[session_id]
            metadata = buffer_data["metadata"]
            chunks = buffer_data["chunks"]
            total_chunks = buffer_data["total_audio_chunks"]
            
            # Check if all chunks are received
            if len(chunks) != total_chunks:
                print(f"Warning: Expected {total_chunks} chunks, got {len(chunks)}")
            
            # Reconstruct audio data
            audio_b64_parts = []
            for i in range(total_chunks):
                if i in chunks:
                    audio_b64_parts.append(chunks[i])
                else:
                    print(f"Warning: Missing chunk {i}")
            
            # Combine all parts
            combined_audio_b64 = "".join(audio_b64_parts)
            audio_data = base64.b64decode(combined_audio_b64)
            
            # Save to file
            output_file = Path(output_dir) / "combined_audio.wav"
            with open(output_file, "wb") as f:
                f.write(audio_data)
            
            # Clean up buffer
            del self.large_audio_buffer[session_id]
            
            # Print info
            text = metadata["text"]
            total_chunks = metadata["total_chunks"]
            duration = metadata.get("duration", 0)
            speed = metadata.get("speed", 1.0)
            
            print(f"Reconstructed and saved combined audio ({total_chunks} chunks, {duration:.2f}s, speed: {speed}x)")
            print(f"Text: {text[:100]}{'...' if len(text) > 100 else ''}")
            
            return {
                "type": "combined_audio",
                "reconstructed": True,
                "metadata": metadata
            }
        
        except Exception as e:
            print(f"Error reconstructing large audio: {e}")
            return None
    
    async def ping(self):
        """Send ping to server"""
        await self.websocket.send(json.dumps({"type": "ping"}))
        response = await self.websocket.recv()
        data = json.loads(response)
        return data["type"] == "pong"


def split_text_into_chunks(text: str, max_chunk_size: int = 200):
    """Split text into chunks for processing"""
    sentences = text.split('. ')
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        if len(current_chunk) + len(sentence) + 2 <= max_chunk_size:
            current_chunk += sentence + ". "
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence + ". "
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks


async def test_speed_control():
    """Test different speed settings"""
    speeds = [0.5, 1.0, 1.5, 2.0]
    test_text = "This is a test of speed control in voice cloning."
    
    return speeds, test_text


async def test_long_text_chunking():
    """Test with a longer text split into chunks"""
    
    # Sample long text for testing
    long_text = """
    Artificial intelligence has revolutionized the way we interact with technology. 
    From virtual assistants to autonomous vehicles, AI is transforming industries across the globe. 
    Machine learning algorithms can now process vast amounts of data in real-time, 
    enabling businesses to make informed decisions faster than ever before. 
    Natural language processing has made it possible for computers to understand and generate human language, 
    opening up new possibilities for communication and automation. 
    Computer vision systems can now recognize objects, faces, and even emotions with remarkable accuracy. 
    The future of AI holds even more promise, with developments in quantum computing, 
    neural networks, and robotics pushing the boundaries of what's possible. 
    As we continue to advance in this field, we must also consider the ethical implications 
    and ensure that AI is developed and deployed responsibly for the benefit of all humanity.
    """
    
    return long_text.strip()


async def main():
    """Main function for testing WebSocket voice cloning"""
    parser = argparse.ArgumentParser(description="WebSocket Voice Cloning Client Example")
    parser.add_argument("--url", default="ws://localhost:8000/ws/voice-clone", help="WebSocket URL")
    parser.add_argument("--reference-audio", required=True, help="Reference audio file path")
    parser.add_argument("--language", default="en", help="Language code")
    parser.add_argument("--model-name", help="Specific model name")
    parser.add_argument("--output-dir", default="websocket_output", help="Output directory for audio chunks")
    parser.add_argument("--chunk-size", type=int, default=200, help="Maximum text chunk size")
    parser.add_argument("--speed", type=float, default=1.0, help="Speech speed (0.1-3.0)")
    parser.add_argument("--combine-chunks", action="store_true", help="Combine chunks into final audio")
    parser.add_argument("--streaming-mode", action="store_true", default=True, help="Enable streaming mode")
    parser.add_argument("--test-mode", choices=["long", "interactive", "speed"], default="long", help="Test mode")
    
    args = parser.parse_args()
    
    client = WebSocketVoiceCloningClient(args.url)
    
    try:
        # Connect to server
        await client.connect()
        
        if args.test_mode == "speed":
            # Test different speeds
            speeds, test_text = await test_speed_control()
            
            for speed in speeds:
                print(f"\n=== Testing speed: {speed}x ===")
                
                # Initialize session with specific speed
                success = await client.initialize_session(
                    reference_audio_path=args.reference_audio,
                    language=args.language,
                    model_name=args.model_name,
                    speed=speed,
                    combine_chunks=args.combine_chunks,
                    streaming_mode=args.streaming_mode
                )
                
                if not success:
                    print(f"Failed to initialize session for speed {speed}")
                    continue
                
                # Send text and receive audio
                await client.send_text_chunk(test_text, is_final=True)
                
                # Receive audio chunks
                while True:
                    result = await client.receive_audio_chunk(f"{args.output_dir}_speed_{speed}")
                    if result is None:
                        break
                    if result.get("type") == "session_complete":
                        break
                
                # Small delay between tests
                await asyncio.sleep(1)
        
        elif args.test_mode == "long":
            # Initialize session
            success = await client.initialize_session(
                reference_audio_path=args.reference_audio,
                language=args.language,
                model_name=args.model_name,
                speed=args.speed,
                combine_chunks=args.combine_chunks,
                streaming_mode=args.streaming_mode
            )
            
            if not success:
                print("Failed to initialize session")
                return
            
            # Test with long text
            long_text = await test_long_text_chunking()
            text_chunks = split_text_into_chunks(long_text, args.chunk_size)
            
            print(f"\nProcessing {len(text_chunks)} text chunks...")
            
            # Send text chunks and receive audio
            for i, chunk in enumerate(text_chunks):
                is_final = (i == len(text_chunks) - 1)
                
                print(f"\nSending chunk {i+1}/{len(text_chunks)}: {chunk[:50]}...")
                await client.send_text_chunk(text=chunk, is_final=is_final)
                
                # Receive corresponding audio chunk
                if args.streaming_mode:
                    result = await client.receive_audio_chunk(args.output_dir)
                    if result is None:
                        print("Error receiving audio chunk")
                        break
            
            # If not in streaming mode or combine_chunks is enabled, wait for final results
            if not args.streaming_mode or args.combine_chunks:
                while True:
                    result = await client.receive_audio_chunk(args.output_dir)
                    if result is None:
                        break
                    if result.get("type") == "session_complete":
                        print("All chunks processed successfully!")
                        break
        
        elif args.test_mode == "interactive":
            # Initialize session
            success = await client.initialize_session(
                reference_audio_path=args.reference_audio,
                language=args.language,
                model_name=args.model_name,
                speed=args.speed,
                combine_chunks=args.combine_chunks,
                streaming_mode=args.streaming_mode
            )
            
            if not success:
                print("Failed to initialize session")
                return
            
            # Interactive mode
            print("\nInteractive mode - Enter text chunks (empty line to finish):")
            print("Commands: 'speed <value>' to change speed, 'config' to update settings")
            
            chunk_count = 0
            while True:
                text = input(f"Chunk {chunk_count + 1}: ").strip()
                
                if not text:
                    # Send final empty chunk to complete session
                    await client.send_text_chunk("", is_final=True)
                    break
                
                # Handle commands
                if text.startswith("speed "):
                    try:
                        new_speed = float(text.split()[1])
                        await client.update_config(speed=new_speed)
                        result = await client.receive_audio_chunk(args.output_dir)
                        continue
                    except (ValueError, IndexError):
                        print("Invalid speed command. Use: speed <value>")
                        continue
                
                await client.send_text_chunk(text=text, is_final=False)
                
                if args.streaming_mode:
                    result = await client.receive_audio_chunk(args.output_dir)
                    if result is None:
                        print("Error receiving audio chunk")
                        break
                
                chunk_count += 1
            
            # Wait for final results
            while True:
                result = await client.receive_audio_chunk(args.output_dir)
                if result is None:
                    break
                if result.get("type") == "session_complete":
                    print("Interactive session completed!")
                    break
    
    except Exception as e:
        print(f"Error: {e}")
    
    finally:
        await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main()) 