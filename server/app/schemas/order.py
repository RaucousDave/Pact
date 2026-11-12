from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator
from stellar_sdk import Keypair


class OrderPrepareIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    commission_id: UUID
    client_public_key: str
    client_name: str = Field(min_length=1, max_length=40)
    client_contact: str | None = Field(None, max_length=80)
    client_note: str | None = Field(None, max_length=500)

    @field_validator("client_public_key")
    @classmethod
    def valid_key(cls, value: str) -> str:
        try:
            Keypair.from_public_key(value)
        except Exception as error:
            raise ValueError("invalid Stellar public key") from error
        return value


class OrderSubmitIn(BaseModel):
    signed_xdr: str
