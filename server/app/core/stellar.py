from decimal import Decimal, ROUND_UP

from stellar_sdk import Asset, ServerAsync, TransactionBuilder
from stellar_sdk.exceptions import NotFoundError

from app.core.config import settings

XLM = Asset.native()
USDC = Asset("USDC", settings.USDC_ISSUER)
SLIPPAGE = Decimal("1.05")  # 5% buffer on send_max


class FanAccountError(Exception): ...
class NoPathError(Exception): ...


def fmt(d: Decimal) -> str:
    return format(d, "f")


def _to_asset(a: dict) -> Asset:
    if a["asset_type"] == "native":
        return Asset.native()
    return Asset(a["asset_code"], a["asset_issuer"])


async def build_tip_tx(fan_pk: str, creator_pk: str, amount_usdc: Decimal):
    """Fan pays XLM, creator receives exactly amount_usdc in USDC."""
    async with ServerAsync(settings.HORIZON_URL) as server:
        try:
            account = await server.load_account(fan_pk)
        except NotFoundError:
            raise FanAccountError()

        resp = await server.strict_receive_paths(
            source=[XLM],
            destination_asset=USDC,
            destination_amount=fmt(amount_usdc),
        ).call()
        records = resp["_embedded"]["records"]
        if not records:
            raise NoPathError()

        best = min(records, key=lambda r: Decimal(r["source_amount"]))
        path = [_to_asset(a) for a in best["path"]]
        send_max = (Decimal(best["source_amount"]) * SLIPPAGE).quantize(
            Decimal("0.0000001"), rounding=ROUND_UP
        )

        tx = (
            TransactionBuilder(
                source_account=account,
                network_passphrase=settings.NETWORK_PASSPHRASE,
                base_fee=100,
            )
            .append_path_payment_strict_receive_op(
                destination=creator_pk,
                send_asset=XLM,
                send_max=fmt(send_max),
                dest_asset=USDC,
                dest_amount=fmt(amount_usdc),
                path=path,
            )
            .set_timeout(300)
            .build()
        )
        return tx.to_xdr(), tx.hash_hex(), send_max
