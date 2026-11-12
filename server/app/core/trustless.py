import httpx
from stellar_sdk import Keypair, TransactionEnvelope

from app.core.config import settings


class TrustlessError(Exception):
    def __init__(self, status: int, detail: str):
        super().__init__(detail)
        self.status, self.detail = status, detail


async def _post(path: str, body: dict) -> dict:
    try:
        async with httpx.AsyncClient(
            base_url=settings.TRUSTLESS_WORK_BASE_URL,
            headers={"x-api-key": settings.TRUSTLESS_WORK_API_KEY},
            timeout=60,
        ) as client:
            response = await client.post(path, json=body)
    except httpx.HTTPError as error:
        raise TrustlessError(502, "Could not reach the escrow service") from error
    if response.status_code >= 400:
        raise TrustlessError(response.status_code, response.text)
    try:
        return response.json()
    except ValueError as error:
        raise TrustlessError(502, "Escrow service returned invalid JSON") from error


async def build_deploy(
    *, engagement_id: str, title: str, amount, client: str, creator: str
):
    return await _post(
        "/escrow/single-release/v2/deploy",
        {
            "signer": settings.PLATFORM_PUBLIC,
            "engagementId": engagement_id,
            "title": title[:60],
            "description": f"Pact commission: {title}"[:200],
            "amount": float(amount),
            "platformFee": 0,
            "roles": {
                "approvers": [client],
                "serviceProviders": [creator],
                "platform": settings.PLATFORM_PUBLIC,
                "releaseSigners": [settings.PLATFORM_PUBLIC],
                "disputeResolvers": [settings.RESOLVER_PUBLIC],
                "receiver": creator,
                "admin": settings.ADMIN_PUBLIC,
            },
            "milestones": [
                {"description": "Deliver the commission", "approvalsTarget": 1}
            ],
            "trustline": {"symbol": "USDC", "address": settings.USDC_ISSUER},
        },
    )


async def build_fund(contract_id: str, signer: str, amount):
    return await _post(
        "/escrow/single-release/v2/fund",
        {"contractId": contract_id, "signer": signer, "amount": float(amount)},
    )


async def send_transaction(signed_xdr: str):
    return await _post("/stellar/send-transaction", {"signedXdr": signed_xdr})


def sign_with(secret: str, xdr: str) -> str:
    envelope = TransactionEnvelope.from_xdr(xdr, settings.NETWORK_PASSPHRASE)
    envelope.sign(Keypair.from_secret(secret))
    return envelope.to_xdr()
