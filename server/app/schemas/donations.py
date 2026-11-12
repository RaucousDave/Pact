from decimal import Decimal

from pydantic import BaseModel, Field, field_validator
from stellar_sdk import Keypair


class PrepareIn(BaseModel):
    handle: str
    fan_public_key: str
    amount_usdc: Decimal = Field(gt=0, le=1000, decimal_places=7)
    fan_name: str | None = Field(None, max_length=40)
    message: str | None = Field(None, max_length=280)

    @field_validator("fan_public_key")
    @classmethod
    def valid_key(cls, v):
        try:
            Keypair.from_public_key(v)
        except Exception:
            raise ValueError("invalid Stellar public key")
        return v


class PrepareOut(BaseModel):
    donation_id: str
    xdr: str
    network_passphrase: str
    send_max_xlm: str


class SubmitIn(BaseModel):
    donation_id: str
    signed_xdr: str
