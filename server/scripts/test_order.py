import os

import requests
from stellar_sdk import Keypair, TransactionEnvelope

API = "http://localhost:8000/api/v1"
client = Keypair.from_secret(os.environ["FAN_SECRET"])

response = requests.post(
    f"{API}/orders/prepare",
    timeout=120,
    json={
        "commission_id": os.environ["COMMISSION_ID"],
        "client_public_key": client.public_key,
        "client_name": "Test Client",
        "client_note": "hello",
    },
)
print("prepare:", response.status_code, response.text[:300])
response.raise_for_status()
prepared = response.json()

envelope = TransactionEnvelope.from_xdr(
    prepared["xdr"], prepared["network_passphrase"]
)
envelope.sign(client)
fund_response = requests.post(
    f"{API}/orders/{prepared['order_id']}/submit-fund",
    json={"signed_xdr": envelope.to_xdr()},
    timeout=120,
)
print("fund:", fund_response.status_code, fund_response.text)
fund_response.raise_for_status()
print(requests.get(f"{API}/orders/{prepared['order_id']}", timeout=30).json())
