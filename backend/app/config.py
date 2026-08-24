import json

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central config, all overridable via environment variables / .env.
    Nothing here has a production-usable default for secrets — they must be
    set explicitly (see .env.example), so a misconfigured deploy fails
    loudly instead of silently running with a placeholder JWT secret."""

    # extra="ignore": this .env file also carries plain AWS_* keys (for
    # boto3's own credential chain, loaded separately via load_dotenv() in
    # main.py) that aren't BOOK_EDITOR_-prefixed and aren't declared fields
    # here — without this, pydantic's default extra="forbid" throws on them.
    model_config = SettingsConfigDict(env_file=".env", env_prefix="BOOK_EDITOR_", extra="ignore")

    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30

    # "s3" (production) or "local" (development without AWS credentials).
    storage_backend: str = "s3"
    local_storage_dir: str | None = None

    aws_region: str = "us-east-1"
    s3_bucket: str = "mldatabase"
    s3_prefix: str = "AutomatedHtmlFlow"

    max_upload_bytes: int = 25 * 1024 * 1024  # 25MB — base64 images/fonts inline per plan

    cors_origins_raw: str = '["http://localhost:5173"]'

    @property
    def cors_origins(self) -> list[str]:
        return json.loads(self.cors_origins_raw)


settings = Settings()
