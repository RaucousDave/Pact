from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import settings
from app.core.database import db

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    yield
    await db.disconnect()

# Single app instance with all settings and the lifespan manager
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Set CORS origins
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix="/api")

@app.get("/")
async def root():
    return {"status": "ok", "message": "Pact API is running"}

# Quick test route to make sure the database is actually talking to FastAPI
@app.get("/db-check")
async def db_check():
    try:
        # Fetches the current database time just to prove the connection works
        result = await db.fetchrow("SELECT NOW()")
        return {"status": "connected", "server_time": result["now"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
