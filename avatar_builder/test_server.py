#!/usr/bin/env python3
"""
Simple test script to verify the TTS server works
"""

import asyncio
import sys
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

async def test_tts_manager():
    """Test the TTS manager without starting the full server"""
    try:
        from src.tts_manager import TTSManager
        from src.utils import load_config
        
        print("Testing TTS Manager...")
        
        # Load configuration
        config_path = "config/models.json"
        if not os.path.exists(config_path):
            print(f"Configuration file not found: {config_path}")
            return False
        
        # Initialize TTS manager
        manager = TTSManager(config_path)
        
        # Test basic functionality without actual TTS models
        print("✓ TTS Manager created successfully")
        
        # Test configuration loading
        config = load_config(config_path)
        if config:
            print("✓ Configuration loaded successfully")
            print(f"  - Languages: {len(config.get('languages', {}))}")
            print(f"  - Default models: {len(config.get('default_models', {}))}")
        else:
            print("✗ Failed to load configuration")
            return False
        
        # Test utilities
        from src.utils import split_text_into_sentences, normalize_text
        
        test_text = "Hello world! This is a test. How are you doing today?"
        sentences = split_text_into_sentences(test_text)
        print(f"✓ Text splitting works: {len(sentences)} sentences")
        
        normalized = normalize_text("Hello,   world!  This is a test.")
        print(f"✓ Text normalization works: '{normalized}'")
        
        return True
        
    except Exception as e:
        print(f"✗ Error testing TTS Manager: {e}")
        return False

async def test_fastapi_imports():
    """Test that FastAPI and dependencies can be imported"""
    try:
        import fastapi
        import uvicorn
        import pydantic
        import numpy as np
        print("✓ FastAPI dependencies imported successfully")
        
        # Test our models
        from src.models import TTSRequest, TTSResponse
        print("✓ TTS models imported successfully")
        
        # Test basic model creation
        request = TTSRequest(text="Hello world", language="en")
        print(f"✓ TTSRequest created: {request.text}")
        
        return True
        
    except Exception as e:
        print(f"✗ Error importing FastAPI dependencies: {e}")
        return False

async def test_server_creation():
    """Test that the server can be created (without starting)"""
    try:
        # Import the app
        from src.main import app
        print("✓ FastAPI app created successfully")
        
        # Test that routes are registered
        routes = [route.path for route in app.routes]
        expected_routes = ["/", "/health", "/api/voice-clone/upload/stream", "/api/voice-clone/filepath/stream"]
        
        for route in expected_routes:
            if route in routes:
                print(f"✓ Route {route} registered")
            else:
                print(f"✗ Route {route} missing")
                return False
        
        return True
        
    except Exception as e:
        print(f"✗ Error creating server: {e}")
        return False

async def main():
    """Run all tests"""
    print("=== Streaming TTS API Test Suite ===\n")
    
    tests = [
        ("FastAPI Dependencies", test_fastapi_imports),
        ("TTS Manager", test_tts_manager),
        ("Server Creation", test_server_creation),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"Running {test_name} test...")
        try:
            result = await test_func()
            if result:
                passed += 1
                print(f"✓ {test_name} test passed\n")
            else:
                print(f"✗ {test_name} test failed\n")
        except Exception as e:
            print(f"✗ {test_name} test error: {e}\n")
    
    print(f"=== Test Results: {passed}/{total} tests passed ===")
    
    if passed == total:
        print("\n🎉 All tests passed! The server should work correctly.")
        print("\nTo start the server, run:")
        print("  python start_server.py")
        print("\nTo test with a client, run:")
        print("  uv run python examples/client_example.py")
    else:
        print(f"\n❌ {total - passed} tests failed. Please check the errors above.")
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code) 