"""
Startup script for the N-Services backend.
Sets PYTHONPATH so the correct app module is loaded even when
uvicorn spawns child processes for auto-reload.
"""
import sys
import os
from dotenv import load_dotenv

# Force this directory FIRST in the PYTHONPATH env var
# This is inherited by uvicorn's reload child processes
backend_dir = os.path.dirname(os.path.abspath(__file__))
os.environ["PYTHONPATH"] = backend_dir + os.pathsep + os.environ.get("PYTHONPATH", "")
sys.path.insert(0, backend_dir)

# Load .env from backend/ or parent workspace directory
env_path = os.path.join(backend_dir, ".env")
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(backend_dir), ".env")
load_dotenv(env_path)

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True, reload_dirs=[backend_dir])
