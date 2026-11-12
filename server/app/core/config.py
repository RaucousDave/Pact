from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "FastAPI Server"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True
    SECRET_KEY: str = Field(min_length=32)
    WALLET_ENCRYPTION_KEY: str = Field(min_length=44)
    USDC_ISSUER: str = ""
    ADMIN_PUBLIC: str = ""
    ADMIN_SECRET: str = ""
    RESOLVER_PUBLIC: str = ""
    RESOLVER_SECRET: str = ""
    TRUSTLESS_WORK_API_KEY: str = ""
    TRUSTLESS_WORK_BASE_URL: str = "https://beta.api.trustlesswork.com"
    PLATFORM_PUBLIC: str = ""
    PLATFORM_SECRET: str = ""
    HORIZON_URL: str = "https://horizon-testnet.stellar.org"
    NETWORK_PASSPHRASE: str = "Test SDF Network ; September 2015"

    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str

    # CORS Configuration
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://pact-one-puce.vercel.app"
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
