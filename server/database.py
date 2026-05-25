import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL: str = os.getenv("VITE_SUPABASE_URL", "")
# Service role key — never sent to browsers, used server-side only
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    import warnings
    warnings.warn(
        "VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. "
        "Add them to your .env file."
    )

# Single service-role client shared across all requests.
# This bypasses RLS — access control is enforced in each router instead.
db: Client = create_client(
    SUPABASE_URL or "https://placeholder.supabase.co",
    SUPABASE_SERVICE_KEY or "placeholder",
)
