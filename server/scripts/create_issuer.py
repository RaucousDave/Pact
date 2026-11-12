import httpx
from stellar_sdk import Keypair

kp = Keypair.random()
r = httpx.get(f"https://friendbot.stellar.org/?addr={kp.public_key}", timeout=30)
r.raise_for_status()

print("Funded issuer on testnet.\n")
print(f"USDC_ISSUER={kp.public_key}")
print(f"USDC_ISSUER_SECRET={kp.secret}")