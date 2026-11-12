import os
from stellar_sdk import Asset, Keypair, Network, Server, TransactionBuilder

kp = Keypair.from_secret(os.environ["WALLET_SECRET"])
usdc = Asset("USDC", os.environ["USDC_ISSUER"])
server = Server("https://horizon-testnet.stellar.org")

tx = (
    TransactionBuilder(server.load_account(kp.public_key),
                       Network.TESTNET_NETWORK_PASSPHRASE, 100)
    .append_change_trust_op(asset=usdc)
    .set_timeout(60).build()
)
tx.sign(kp)
print(server.submit_transaction(tx)["hash"])
