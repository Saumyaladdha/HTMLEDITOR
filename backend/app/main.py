from dotenv import load_dotenv

# Must run before anything below is imported: app.routers -> app.services.s3_service
# creates its boto3 client at MODULE IMPORT TIME, so AWS_* creds have to already
# be in os.environ by then. python-dotenv's bare load_dotenv() walks up from this
# file looking for the nearest .env — that's backend/.env, which is where the
# current temporary AWS_ACCESS_KEY_ID/SECRET/SESSION_TOKEN actually live (the
# long-term base credentials used to mint them live one level up, in the repo
# root .env, and are never read by the app itself).
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.session import Base, engine
from app.routers import auth, books, export, versions

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

app.include_router(auth.router)
app.include_router(books.router)
app.include_router(versions.router)
app.include_router(export.router)


@app.get("/health")
def health():
    return {"status": "ok"}
