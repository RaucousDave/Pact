from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_creator
from app.core.database import db
from app.schemas.commission import CommissionIn

router = APIRouter(prefix="/commissions", tags=["commissions"])


@router.post("", status_code=201)
async def create_commission(
    body: CommissionIn,
    user=Depends(get_current_creator),
):
    row = await db.fetchrow(
        """insert into commission_offers (creator_id, title, description, price_usdc, delivery_days)
           values ($1, $2, $3, $4, $5) returning id""",
        user["id"],
        body.title,
        body.description,
        body.price_usdc,
        body.delivery_days,
    )
    return {"id": str(row["id"])}


# Keep /mine above /{commission_id}, or "mine" is parsed as an id.
@router.get("/mine")
async def my_commissions(user=Depends(get_current_creator)):
    rows = await db.fetch(
        """select id, title, price_usdc, delivery_days, is_open, created_at
           from commission_offers where creator_id = $1 order by created_at desc""",
        user["id"],
    )
    return [
        {
            "id": str(row["id"]),
            "title": row["title"],
            "price_usdc": str(row["price_usdc"]),
            "delivery_days": row["delivery_days"],
            "is_open": row["is_open"],
            "created_at": row["created_at"],
        }
        for row in rows
    ]


@router.get("/{commission_id}")
async def get_commission(commission_id: UUID):
    row = await db.fetchrow(
        """select c.id, c.title, c.description, c.price_usdc, c.delivery_days,
                  c.review_days, c.is_open,
                  cr.handle, cr.display_name, cr.avatar_url
           from commission_offers c join creators cr on cr.id = c.creator_id
           where c.id = $1""",
        commission_id,
    )
    if not row:
        raise HTTPException(404, "Commission not found")
    return {
        "id": str(row["id"]),
        "title": row["title"],
        "description": row["description"],
        "price_usdc": str(row["price_usdc"]),
        "delivery_days": row["delivery_days"],
        "review_days": row["review_days"],
        "is_open": row["is_open"],
        "creator": {
            "handle": row["handle"],
            "display_name": row["display_name"],
            "avatar_url": row["avatar_url"],
        },
    }
