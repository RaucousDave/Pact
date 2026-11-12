import json

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api.deps import get_current_creator
from app.api.v1.endpoints import users
from app.main import app
from app.schemas.page import PageUpdateReq

client = TestClient(app)
CREATOR = {
    "id": 7,
    "handle": "creator_1",
    "email": "creator@example.com",
    "display_name": "Creator",
    "bio": "Hello",
    "avatar_url": "https://example.com/avatar.png",
    "public_key": "public-key",
}


def valid_page_payload():
    return {
        "theme": {
            "presetId": "default",
            "background": {
                "type": "gradient",
                "from": "#ffffff",
                "to": "#000000",
                "angle": 45,
            },
            "colors": {
                "text": "#000000",
                "mutedText": "#111111",
                "accent": "#222222",
                "cardBackground": "#333333",
                "cardText": "#444444",
                "cardBorder": "#555555",
            },
            "font": "dm-sans",
            "cardStyle": "filled",
            "cornerStyle": "rounded",
            "spacing": "comfortable",
            "motion": "gentle",
        },
        "socialLinks": [
            {
                "id": "instagram",
                "platform": "instagram",
                "url": "https://instagram.com/creator",
            }
        ],
        "blocks": [
            {
                "id": "visible-link",
                "type": "link",
                "title": "Work",
                "url": "https://example.com/work",
            },
            {
                "id": "hidden-heading",
                "type": "heading",
                "text": "Hidden",
                "visible": False,
            },
        ],
    }


def authenticate_creator(monkeypatch):
    monkeypatch.setitem(
        app.dependency_overrides,
        get_current_creator,
        lambda: CREATOR,
    )


def test_page_schema_accepts_camel_case_and_serializes_aliases():
    page = PageUpdateReq.model_validate(valid_page_payload())

    data = page.model_dump(mode="json", by_alias=True)
    assert data["theme"]["background"]["from"] == "#ffffff"
    assert "from_" not in data["theme"]["background"]
    assert data["socialLinks"][0]["id"] == "instagram"


@pytest.mark.parametrize(
    ("data", "content_type"),
    [
        (b"\xff\xd8\xffdata", "image/jpeg"),
        (b"\x89PNG\r\n\x1a\ndata", "image/png"),
        (b"RIFFxxxxWEBPdata", "image/webp"),
        (b"GIF89adata", "image/gif"),
    ],
)
def test_sniff_image_detects_supported_formats(data, content_type):
    assert users.sniff_image(data) == content_type


def test_page_schema_accepts_uploaded_asset_urls():
    payload = valid_page_payload()
    asset_url = (
        f"{users.settings.SUPABASE_URL.rstrip('/')}"
        "/storage/v1/object/public/page-assets/7/image.jpg"
    )
    payload["theme"]["background"] = {
        "type": "image",
        "imageUrl": asset_url,
        "overlayOpacity": 0.4,
    }
    payload["blocks"] = [
        {
            "id": "image",
            "type": "image",
            "imageUrl": asset_url,
            "alt": "Uploaded image",
        },
        {
            "id": "link",
            "type": "link",
            "title": "Work",
            "url": "https://example.com/work",
            "thumbnailUrl": asset_url,
        },
    ]

    PageUpdateReq.model_validate(payload)


@pytest.mark.parametrize(
    "update",
    [
        lambda payload: payload["theme"]["colors"].update(accent="red"),
        lambda payload: payload["socialLinks"][0].update(url="javascript:alert(1)"),
        lambda payload: payload["blocks"][0].update(extra="not allowed"),
        lambda payload: payload["blocks"].append(
            {
                "id": "image",
                "type": "image",
                "imageUrl": "https://evil.com/image.png",
                "alt": "Invalid URL",
            }
        ),
        lambda payload: payload["theme"].update(
            background={
                "type": "image",
                "imageUrl": "https://evil.com/background.png",
                "overlayOpacity": 0.4,
            }
        ),
        lambda payload: payload["blocks"][0].update(
            thumbnailUrl="https://evil.com/thumbnail.png"
        ),
    ],
)
def test_page_schema_rejects_unsafe_or_unknown_values(update):
    payload = valid_page_payload()
    update(payload)

    with pytest.raises(ValidationError):
        PageUpdateReq.model_validate(payload)


def test_upload_page_asset_uses_verified_type_and_unique_storage_path(monkeypatch):
    authenticate_creator(monkeypatch)
    data = b"\xff\xd8\xffimage data"
    uploads = []

    async def upload_to_storage(bucket, path, uploaded_data, content_type, **kwargs):
        uploads.append((bucket, path, uploaded_data, content_type, kwargs))
        return "https://storage.example/page-assets/7/image.jpg"

    monkeypatch.setattr(users, "upload_to_storage", upload_to_storage)
    response = client.post(
        "/api/v1/users/me/page/assets",
        files={"file": ("image.png", data, "image/png")},
    )

    assert response.status_code == 200
    assert response.json() == {"url": "https://storage.example/page-assets/7/image.jpg"}
    assert len(uploads) == 1
    bucket, path, uploaded_data, content_type, kwargs = uploads[0]
    assert bucket == users.ASSET_BUCKET
    assert path.startswith(f"{CREATOR['id']}/")
    assert path.endswith(".jpg")
    assert uploaded_data == data
    assert content_type == "image/jpeg"
    assert kwargs == {"cache_seconds": 31536000}


def test_upload_page_asset_rejects_unrecognized_image_bytes(monkeypatch):
    authenticate_creator(monkeypatch)
    response = client.post(
        "/api/v1/users/me/page/assets",
        files={"file": ("fake.png", b"hi", "image/png")},
    )

    assert response.status_code == 415
    assert response.json()["detail"] == "Use a JPG, PNG, WebP or GIF image"


def test_upload_page_asset_rejects_files_over_size_limit(monkeypatch):
    authenticate_creator(monkeypatch)
    data = b"x" * (users.MAX_ASSET_BYTES + 1)
    response = client.post(
        "/api/v1/users/me/page/assets",
        files={"file": ("large.png", data, "image/png")},
    )

    assert response.status_code == 413
    assert response.json()["detail"] == "Image must be under 5MB"


def test_get_my_page_returns_default_theme_when_unconfigured(monkeypatch):
    authenticate_creator(monkeypatch)

    async def fetchrow(query, creator_id):
        assert "FROM creator_pages" in query
        assert creator_id == CREATOR["id"]

    monkeypatch.setattr(users.db, "fetchrow", fetchrow)
    response = client.get("/api/v1/users/me/page")

    assert response.status_code == 200
    result = response.json()
    assert result["theme"]["presetId"] == "default"
    assert result["blocks"] == []
    assert result["creator"] == {
        "id": "7",
        "handle": "creator_1",
        "displayName": "Creator",
        "bio": "Hello",
        "avatarUrl": "https://example.com/avatar.png",
    }


def test_save_page_persists_whole_page_with_jsonb_arguments(monkeypatch):
    authenticate_creator(monkeypatch)
    saved = {}

    async def execute(query, creator_id, theme, links, blocks):
        assert "ON CONFLICT (creator_id) DO UPDATE" in query
        saved.update(
            creator_id=creator_id,
            theme=json.loads(theme),
            links=json.loads(links),
            blocks=json.loads(blocks),
        )

    async def fetchrow(_query, _creator_id):
        assert "FROM creator_pages" in _query
        assert _creator_id == CREATOR["id"]
        return {
            "theme": json.dumps(saved["theme"]),
            "social_links": json.dumps(saved["links"]),
            "blocks": json.dumps(saved["blocks"]),
        }

    monkeypatch.setattr(users.db, "execute", execute)
    monkeypatch.setattr(users.db, "fetchrow", fetchrow)
    response = client.put(
        "/api/v1/users/me/page",
        json=valid_page_payload(),
    )

    assert response.status_code == 200
    assert saved["creator_id"] == CREATOR["id"]
    assert saved["theme"]["background"]["from"] == "#ffffff"
    assert len(response.json()["blocks"]) == 2


def test_public_page_normalizes_handle_and_hides_invisible_blocks(monkeypatch):
    calls = []

    async def fetchrow(query, *args):
        calls.append((query, args))
        if "FROM creators" in query:
            return {
                "id": CREATOR["id"],
                "handle": CREATOR["handle"],
                "display_name": CREATOR["display_name"],
                "bio": CREATOR["bio"],
                "avatar_url": CREATOR["avatar_url"],
            }
        return {
            "theme": "{}",
            "social_links": "[]",
            "blocks": json.dumps(valid_page_payload()["blocks"]),
        }

    monkeypatch.setattr(users.db, "fetchrow", fetchrow)
    response = client.get("/api/v1/users/@CREATOR_1/page")

    assert response.status_code == 200
    assert [block["id"] for block in response.json()["blocks"]] == ["visible-link"]
    assert calls[0][1] == ("creator_1",)


def test_public_page_returns_404_for_unknown_creator(monkeypatch):
    async def fetchrow(query, *args):
        assert "FROM creators" in query
        assert args == ("missing",)

    monkeypatch.setattr(users.db, "fetchrow", fetchrow)
    response = client.get("/api/v1/users/missing/page")

    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"
