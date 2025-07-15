#!/usr/bin/env python3
"""
Simple startup script for the TTS server
"""

import os
import sys
import asyncio
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

def main():
    """Main function to start the server"""
    try:
        # Set environment variables if not set
        if not os.getenv("TTS_MODELS_CONFIG_PATH"):
            os.environ["TTS_MODELS_CONFIG_PATH"] = "config/models.json"
        
        # Import and run the server
        import uvicorn
        
        # Run the server
        uvicorn.run(
            "src.main:app",
            host="0.0.0.0",
            port=8000,
            reload=False,
            access_log=True,
            log_level="info"
        )
        
    except ImportError as e:
        print(f"Import error: {e}")
        print("Please make sure all dependencies are installed:")
        print("uv sync")
        sys.exit(1)
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 