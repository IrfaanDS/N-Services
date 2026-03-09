"""
Auth Routes
─────────────
Custom JWT authentication using the existing users table
which stores password_hash. NOT using Supabase Auth.
"""
from fastapi import APIRouter

router = APIRouter()


@router.post("/login")
async def login(email: str = "", password: str = ""):
    """
    Authenticate user against the users table.
    Verify password_hash → return JWT access token.
    """
    # TODO: Query users table → verify bcrypt hash → issue JWT
    return {
        "access_token": None,
        "token_type": "bearer",
        "message": "Login endpoint — placeholder",
    }


@router.post("/register")
async def register(email: str = "", password: str = ""):
    """
    Create a new user in the users table.
    Hash password with bcrypt → insert into users → return JWT.
    """
    # TODO: Check uniqueness → bcrypt hash → insert → JWT
    return {
        "access_token": None,
        "user_id": None,
        "message": "Register endpoint — placeholder",
    }
