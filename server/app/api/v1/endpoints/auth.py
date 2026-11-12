import asyncio
import logging
from typing import Annotated

import asyncpg
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field, field_validator
from stellar_sdk import Asset, Keypair, Network, Server, TransactionBuilder
from stellar_sdk.exceptions import SdkError

from app.api.deps import get_current_creator
from app.core.config import settings
from app.core.database import db
from app.core.security import (
    create_access_token,
    encrypt_wallet_secret,
    get_password_hash,
    verify_password,
)

router = APIRouter()
logger = logging.getLogger(__name__)

HANDLE_PATTERN = r"^[a-z0-9_]{3,20}$"
RESERVED_HANDLES = {"admin", "api", "dashboard", "login", "register"}
HORIZON_TESTNET_URL = "https://horizon-testnet.stellar.org"
FRIENDBOT_TIMEOUT_SECONDS = 60.0


def normalize_handle(value: object) -> object:
    if isinstance(value, str):
        return value.strip().lower().lstrip("@")
    return value


def validate_password_bytes(password: str) -> str:
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Password must be at most 72 UTF-8 bytes")
    return password


def add_usdc_trustline(secret: str) -> None:
    if not settings.USDC_ISSUER:
        raise ValueError("USDC_ISSUER is not configured")

    keypair = Keypair.from_secret(secret)
    server = Server(HORIZON_TESTNET_URL)
    account = server.load_account(keypair.public_key)
    transaction = (
        TransactionBuilder(
            account,
            Network.TESTNET_NETWORK_PASSPHRASE,
            base_fee=100,
        )
        .append_change_trust_op(asset=Asset("USDC", settings.USDC_ISSUER))
        .set_timeout(30)
        .build()
    )
    transaction.sign(keypair)
    server.submit_transaction(transaction)


class CheckHandleReq(BaseModel):
    handle: str = Field(pattern=HANDLE_PATTERN)

    @field_validator("handle", mode="before")
    @classmethod
    def normalize_handle_input(cls, value: object) -> object:
        return normalize_handle(value)

    @field_validator("handle")
    @classmethod
    def reject_reserved_handle(cls, value: str) -> str:
        if value in RESERVED_HANDLES:
            raise ValueError("This handle is reserved")
        return value


class RegisterReq(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    handle: str = Field(pattern=HANDLE_PATTERN)
    display_name: str

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, value: str) -> str:
        return validate_password_bytes(value)

    @field_validator("handle", mode="before")
    @classmethod
    def normalize_handle_input(cls, value: object) -> object:
        return normalize_handle(value)

    @field_validator("handle")
    @classmethod
    def reject_reserved_handle(cls, value: str) -> str:
        if value in RESERVED_HANDLES:
            raise ValueError("This handle is reserved")
        return value


class LoginReq(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, value: str) -> str:
        return validate_password_bytes(value)


@router.post("/check-handle")
async def check_handle(req: CheckHandleReq):
    row = await db.fetchrow(
        "SELECT id FROM creators WHERE handle = $1",
        req.handle,
    )
    return {"available": row is None, "handle": req.handle}


@router.post("/register")
async def register(req: RegisterReq):
    clean_email = str(req.email).lower().strip()

    existing = await db.fetchrow(
        "SELECT id FROM creators WHERE email = $1 OR handle = $2",
        clean_email,
        req.handle,
    )
    if existing:
        raise HTTPException(status_code=409, detail="Email or handle already taken")

    keypair = Keypair.random()
    public_key = keypair.public_key
    secret_key = keypair.secret

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://friendbot.stellar.org/?addr={public_key}",
                timeout=FRIENDBOT_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
    except httpx.HTTPError as error:
        logger.exception("Friendbot funding failed for new creator wallet")
        raise HTTPException(
            status_code=503,
            detail="Wallet funding failed, try again",
        ) from error

    try:
        await asyncio.to_thread(add_usdc_trustline, secret_key)
    except (ValueError, SdkError) as error:
        logger.exception("USDC trustline setup failed for new creator wallet")
        raise HTTPException(
            status_code=503,
            detail="Wallet funding failed, try again",
        ) from error

    hashed_password = await asyncio.to_thread(get_password_hash, req.password)
    query = """
        INSERT INTO creators (email, password_hash, handle, display_name, public_key, secret_key)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
    """
    try:
        row = await db.fetchrow(
            query,
            clean_email,
            hashed_password,
            req.handle,
            req.display_name,
            public_key,
            encrypt_wallet_secret(secret_key),
        )
    except asyncpg.UniqueViolationError as error:
        raise HTTPException(
            status_code=409,
            detail="Email or handle already taken",
        ) from error

    token = create_access_token(data={"sub": str(row["id"])})
    return {"token": token, "handle": req.handle, "public_key": public_key}


@router.post("/login")
async def login(req: LoginReq):
    clean_email = str(req.email).lower().strip()
    user = await db.fetchrow(
        "SELECT id, password_hash, handle, public_key FROM creators WHERE email = $1",
        clean_email,
    )
    if user is None or not await asyncio.to_thread(
        verify_password,
        req.password,
        user["password_hash"],
    ):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(data={"sub": str(user["id"])})
    return {"token": token, "handle": user["handle"], "public_key": user["public_key"]}
