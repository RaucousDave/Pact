import asyncpg
import httpx
import pytest
from fastapi.testclient import TestClient

from app.api.v1.endpoints import auth
from app.core.security import create_access_token
from app.main import app

client = TestClient(app)


class FriendbotClient:
    def __init__(self, status_code: int):
        self.status_code = status_code

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        return None

    async def get(self, url: str, timeout: float):
        assert timeout == auth.FRIENDBOT_TIMEOUT_SECONDS
        request = httpx.Request("GET", url)
        return httpx.Response(self.status_code, request=request)


def registration_payload(**overrides):
    return {
        "email": "creator@example.com",
        "password": "correct horse battery",
        "handle": "@Creator_1",
        "display_name": "Creator",
        **overrides,
    }


def test_handle_is_normalized_and_reserved_handles_are_rejected(monkeypatch):
    calls = []

    async def fetchrow(query, handle):
        calls.append(handle)

    monkeypatch.setattr(auth.db, "fetchrow", fetchrow)

    response = client.post("/api/v1/auth/check-handle", json={"handle": " @MiXeD "})

    assert response.status_code == 200
    assert response.json() == {"available": True, "handle": "mixed"}
    assert calls == ["mixed"]
    assert client.post(
        "/api/v1/auth/check-handle",
        json={"handle": "admin"},
    ).status_code == 422


@pytest.mark.parametrize(
    "handle",
    ["ab", "bad handle", "with/slash", "emoji🙂", "register"],
)
def test_registration_rejects_invalid_or_reserved_handles(handle):
    response = client.post(
        "/api/v1/auth/register",
        json=registration_payload(handle=handle),
    )
    assert response.status_code == 422


def test_registration_rejects_passwords_over_bcrypt_byte_limit():
    response = client.post(
        "/api/v1/auth/register",
        json=registration_payload(password="🙂" * 24),
    )
    assert response.status_code == 422


def test_friendbot_http_failure_is_logged_and_prevents_database_insert(
    monkeypatch,
    caplog,
):
    queries = []

    async def fetchrow(query, *args):
        queries.append(query)

    monkeypatch.setattr(auth.db, "fetchrow", fetchrow)
    monkeypatch.setattr(auth.httpx, "AsyncClient", lambda: FriendbotClient(400))

    response = client.post(
        "/api/v1/auth/register",
        json=registration_payload(),
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Wallet funding failed, try again"
    assert "Friendbot funding failed" in caplog.text
    assert "400 Bad Request" in caplog.text
    assert len(queries) == 1
    assert "INSERT INTO creators" not in queries[0]


def test_registration_creates_trustline_before_saving_without_exposing_secret(
    monkeypatch,
):
    events = []

    def trustline(secret):
        return None

    def hash_password(password):
        return "hashed"

    async def fetchrow(query, *args):
        if query.startswith("SELECT"):
            return None
        events.append("insert")
        return {"id": 42}

    async def to_thread(function, *args):
        if function is trustline:
            events.append("trustline")
        return function(*args)

    monkeypatch.setattr(auth.db, "fetchrow", fetchrow)
    monkeypatch.setattr(auth.httpx, "AsyncClient", lambda: FriendbotClient(200))
    monkeypatch.setattr(auth.asyncio, "to_thread", to_thread)
    monkeypatch.setattr(auth, "add_usdc_trustline", trustline)
    monkeypatch.setattr(auth, "get_password_hash", hash_password)

    response = client.post(
        "/api/v1/auth/register",
        json=registration_payload(),
    )

    assert response.status_code == 200
    assert events == ["trustline", "insert"]
    assert response.json()["handle"] == "creator_1"
    assert "secret_key" not in response.json()


def test_trustline_failure_is_logged_and_prevents_database_insert(monkeypatch, caplog):
    queries = []

    async def fetchrow(query, *args):
        queries.append(query)

    def fail_to_add_trustline(secret):
        raise ValueError("issuer is not configured")

    monkeypatch.setattr(auth.db, "fetchrow", fetchrow)
    monkeypatch.setattr(auth.httpx, "AsyncClient", lambda: FriendbotClient(200))
    monkeypatch.setattr(auth, "add_usdc_trustline", fail_to_add_trustline)

    response = client.post(
        "/api/v1/auth/register",
        json=registration_payload(),
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Wallet funding failed, try again"
    assert "USDC trustline setup failed" in caplog.text
    assert "issuer is not configured" in caplog.text
    assert len(queries) == 1
    assert "INSERT INTO creators" not in queries[0]


def test_registration_maps_unique_violation_to_conflict(monkeypatch):
    async def fetchrow(query, *args):
        if query.startswith("SELECT"):
            return
        raise asyncpg.UniqueViolationError("duplicate")

    async def to_thread(function, *args):
        return function(*args)

    monkeypatch.setattr(auth.db, "fetchrow", fetchrow)
    monkeypatch.setattr(auth.httpx, "AsyncClient", lambda: FriendbotClient(200))
    monkeypatch.setattr(auth.asyncio, "to_thread", to_thread)
    monkeypatch.setattr(auth, "add_usdc_trustline", lambda secret: None)
    monkeypatch.setattr(auth, "get_password_hash", lambda password: "hashed")

    response = client.post(
        "/api/v1/auth/register",
        json=registration_payload(),
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Email or handle already taken"


def test_login_returns_token_for_valid_credentials_and_rejects_invalid_password(
    monkeypatch,
):
    async def fetchrow(query, email):
        return {
            "id": 42,
            "password_hash": "hashed",
            "handle": "creator_1",
            "public_key": "GABC",
        }

    monkeypatch.setattr(auth.db, "fetchrow", fetchrow)
    monkeypatch.setattr(auth, "verify_password", lambda password, hashed: True)

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "creator@example.com", "password": "valid password"},
    )

    assert response.status_code == 200
    assert response.json()["handle"] == "creator_1"
    assert "token" in response.json()
    assert "secret_key" not in response.json()

    monkeypatch.setattr(auth, "verify_password", lambda password, hashed: False)
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "creator@example.com", "password": "valid password"},
    )
    assert response.status_code == 401


def test_me_returns_safe_profile_and_uses_integer_database_id(monkeypatch):
    calls = []

    async def fetchrow(query, creator_id):
        calls.append(creator_id)
        return {
            "id": creator_id,
            "email": "creator@example.com",
            "handle": "creator_1",
            "secret_key": "must not be returned",
        }

    monkeypatch.setattr(auth.db, "fetchrow", fetchrow)
    token = create_access_token({"sub": "42"})

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert calls == [42]
    assert response.json() == {
        "id": 42,
        "email": "creator@example.com",
        "handle": "creator_1",
    }


def test_profile_can_clear_bio_and_enforces_bio_limit(monkeypatch):
    calls = []

    async def fetchrow(query, creator_id):
        return {"id": creator_id, "email": "creator@example.com", "handle": "creator_1"}

    async def execute(query, *args):
        calls.append((query, args))

    monkeypatch.setattr(auth.db, "fetchrow", fetchrow)
    monkeypatch.setattr(auth.db, "execute", execute)
    token = create_access_token({"sub": "42"})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.patch(
        "/api/v1/auth/profile",
        headers=headers,
        json={"bio": None},
    )

    assert response.status_code == 200
    assert calls == [("UPDATE creators SET bio = $1 WHERE id = $2", (None, 42))]
    assert client.patch(
        "/api/v1/auth/profile",
        headers=headers,
        json={"bio": "a" * 501},
    ).status_code == 422
