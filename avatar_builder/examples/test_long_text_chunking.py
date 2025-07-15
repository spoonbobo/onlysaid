#!/usr/bin/env python3
"""
Test script for long text chunking with WebSocket voice cloning
"""

import asyncio
import argparse
from websocket_client_example import WebSocketVoiceCloningClient, split_text_into_chunks


# Sample long texts for testing
SAMPLE_TEXTS = {
    "ai_article": """
    Artificial intelligence has revolutionized the way we interact with technology. From virtual assistants to autonomous vehicles, AI is transforming industries across the globe. Machine learning algorithms can now process vast amounts of data in real-time, enabling businesses to make informed decisions faster than ever before. Natural language processing has made it possible for computers to understand and generate human language, opening up new possibilities for communication and automation. Computer vision systems can now recognize objects, faces, and even emotions with remarkable accuracy. The future of AI holds even more promise, with developments in quantum computing, neural networks, and robotics pushing the boundaries of what's possible. As we continue to advance in this field, we must also consider the ethical implications and ensure that AI is developed and deployed responsibly for the benefit of all humanity.
    """,
    
    "story": """
    Once upon a time, in a small village nestled between rolling hills and whispering forests, there lived a young inventor named Maya. She spent her days tinkering with gears and springs, dreaming of creating something that would change the world. One morning, as golden sunlight streamed through her workshop window, Maya discovered an ancient blueprint hidden beneath a loose floorboard. The diagram showed a peculiar device with intricate mechanisms she had never seen before. Intrigued by the mystery, she began to study the blueprint carefully, noting every detail and measurement. As days turned into weeks, Maya worked tirelessly to understand the device's purpose. She gathered materials from around the village, asking the blacksmith for special metals and the glassblower for unique components. The villagers watched with curiosity as Maya's workshop filled with strange contraptions and glowing experiments. Finally, after months of dedication and countless failed attempts, Maya succeeded in building the device. When she activated it for the first time, the machine hummed to life, creating beautiful melodies that seemed to heal the hearts of all who heard them.
    """,
    
    "technical": """
    The implementation of distributed systems requires careful consideration of multiple architectural patterns and design principles. Microservices architecture has emerged as a popular approach for building scalable and maintainable applications. Each service in a microservices architecture operates independently, communicating through well-defined APIs and protocols. This separation of concerns allows teams to develop, deploy, and scale services independently, reducing the overall complexity of the system. However, distributed systems also introduce new challenges such as network latency, partial failures, and data consistency issues. To address these challenges, developers must implement robust error handling, circuit breakers, and retry mechanisms. Service discovery and load balancing become critical components in ensuring that requests are properly routed to healthy service instances. Monitoring and observability tools are essential for tracking the performance and health of distributed systems. Container orchestration platforms like Kubernetes provide powerful abstractions for managing containerized applications at scale. The adoption of cloud-native technologies has further accelerated the development of distributed systems, offering managed services and infrastructure that reduce operational overhead.
    """
}


async def test_sample_text(client, text_key: str, reference_audio: str, language: str = "en", chunk_size: int = 200):
    """Test with a specific sample text"""
    
    if text_key not in SAMPLE_TEXTS:
        print(f"Unknown text key: {text_key}")
        return False
    
    text = SAMPLE_TEXTS[text_key].strip()
    chunks = split_text_into_chunks(text, chunk_size)
    
    print(f"\n=== Testing with '{text_key}' ===")
    print(f"Total text length: {len(text)} characters")
    print(f"Number of chunks: {len(chunks)}")
    print(f"Chunk size limit: {chunk_size} characters")
    
    # Initialize session
    success = await client.initialize_session(reference_audio, language)
    if not success:
        return False
    
    # Process chunks
    for i, chunk in enumerate(chunks):
        is_final = (i == len(chunks) - 1)
        
        print(f"\nChunk {i+1}/{len(chunks)} ({len(chunk)} chars): {chunk[:60]}...")
        
        await client.send_text_chunk(
            text=chunk,
            language=language,
            is_final=is_final
        )
        
        result = await client.receive_audio_chunk(f"output_{text_key}")
        if result is None:
            print("Error receiving audio chunk")
            return False
        
        if result.get("type") == "session_complete":
            print(f"✓ Successfully processed all chunks for '{text_key}'")
            return True
    
    return True


async def main():
    """Main function for testing long text chunking"""
    parser = argparse.ArgumentParser(description="Test Long Text Chunking with WebSocket Voice Cloning")
    parser.add_argument("--url", default="ws://localhost:8000/ws/voice-clone", help="WebSocket URL")
    parser.add_argument("--reference-audio", required=True, help="Reference audio file path")
    parser.add_argument("--language", default="en", help="Language code")
    parser.add_argument("--chunk-size", type=int, default=200, help="Maximum text chunk size")
    parser.add_argument("--test-text", choices=list(SAMPLE_TEXTS.keys()) + ["all"], default="all", help="Which text to test")
    
    args = parser.parse_args()
    
    client = WebSocketVoiceCloningClient(args.url)
    
    try:
        await client.connect()
        
        if args.test_text == "all":
            # Test all sample texts
            for text_key in SAMPLE_TEXTS.keys():
                success = await test_sample_text(
                    client, text_key, args.reference_audio, 
                    args.language, args.chunk_size
                )
                if not success:
                    print(f"Failed to process '{text_key}'")
                    break
                
                # Small delay between tests
                await asyncio.sleep(1)
        else:
            # Test specific text
            await test_sample_text(
                client, args.test_text, args.reference_audio,
                args.language, args.chunk_size
            )
        
        print("\n=== All tests completed ===")
    
    except Exception as e:
        print(f"Error: {e}")
    
    finally:
        await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())