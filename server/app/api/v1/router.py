from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, users, donations, commissions, orders

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(donations.router)
api_router.include_router(commissions.router)
api_router.include_router(orders.router)
