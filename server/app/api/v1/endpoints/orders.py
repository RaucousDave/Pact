import asyncio
from uuid import UUID

from fastapi import APIRouter, HTTPException
from stellar_sdk import TransactionEnvelope

from app.core.config import settings
from app.core.database import db
from app.core.trustless import (
    TrustlessError,
    build_deploy,
    build_fund,
    send_transaction,
    sign_with,
)
from app.schemas.order import OrderPrepareIn, OrderSubmitIn

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/prepare")
async def prepare(body: OrderPrepareIn):
    commission = await db.fetchrow(
        """select c.id, c.creator_id, c.title, c.price_usdc, c.delivery_days,
                  c.is_open, cr.public_key
           from commission_offers c join creators cr on cr.id = c.creator_id
           where c.id = $1""",
        body.commission_id,
    )
    if not commission:
        raise HTTPException(404, "Commission not found")
    if not commission["is_open"]:
        raise HTTPException(409, "This commission isn't taking orders")

    row = await db.fetchrow(
        """insert into orders (commission_id, creator_id, client_public_key, client_name,
                               client_contact, client_note, price_usdc, delivery_days)
           values ($1,$2,$3,$4,$5,$6,$7,$8) returning id""",
        commission["id"],
        commission["creator_id"],
        body.client_public_key,
        body.client_name,
        body.client_contact,
        body.client_note,
        commission["price_usdc"],
        commission["delivery_days"],
    )
    order_id = str(row["id"])

    try:
        built = await build_deploy(
            engagement_id=order_id,
            title=commission["title"],
            amount=commission["price_usdc"],
            client=body.client_public_key,
            creator=commission["public_key"],
        )
        await send_transaction(
            sign_with(settings.PLATFORM_SECRET, built["unsignedXdr"])
        )
        contract_id = built["contractId"]
        await db.execute(
            "update orders set contract_id=$1, status='deployed' where id=$2",
            contract_id,
            row["id"],
        )
        for attempt in range(5):
            try:
                fund = await build_fund(
                    contract_id, body.client_public_key, commission["price_usdc"]
                )
                break
            except TrustlessError:
                if attempt == 4:
                    raise
                await asyncio.sleep(2)
    except TrustlessError as error:
        await db.execute(
            "update orders set status='failed' where id=$1", row["id"]
        )
        raise HTTPException(502, f"Escrow service error: {error.detail}") from error

    fund_xdr = fund["unsignedXdr"]
    expected_fund_hash = TransactionEnvelope.from_xdr(
        fund_xdr, settings.NETWORK_PASSPHRASE
    ).hash_hex()
    await db.execute(
        "update orders set expected_fund_hash=$1 where id=$2",
        expected_fund_hash,
        row["id"],
    )
    return {
        "order_id": order_id,
        "contract_id": contract_id,
        "xdr": fund_xdr,
        "network_passphrase": settings.NETWORK_PASSPHRASE,
    }


@router.post("/{order_id}/submit-fund")
async def submit_fund(order_id: UUID, body: OrderSubmitIn):
    order = await db.fetchrow(
        "select status, delivery_days, expected_fund_hash from orders where id=$1",
        order_id,
    )
    if not order:
        raise HTTPException(404, "Order not found")
    if order["status"] != "deployed":
        raise HTTPException(409, f"Order is {order['status']}")
    try:
        submitted_hash = TransactionEnvelope.from_xdr(
            body.signed_xdr, settings.NETWORK_PASSPHRASE
        ).hash_hex()
    except Exception as error:
        raise HTTPException(400, "Invalid signed transaction") from error
    if submitted_hash != order["expected_fund_hash"]:
        raise HTTPException(400, "Signed transaction doesn't match this order")
    try:
        await send_transaction(body.signed_xdr)
    except TrustlessError as error:
        raise HTTPException(400, f"Funding failed: {error.detail}") from error
    await db.execute(
        """update orders set status='funded', funded_at=now(),
           due_at = now() + make_interval(days => $2) where id=$1""",
        order_id,
        order["delivery_days"],
    )
    return {"status": "funded"}


@router.get("/{order_id}")
async def get_order(order_id: UUID):
    row = await db.fetchrow(
        """select o.id, o.status, o.price_usdc, o.delivery_days, o.contract_id,
                  o.due_at, o.created_at, c.title, cr.handle, cr.display_name
           from orders o join commission_offers c on c.id = o.commission_id
           join creators cr on cr.id = o.creator_id where o.id = $1""",
        order_id,
    )
    if not row:
        raise HTTPException(404, "Order not found")
    return {
        "id": str(row["id"]),
        "status": row["status"],
        "title": row["title"],
        "price_usdc": str(row["price_usdc"]),
        "delivery_days": row["delivery_days"],
        "contract_id": row["contract_id"],
        "due_at": row["due_at"],
        "creator": {
            "handle": row["handle"],
            "display_name": row["display_name"],
        },
    }
