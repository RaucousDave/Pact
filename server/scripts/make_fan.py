import requests
from stellar_sdk import Keypair

kp = Keypair.random()
r = requests.get("https://friendbot.stellar.org", params={"addr": kp.public_key})
print("funded:", r.status_code == 200)
print("public:", kp.public_key)
print("secret:", kp.secret)
