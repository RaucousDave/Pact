from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_creator
from app.api.v1.endpoints import commissions
from app.main import app
from app.schemas.commission import CommissionIn

client = TestClient(app)
CREATOR = {
    "id": UUID("23917188-71c8-41cc-9de9-2aa45bf29299"),
    "handle": "creator_1",
    "email": "creator@example.com",
    "display_name": "Creator",
    "avatar_url": "https://example.com/avatar.png",
    "public_key": "public-key",
}
COMMISSION_ID = UUID("d7aa4c3b-5fac-448b-90f4-9f10bf271a4f")


@pytest.fixture
def authenticated_creator():
    app.dependency_overrides[get_current_creator] = lambda: CREATOR
    yield
    app.dependency_overrides.pop(get_current_creator, None)


def test_commission_schema_strips_text_and_validates_limits():
    commission = CommissionIn(
        title="  Portrait  ",
        description="  Hand-drawn  ",
        price_usdc="25.1234567",
        delivery_days=7,
    )

    assert commission.title == "Portrait"
    assert commission.description == "Hand-drawn"
    with pytest.raises(ValueError):
        CommissionIn(
            title="   ", description="A description", price_usdc="1", delivery_days=7
        )


def test_create_commission_returns_id_and_persists_creator(monkeypatch, authenticated_creator):
    calls = []

    async def fetchrow(query, *args):
        calls.append((query, args))
        return {"id": COMMISSION_ID}

    monkeypatch.setattr(commissions.db, "fetchrow", fetchrow)
    response = client.post(
        "/api/v1/commissions",
        json={
            "title": "Custom portrait",
            "description": "A hand-drawn portrait.",
            "price_usdc": "25",
            "delivery_days": 7,
        },
    )

    assert response.status_code == 201
    assert response.json() == {"id": str(COMMISSION_ID)}
    assert calls[0][1] == (CREATOR["id"], "Custom portrait", "A hand-drawn portrait.", Decimal("25"), 7)


def test_my_commissions_returns_only_creator_offers(monkeypatch, authenticated_creator):
    async def fetch(query, *args):
        assert "where creator_id = $1" in query
        assert args == (CREATOR["id"],)
        return [
            {
                "id": COMMISSION_ID,
                "title": "Custom portrait",
                "price_usdc": Decimal("25"),
                "delivery_days": 7,
                "is_open": True,
                "created_at": datetime(2026, 1, 1, tzinfo=UTC),
            }
        ]

    monkeypatch.setattr(commissions.db, "fetch", fetch)
    response = client.get("/api/v1/commissions/mine")

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": str(COMMISSION_ID),
            "title": "Custom portrait",
            "price_usdc": "25",
            "delivery_days": 7,
            "is_open": True,
            "created_at": "2026-01-01T00:00:00+00:00",
        }
    ]


def test_public_commission_has_display_fields_only(monkeypatch):
    async def fetchrow(query, commission_id):
        assert commission_id == COMMISSION_ID
        return {
            "id": COMMISSION_ID,
            "title": "Custom portrait",
            "description": "A hand-drawn portrait.",
            "price_usdc": Decimal("25"),
            "delivery_days": 7,
            "review_days": 3,
            "is_open": True,
            "handle": "creator_1",
            "display_name": "Creator",
            "avatar_url": "https://example.com/avatar.png",
        }

    monkeypatch.setattr(commissions.db, "fetchrow", fetchrow)
    response = client.get(f"/api/v1/commissions/{COMMISSION_ID}")

    assert response.status_code == 200
    assert response.json() == {
        "id": str(COMMISSION_ID),
        "title": "Custom portrait",
        "description": "A hand-drawn portrait.",
        "price_usdc": "25",
        "delivery_days": 7,
        "review_days": 3,
        "is_open": True,
        "creator": {
            "handle": "creator_1",
            "display_name": "Creator",
            "avatar_url": "https://example.com/avatar.png",
        },
    }
    assert "email" not in response.text
    assert "public_key" not in response.text


def test_public_commission_returns_404_when_missing(monkeypatch):
    async def fetchrow(_query, _commission_id):
        return None

    monkeypatch.setattr(commissions.db, "fetchrow", fetchrow)
    response = client.get(f"/api/v1/commissions/{COMMISSION_ID}")

    assert response.status_code == 404
    assert response.json() == {"detail": "Commission not found"}
