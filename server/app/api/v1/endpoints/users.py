import json
import logging
import time
import uuid
from typing import Annotated

import asyncpg
import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.api.deps import get_current_creator
from app.core.config import settings
from app.core.database import db
from app.schemas.page import PageUpdateReq

router = APIRouter()
logger = logging.getLogger(__name__)

AVATAR_BUCKET = "avatars"
MAX_AVATAR_BYTES = 2 * 1024 * 1024
ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp"}
ASSET_BUCKET = "page-assets"
MAX_ASSET_BYTES = 5 * 1024 * 1024
IMAGE_EXT = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}

DEFAULT_THEME = {
    "presetId": "default",
    "background": {"type": "solid", "color": "#fefbfd"},
    "colors": {
        "text": "#21081e",
        "mutedText": "#6b5a68",
        "accent": "#5c049f",
        "cardBackground": "#ffffff",
        "cardText": "#21081e",
        "cardBorder": "#e8dde6",
    },
    "font": "dm-sans",
    "cardStyle": "filled",
    "cornerStyle": "rounded",
    "spacing": "comfortable",
    "motion": "gentle",
}

CurrentCreator = Annotated[asyncpg.Record, Depends(get_current_creator)]


class ProfileUpdateReq(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=50)
    bio: str | None = Field(default=None, max_length=500)


def sniff_image(data: bytes) -> str | None:
    """Detect the real type from the file bytes instead of trusting the client."""
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    return None


async def upload_to_storage(
    bucket: str,
    path: str,
    data: bytes,
    content_type: str,
    *,
    upsert: bool = False,
    cache_seconds: int = 3600,
) -> str:
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.SUPABASE_URL}/storage/v1/object/{bucket}/{path}",
                content=data,
                headers={
                    "apikey": settings.SUPABASE_SERVICE_KEY,
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                    "Content-Type": content_type,
                    "x-upsert": "true" if upsert else "false",
                    "cache-control": f"max-age={cache_seconds}",
                },
                timeout=30.0,
            )
            response.raise_for_status()
    except httpx.HTTPError as error:
        body = getattr(getattr(error, "response", None), "text", "")
        logger.exception("Storage upload failed: %s", body)
        raise HTTPException(
            status_code=502, detail="Upload failed, try again"
        ) from error
    return f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}"


def private_profile(row: asyncpg.Record) -> dict:
    return {
        "id": row["id"],
        "email": row["email"],
        "handle": row["handle"],
        "display_name": row["display_name"],
        "bio": row["bio"],
        "avatar_url": row["avatar_url"],
        "public_key": row["public_key"],
    }


def private_identity(row: asyncpg.Record) -> dict:
    return {
        "id": str(row["id"]),
        "handle": row["handle"],
        "displayName": row["display_name"],
        "bio": row["bio"],
        "avatarUrl": row["avatar_url"],
    }


async def load_page(creator_id: int, *, public: bool) -> dict:
    row = await db.fetchrow(
        "SELECT theme, social_links, blocks FROM creator_pages WHERE creator_id = $1",
        creator_id,
    )
    theme = (
        json.loads(row["theme"])
        if row and row["theme"] != "{}"
        else DEFAULT_THEME.copy()
    )
    links = json.loads(row["social_links"]) if row else []
    blocks = json.loads(row["blocks"]) if row else []
    if public:
        blocks = [block for block in blocks if block.get("visible", True)]
    return {
        "id": str(creator_id),
        "theme": theme,
        "socialLinks": links,
        "blocks": blocks,
    }


# NOTE: /me routes must stay above /{handle}
@router.get("/me")
async def get_me(current_user: CurrentCreator):
    return private_profile(current_user)


@router.get("/me/page")
async def get_my_page(current_user: CurrentCreator):
    page = await load_page(current_user["id"], public=False)
    page["creator"] = private_identity(current_user)
    return page


@router.put("/me/page")
async def save_my_page(req: PageUpdateReq, current_user: CurrentCreator):
    data = req.model_dump(mode="json", by_alias=True)
    await db.execute(
        """
        INSERT INTO creator_pages (creator_id, theme, social_links, blocks)
        VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb)
        ON CONFLICT (creator_id) DO UPDATE SET
          theme = EXCLUDED.theme,
          social_links = EXCLUDED.social_links,
          blocks = EXCLUDED.blocks,
          updated_at = now()
        """,
        current_user["id"],
        json.dumps(data["theme"]),
        json.dumps(data["socialLinks"]),
        json.dumps(data["blocks"]),
    )
    return await load_page(current_user["id"], public=False)


@router.post("/me/page/assets")
async def upload_page_asset(
    current_user: CurrentCreator,
    file: Annotated[UploadFile, File()],
):
    data = await file.read(MAX_ASSET_BYTES + 1)
    if len(data) > MAX_ASSET_BYTES:
        raise HTTPException(status_code=413, detail="Image must be under 5MB")

    kind = sniff_image(data)
    if kind is None:
        raise HTTPException(
            status_code=415,
            detail="Use a JPG, PNG, WebP or GIF image",
        )

    path = f"{current_user['id']}/{uuid.uuid4().hex}.{IMAGE_EXT[kind]}"
    url = await upload_to_storage(
        ASSET_BUCKET,
        path,
        data,
        kind,
        cache_seconds=31536000,
    )
    return {"url": url}


@router.patch("/me")
async def update_me(req: ProfileUpdateReq, current_user: CurrentCreator):
    updates = req.model_dump(exclude_unset=True)
    if not updates:
        return private_profile(current_user)

    fields = list(updates)
    set_clause = ", ".join(f"{f} = ${i}" for i, f in enumerate(fields, start=1))
    values = [updates[f] for f in fields] + [current_user["id"]]
    row = await db.fetchrow(
        f"UPDATE creators SET {set_clause} WHERE id = ${len(values)} RETURNING *",
        *values,
    )
    return private_profile(row)


@router.post("/me/avatar")
async def upload_avatar(
    current_user: CurrentCreator,
    file: Annotated[UploadFile, File()],
):
    data = await file.read(MAX_AVATAR_BYTES + 1)
    if len(data) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=413, detail="Image must be under 2MB")

    kind = sniff_image(data)
    if kind is None or kind not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(status_code=415, detail="Use a JPG, PNG or WebP image")

    path = f"{current_user['id']}/avatar"  # fixed path, so re-uploads overwrite
    avatar_url = await upload_to_storage(
        AVATAR_BUCKET,
        path,
        data,
        kind,
        upsert=True,
    )
    avatar_url += f"?v={int(time.time())}"
    await db.execute(
        "UPDATE creators SET avatar_url = $1 WHERE id = $2",
        avatar_url,
        current_user["id"],
    )
    return {"avatar_url": avatar_url}


@router.get("/{handle}/page")
async def get_public_page(handle: str):
    creator = await db.fetchrow(
        "SELECT id, handle, display_name, bio, avatar_url FROM creators WHERE handle = $1",
        handle.strip().lower().lstrip("@"),
    )
    if creator is None:
        raise HTTPException(status_code=404, detail="User not found")
    page = await load_page(creator["id"], public=True)
    page["creator"] = private_identity(creator)
    return page


@router.get("/{handle}")
async def get_user_by_handle(handle: str):
    row = await db.fetchrow(
        """
        SELECT handle, display_name, bio, avatar_url, public_key
        FROM creators WHERE handle = $1
        """,
        handle.strip().lower().lstrip("@"),
    )
    if row is None:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(row)
