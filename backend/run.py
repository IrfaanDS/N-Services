"""
Startup script for the LeadFlow SEO backend.
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

# Load .env so SMTP/IMAP credentials are available via os.environ
load_dotenv(os.path.join(backend_dir, ".env"))

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True, reload_dirs=[backend_dir])
