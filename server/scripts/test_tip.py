import os
import requests
from stellar_sdk import Keypair, TransactionEnvelope

API = "http://localhost:8000/api/v1/donations"
fan = Keypair.from_secret(os.environ["FAN_SECRET"])

prep = requests.post(f"{API}/prepare", json={
    "handle": "limitless",
    "fan_public_key": fan.public_key,
    "amount_usdc": "1",
    "fan_name": "Treasure",
    "message": "loved last week's video",
}).json()
print("prepared:", prep["donation_id"], prep["send_max_xlm"], "XLM max")

env = TransactionEnvelope.from_xdr(prep["xdr"], prep["network_passphrase"])
env.sign(fan)

res = requests.post(f"{API}/submit", json={
    "donation_id": prep["donation_id"],
    "signed_xdr": env.to_xdr(),
})
print(res.status_code, res.json())
