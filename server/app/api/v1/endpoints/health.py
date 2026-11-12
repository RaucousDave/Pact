from fastapi import APIRouter
from app.core.config import settings
from app.schemas.health import HealthCheck

router = APIRouter()


@router.get("/health", response_model=HealthCheck, summary="Health Check")
def health_check():
    return HealthCheck(
        name=settings.PROJECT_NAME,
        version="0.1.0",
        status="ok",
    )
