import asyncio
import os
import sys
from typing import AsyncGenerator
import time

# Add parent directory to path to import from knowledge_base
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.append('.')

from openai import OpenAI
from dotenv import load_dotenv
from loguru import logger

from schemas.document import QueryRequest

# Load environment variables
load_dotenv()

class OpenAIStreamTester:
    """Test class for OpenAI streaming functionality"""
    
    def __init__(self):
        # Initialize OpenAI client using the same syntax as in mcp_client.py
        self.openai_client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY"),
            base_url=os.getenv("OPENAI_API_BASE_URL")
        )
        
        # Default model
        self.model = os.getenv("OPENAI_MODEL", "deepseek-chat")
        
    def sync_stream_test(self, prompt: str) -> None:
        """Test synchronous streaming with OpenAI"""
        logger.info(f"Starting synchronous stream test with model: {self.model}")
        
        start_time = time.time()
        full_response = ""
        
        # Create a streaming response
        stream = self.openai_client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            stream=True,
        )
        
        # Process the stream
        print("Streaming response:")
        for chunk in stream:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                full_response += content
                print(content, end="", flush=True)
        
        print("\n")
        elapsed = time.time() - start_time
        logger.info(f"Synchronous streaming completed in {elapsed:.2f} seconds")
        logger.info(f"Total response length: {len(full_response)} characters")
        
    async def async_stream_test(self, prompt: str) -> None:
        """Test asynchronous streaming with OpenAI"""
        logger.info(f"Starting asynchronous stream test with model: {self.model}")
        
        start_time = time.time()
        full_response = ""
        
        # Create a streaming response using the synchronous client in an async context
        stream = self.openai_client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            stream=True,
        )
        
        # Process the stream
        print("Streaming response:")
        for chunk in stream:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                full_response += content
                print(content, end="", flush=True)
                await asyncio.sleep(0.01)  # Small delay to simulate processing
        
        print("\n")
        elapsed = time.time() - start_time
        logger.info(f"Asynchronous streaming completed in {elapsed:.2f} seconds")
        logger.info(f"Total response length: {len(full_response)} characters")
    
    async def stream_generator(self, prompt: str) -> AsyncGenerator[str, None]:
        """Create an async generator for streaming responses"""
        stream = self.openai_client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            stream=True,
        )
        
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
                await asyncio.sleep(0.01)
    
    async def test_stream_with_context(self, query: QueryRequest) -> None:
        """Test streaming with a context-based query similar to KBManager"""
        # Simplified context generation
        context = "This is a test context for streaming."
        
        # Handle both string and list inputs
        query_text = query.query[-1] if isinstance(query.query, list) else query.query
        
        # Create a simple prompt
        prompt = f"""
        Please respond to the following question:
        
        Context:
        {context}
        
        User's question: {query_text}
        
        Your answer:
        """
        
        # Stream the response
        print(f"Streaming response for query: {query_text}")
        async for token in self.stream_generator(prompt):
            print(token, end="", flush=True)
            # In a real application, you would yield the token here
        
        print("\n")
    
    def test_with_tools(self, prompt: str, tools: list) -> None:
        """Test streaming with function calling/tools"""
        logger.info(f"Starting tool-based streaming test with model: {self.model}")
        
        # Create a streaming response with tools
        stream = self.openai_client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            tools=tools,
            stream=True,
        )
        
        # Process the stream
        print("Streaming response with tools:")
        full_response = ""
        for chunk in stream:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                full_response += content
                print(content, end="", flush=True)
        
        print("\n")
        logger.info(f"Tool-based streaming completed")
        logger.info(f"Total response length: {len(full_response)} characters")

async def main():
    """Main function to run the tests"""
    tester = OpenAIStreamTester()
    
    # Test prompts
    simple_prompt = "Explain quantum computing in simple terms."
    complex_prompt = "Write a short story about a robot discovering emotions."
    
    # Run synchronous test
    tester.sync_stream_test(simple_prompt)
    
    # Run asynchronous tests
    await tester.async_stream_test(complex_prompt)
    
    # Test with QueryRequest
    query = QueryRequest(
        query="How does machine learning work?",
        preferred_language="en",
        source_id="test_source",
        top_k=3,
        streaming=True,
        conversation_history=""
    )
    
    await tester.test_stream_with_context(query)
    
    # Test with tools
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "Get the current weather in a given location",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {
                            "type": "string",
                            "description": "The city and state, e.g. San Francisco, CA"
                        }
                    },
                    "required": ["location"]
                }
            }
        }
    ]
    
    tester.test_with_tools("What's the weather like in San Francisco?", tools)

if __name__ == "__main__":
    asyncio.run(main())
