import os
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL: str = os.getenv("VITE_SUPABASE_URL", "")
JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")
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


def _verify_via_supabase_api(token: str) -> dict:
    """Validate the token by calling Supabase auth. Used when no local secret is available."""
    from server.database import db
    try:
        response = db.auth.get_user(token)
        user = response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return {"id": str(user.id), "email": user.email or ""}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {exc}")


def _decode(token: str) -> dict:
    try:
        alg = jwt.get_unverified_header(token).get("alg", "HS256")
    except jwt.DecodeError:
        raise HTTPException(status_code=401, detail="Malformed token")

    try:
        if alg == "RS256":
            # Newer Supabase projects — verify locally via JWKS
            client = _get_jwks_client()
            signing_key = client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience="authenticated",
            )
            return {"id": payload["sub"], "email": payload.get("email", "")}

        if JWT_SECRET:
            # Older Supabase projects with HS256 secret in .env
            payload = jwt.decode(
                token,
                JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
            return {"id": payload["sub"], "email": payload.get("email", "")}

        # HS256 but no local secret — ask Supabase to validate for us
        return _verify_via_supabase_api(token)

    except HTTPException:
        raise
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Auth error: {exc}")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(_security),
) -> dict:
    """FastAPI dependency — extracts and verifies the Bearer JWT."""
    return _decode(credentials.credentials)


def verify_token_param(token: str) -> dict:
    """Used by the SSE endpoint where the token arrives as a query parameter."""
    return _decode(token)
