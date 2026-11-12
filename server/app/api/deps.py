from typing import Annotated
from uuid import UUID

import asyncpg
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import db
from app.core.security import ALGORITHM, SECRET_KEY

security = HTTPBearer()


async def get_current_creator(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
) -> asyncpg.Record:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        creator_id = payload.get("sub")
        if not isinstance(creator_id, str) or not creator_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    try:
        database_id = UUID(creator_id)
    except ValueError:
        try:
            database_id = int(creator_id)
        except ValueError as error:
            raise HTTPException(status_code=401, detail="Invalid token payload") from error

    user = await db.fetchrow(
        "SELECT id, handle, email, display_name, bio, avatar_url, public_key FROM creators WHERE id = $1",
        database_id,
    )
    if not user:
        raise HTTPException(status_code=401, detail="Creator not found")

    return user
