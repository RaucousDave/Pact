import requests
from stellar_sdk import Keypair


for name in ("ADMIN", "RESOLVER"):
    kp = Keypair.random()
    ok = requests.get(
        "https://friendbot.stellar.org",
        params={"addr": kp.public_key},
    ).status_code == 200
    print(f"{name}_PUBLIC={kp.public_key}\n{name}_SECRET={kp.secret}  # funded: {ok}")
