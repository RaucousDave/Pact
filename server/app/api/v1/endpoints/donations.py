from fastapi import APIRouter, Depends, HTTPException
from stellar_sdk import TransactionEnvelope
from stellar_sdk import ServerAsync
from stellar_sdk.exceptions import BadRequestError

from app.api.deps import get_current_creator
from app.core.config import settings
from app.core.database import db
from app.core.stellar import FanAccountError, NoPathError, build_tip_tx, fmt
from app.schemas.donations import PrepareIn, PrepareOut, SubmitIn

router = APIRouter(prefix="/donations", tags=["donations"])


@router.post("/prepare", response_model=PrepareOut)
async def prepare(body: PrepareIn):
    creator = await db.fetchrow(
        "select id, public_key from creators where lower(handle) = lower($1)",
        body.handle,
    )
    if not creator:
        raise HTTPException(404, "Creator not found")

    try:
        xdr, tx_hash, send_max = await build_tip_tx(
            body.fan_public_key, creator["public_key"], body.amount_usdc
        )
    except FanAccountError:
        raise HTTPException(400, "Your wallet isn't funded on this network yet")
    except NoPathError:
        raise HTTPException(503, "No XLM→USDC liquidity right now")

    donation_id = await db.fetchval(
        """insert into donations
           (creator_id, fan_public_key, fan_name, message, amount_usdc, send_max_xlm, tx_hash)
           values ($1,$2,$3,$4,$5,$6,$7) returning id""",
        creator["id"], body.fan_public_key, body.fan_name, body.message,
        body.amount_usdc, send_max, tx_hash,
    )
    return PrepareOut(
        donation_id=str(donation_id),
        xdr=xdr,
        network_passphrase=settings.NETWORK_PASSPHRASE,
        send_max_xlm=fmt(send_max),
    )


@router.post("/submit")
async def submit(body: SubmitIn):
    row = await db.fetchrow(
        "select id, tx_hash, status from donations where id = $1", body.donation_id
    )
    if not row:
        raise HTTPException(404, "Donation not found")
    if row["status"] != "pending":
        raise HTTPException(409, f"Donation already {row['status']}")

    try:
        env = TransactionEnvelope.from_xdr(body.signed_xdr, settings.NETWORK_PASSPHRASE)
    except Exception:
        raise HTTPException(400, "Invalid signed transaction")

    # the signed tx must be exactly the one we prepared
    if env.hash_hex() != row["tx_hash"]:
        raise HTTPException(400, "Signed transaction doesn't match this donation")

    try:
        async with ServerAsync(settings.HORIZON_URL) as server:
            await server.submit_transaction(env)
    except BadRequestError as e:
        await db.execute("update donations set status='failed' where id=$1", row["id"])
        codes = (e.extras or {}).get("result_codes", {})
        raise HTTPException(400, f"Payment failed: {codes}")

    await db.execute(
        "update donations set status='confirmed', confirmed_at=now() where id=$1",
        row["id"],
    )
    return {"status": "confirmed", "tx_hash": row["tx_hash"]}


@router.get("/received")
async def received(user=Depends(get_current_creator)):
    rows = await db.fetch(
        """select id, amount_usdc, fan_name, message, tx_hash, confirmed_at
           from donations
           where creator_id = $1 and status = 'confirmed'
           order by confirmed_at desc limit 100""",
        user["id"],
    )
    return [
        {
            "id": str(r["id"]),
            "amount_usdc": str(r["amount_usdc"]),
            "from": r["fan_name"] or "Anonymous",
            "message": r["message"],
            "tx_hash": r["tx_hash"],
            "confirmed_at": r["confirmed_at"],
        }
        for r in rows
    ]
