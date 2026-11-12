from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
_WALLET_SECRET_PREFIX = "fernet:v1:"


def encrypt_wallet_secret(secret: str) -> str:
    cipher = Fernet(settings.WALLET_ENCRYPTION_KEY.encode("ascii"))
    token = cipher.encrypt(secret.encode("utf-8")).decode("ascii")
    return f"{_WALLET_SECRET_PREFIX}{token}"


def decrypt_wallet_secret(value: str) -> str:
    if not value.startswith(_WALLET_SECRET_PREFIX):
        raise ValueError("Wallet secret needs encryption backfill")
    cipher = Fernet(settings.WALLET_ENCRYPTION_KEY.encode("ascii"))
    try:
        return cipher.decrypt(value[len(_WALLET_SECRET_PREFIX):].encode("ascii")).decode("utf-8")
    except InvalidToken as error:
        raise ValueError("Wallet secret cannot be decrypted with the configured key") from error

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict, expires_delta: timedelta = timedelta(days=7)):
    to_encode = data.copy()
    expire = datetime.now(UTC) + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
