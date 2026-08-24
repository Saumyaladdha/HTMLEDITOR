from dotenv import load_dotenv

# Must run before anything below is imported: app.routers -> app.services.s3_service
# creates its boto3 client at MODULE IMPORT TIME, so AWS_* creds have to already
# be in os.environ by then. python-dotenv's bare load_dotenv() walks up from this
# file looking for the nearest .env — that's backend/.env, which is where the
# current temporary AWS_ACCESS_KEY_ID/SECRET/SESSION_TOKEN actually live (the
# long-term base credentials used to mint them live one level up, in the repo
# root .env, and are never read by the app itself).
load_dotenv()

import logging

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import Depends, FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.db.session import Base, engine, get_db
from app.routers import auth, books, export, versions
from app.services import storage

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
)
logger = logging.getLogger("book_editor")

# MVP-pragmatic: create tables directly from the SQLAlchemy models on
# startup instead of running Alembic migrations. Fine for local development
# against the Docker Postgres; switch to real Alembic migrations before
# this ever points at a production RDS instance with data worth preserving.
import app.models  # noqa: F401  (import registers all models on Base.metadata)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sundar Notes Editor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(BotoCoreError)
@app.exception_handler(ClientError)
def storage_error_handler(request, exc):
    """Turns an S3 failure into an explicable error instead of a bare 500.

    Expired AWS session tokens are the single most common failure this app
    hits — the credentials in backend/.env are short-lived and have to be
    re-minted via MFA. Every save, load and export then fails with
    `Internal Server Error` and nothing else, which tells a teacher nothing
    and tells an operator nothing either. Naming the cause turns a confusing
    outage into a one-line fix.
    """
    code = ""
    if isinstance(exc, ClientError):
        code = exc.response.get("Error", {}).get("Code", "")
    logger.error("storage error on %s %s: %s", request.method, request.url.path, exc)

    if code in {"ExpiredToken", "InvalidToken", "TokenRefreshRequired"}:
        detail = (
            "The server's storage credentials have expired. "
            "Your work has NOT been saved — please contact whoever administers this server."
        )
    elif code in {"AccessDenied", "InvalidAccessKeyId", "SignatureDoesNotMatch"}:
        detail = "The server is not authorised to access document storage. Your work has NOT been saved."
    else:
        detail = "Document storage is unavailable right now. Your work has NOT been saved — please try again."

    return JSONResponse(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content={"detail": detail})


app.include_router(auth.router)
app.include_router(books.router)
app.include_router(versions.router)
app.include_router(export.router)


@app.get("/health")
def health(db: Session = Depends(get_db)):
    """Actually exercises both backing services rather than just proving the
    process is running. The previous version returned `{"status": "ok"}`
    unconditionally — including with a dead database, and including with the
    expired AWS session token that makes every single save, load and export
    fail. A health check that stays green through a total outage is worse
    than none, because it's actively misleading during an incident.

    Degraded (not down) is reported as 200 with per-dependency detail: the
    API process is up and serving, and the caller decides what to do about a
    failing dependency. Individual endpoints still fail loudly on their own.
    """
    checks: dict[str, str] = {}

    try:
        db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:
        logger.exception("health: database check failed")
        checks["database"] = f"error: {type(exc).__name__}"

    try:
        storage.check_access()
        checks["storage"] = f"ok ({storage.describe()})"
    except Exception as exc:
        # Overwhelmingly the expired-credentials case in practice, which is
        # otherwise invisible until a teacher's save silently fails.
        logger.exception("health: storage check failed")
        checks["storage"] = f"error: {type(exc).__name__}"

    # startswith, not equality: a check may append detail ("ok (LocalStorage)")
    # and an exact match would report a fully healthy service as degraded.
    overall = "ok" if all(v.startswith("ok") for v in checks.values()) else "degraded"
    return {"status": overall, "checks": checks}
