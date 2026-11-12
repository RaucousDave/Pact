from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class CommissionIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=60)
    description: str = Field(min_length=1, max_length=300)
    price_usdc: Decimal = Field(gt=0, le=10000, decimal_places=7)
    delivery_days: int = Field(ge=1, le=90)
