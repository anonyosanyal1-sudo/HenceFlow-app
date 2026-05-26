import os
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL: str = os.getenv("VITE_SUPABASE_URL", "")
_security = HTTPBearer()
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        if not SUPABASE_URL:
            raise HTTPException(status_code=500, detail="VITE_SUPABASE_URL not configured")
        jwks_url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url)
    return _jwks_client


def _decode(token: str) -> dict:
    try:
        client = _get_jwks_client()
        signing_key = client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience="authenticated",
        )
    except HTTPException:
        raise
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
