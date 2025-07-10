#!/usr/bin/env python3
"""
Sample script to test LightRAG streaming query endpoint
"""

import requests
import json
import sys
from typing import Dict, Any, List, Optional

def query_lightrag_stream(
    query: str,
    base_url: str = "http://lightrag.onlysaid-dev.com",
    mode: str = "hybrid",
    only_need_context: bool = False,
    only_need_prompt: bool = False,
    response_type: str = "string",
    top_k: int = 10,
    max_token_for_text_unit: int = 4000,
    max_token_for_global_context: int = 4000,
    max_token_for_local_context: int = 4000,
    conversation_history: Optional[List[Dict[str, Any]]] = None,
    history_turns: int = 3,
    ids: Optional[List[str]] = None,
    user_prompt: Optional[str] = None
) -> None:
    """
    Query LightRAG streaming endpoint
    
    Args:
        query: The question to ask
        base_url: LightRAG server URL
        mode: Query mode ('naive', 'local', 'global', 'hybrid')
        only_need_context: Return only context without LLM response
        only_need_prompt: Return only the prompt without LLM response
        response_type: Response format ('string' or 'stream')
        top_k: Number of top results to retrieve
        max_token_for_text_unit: Max tokens for text units
        max_token_for_global_context: Max tokens for global context
        max_token_for_local_context: Max tokens for local context
        conversation_history: Previous conversation turns
        history_turns: Number of history turns to consider
        ids: Specific document IDs to query
        user_prompt: Custom user prompt template
    """
    
    url = f"{base_url}/query/stream"
    
    payload = {
        "query": query,
        "mode": mode,
        "only_need_context": only_need_context,
        "only_need_prompt": only_need_prompt,
        "response_type": response_type,
        "top_k": top_k,
        "max_token_for_text_unit": max_token_for_text_unit,
        "max_token_for_global_context": max_token_for_global_context,
        "max_token_for_local_context": max_token_for_local_context,
        "conversation_history": conversation_history or [],
        "history_turns": history_turns,
        "ids": ids or [],
        "user_prompt": user_prompt or ""
    }
    
    headers = {
        'accept': 'application/json',
        'Content-Type': 'application/json'
    }
    
    print(f"🔍 Querying LightRAG: {query}")
    print(f"🌐 URL: {url}")
    print(f"⚙️  Mode: {mode}")
    print("=" * 50)
    
    try:
        response = requests.post(url, headers=headers, json=payload, stream=True)
        response.raise_for_status()
        
        print("📡 Streaming response:")
        print("-" * 30)
        
        # Handle streaming response
        for line in response.iter_lines():
            if line:
                try:
                    # Try to decode as JSON for structured data
                    data = json.loads(line.decode('utf-8'))
                    print(json.dumps(data, indent=2, ensure_ascii=False))
                except json.JSONDecodeError:
                    # If not JSON, print as plain text
                    text = line.decode('utf-8')
                    if text.strip():
                        print(text)
                        
    except requests.exceptions.RequestException as e:
        print(f"❌ Error querying LightRAG: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Status: {e.response.status_code}")
            print(f"Response: {e.response.text}")
    except KeyboardInterrupt:
        print("\n🛑 Query interrupted by user")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

def query_lightrag_simple(query: str, mode: str = "hybrid") -> None:
    """Simple query wrapper with common defaults"""
    query_lightrag_stream(
        query=query,
        mode=mode,
        top_k=5,
        max_token_for_text_unit=1000,
        max_token_for_global_context=2000,
        max_token_for_local_context=1000
    )

def main():
    """Main function with example queries"""
    
    # Example queries
    sample_queries = [
        {
            "description": "Simple factual question",
            "query": "What is machine learning?",
            "mode": "hybrid"
        },
        {
            "description": "Context-only query (no LLM response)",
            "query": "Explain neural networks",
            "mode": "local",
            "only_need_context": True
        },
        {
            "description": "Global knowledge query",
            "query": "What are the main AI research trends?",
            "mode": "global"
        },
        {
            "description": "Local specific query",
            "query": "How does backpropagation work?",
            "mode": "local"
        }
    ]
    
    if len(sys.argv) > 1:
        # Use command line argument as query
        user_query = " ".join(sys.argv[1:])
        print(f"🎯 Custom query: {user_query}")
        query_lightrag_simple(user_query)
    else:
        # Run sample queries
        print("🚀 Running sample queries...")
        print("=" * 60)
        
        for i, example in enumerate(sample_queries, 1):
            print(f"\n📝 Example {i}: {example['description']}")
            
            kwargs = {
                "query": example["query"],
                "mode": example["mode"]
            }
            
            # Add optional parameters if specified
            if "only_need_context" in example:
                kwargs["only_need_context"] = example["only_need_context"]
                
            query_lightrag_stream(**kwargs)
            
            if i < len(sample_queries):
                input("\n⏸️  Press Enter to continue to next example...")

if __name__ == "__main__":
    main()
