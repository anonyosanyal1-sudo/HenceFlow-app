import os
import jwt
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")
_security = HTTPBearer()


def _decode(token: str) -> dict:
    if not JWT_SECRET:
        raise HTTPException(status_code=500, detail="JWT secret not configured")
    try:
        return jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(_security),
) -> dict:
    """FastAPI dependency — extracts and verifies the Bearer JWT."""
    payload = _decode(credentials.credentials)
    return {"id": payload["sub"], "email": payload.get("email", "")}


def verify_token_param(token: str) -> dict:
    """Used by the SSE endpoint where the token arrives as a query parameter."""
    payload = _decode(token)
    return {"id": payload["sub"], "email": payload.get("email", "")}
