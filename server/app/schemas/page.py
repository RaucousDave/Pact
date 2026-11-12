from typing import Annotated, Literal
from urllib.parse import urlparse

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints
from pydantic.alias_generators import to_camel

from app.core.config import settings


def _check_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ValueError("URL must start with http:// or https://")
    return value


Color = Annotated[
    str,
    StringConstraints(pattern=r"^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$"),
]
SafeUrl = Annotated[
    str,
    StringConstraints(max_length=2048),
    AfterValidator(_check_url),
]


def _check_asset_url(value: str) -> str:
    _check_url(value)
    prefix = (
        f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/public/page-assets/"
    )
    if not value.startswith(prefix):
        raise ValueError("Images must be uploaded through the asset endpoint")
    return value


AssetUrl = Annotated[
    str,
    StringConstraints(max_length=2048),
    AfterValidator(_check_asset_url),
]
Amount = Annotated[str, StringConstraints(pattern=r"^\d{1,9}(\.\d{1,7})?$")]
Id = Annotated[str, StringConstraints(min_length=1, max_length=64)]


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
    )


class SolidBg(CamelModel):
    type: Literal["solid"]
    color: Color


class GradientBg(CamelModel):
    type: Literal["gradient"]
    from_: Color = Field(alias="from")
    to: Color
    angle: int = Field(ge=0, le=360)


class ImageBg(CamelModel):
    type: Literal["image"]
    image_url: AssetUrl
    overlay_opacity: float = Field(ge=0, le=1)


Background = Annotated[
    SolidBg | GradientBg | ImageBg,
    Field(discriminator="type"),
]


class ThemeColors(CamelModel):
    text: Color
    muted_text: Color
    accent: Color
    card_background: Color
    card_text: Color
    card_border: Color


class ProfileTheme(CamelModel):
    preset_id: Id
    background: Background
    colors: ThemeColors
    font: Literal["dm-sans", "manrope", "instrument-serif"]
    card_style: Literal["filled", "outline", "soft"]
    corner_style: Literal["square", "rounded", "pill"]
    spacing: Literal["compact", "comfortable"]
    motion: Literal["none", "gentle", "expressive"]


class SocialLink(CamelModel):
    id: Id
    platform: Literal[
        "instagram",
        "tiktok",
        "youtube",
        "x",
        "linkedin",
        "github",
        "website",
    ]
    url: SafeUrl
    label: str | None = Field(default=None, max_length=40)


class Appearance(CamelModel):
    emphasis: Literal["default", "featured"] | None = None
    animation: Literal["inherit", "none", "lift", "pulse"] | None = None


class BlockBase(CamelModel):
    id: Id
    visible: bool = True
    appearance: Appearance | None = None


class LinkBlock(BlockBase):
    type: Literal["link"]
    title: str = Field(max_length=100)
    url: SafeUrl
    description: str | None = Field(default=None, max_length=200)
    thumbnail_url: AssetUrl | None = None


class HeadingBlock(BlockBase):
    type: Literal["heading"]
    text: str = Field(max_length=100)


class TextBlock(BlockBase):
    type: Literal["text"]
    text: str = Field(max_length=1000)


class ImageBlock(BlockBase):
    type: Literal["image"]
    image_url: AssetUrl
    alt: str = Field(max_length=200)
    caption: str | None = Field(default=None, max_length=200)
    link_url: SafeUrl | None = None


class TipBlock(BlockBase):
    type: Literal["tip"]
    title: str = Field(max_length=100)
    description: str | None = Field(default=None, max_length=200)
    preset_amounts: list[Amount] = Field(max_length=6)
    allow_custom_amount: bool


class CommissionBlock(BlockBase):
    type: Literal["commission"]
    commission_id: Id


ProfileBlock = Annotated[
    LinkBlock | HeadingBlock | TextBlock | ImageBlock | TipBlock | CommissionBlock,
    Field(discriminator="type"),
]


class PageUpdateReq(CamelModel):
    theme: ProfileTheme
    social_links: list[SocialLink] = Field(max_length=10)
    blocks: list[ProfileBlock] = Field(max_length=50)
