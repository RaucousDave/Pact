import os
import sys
from stellar_sdk import Asset, Keypair, Network, Server, TransactionBuilder

dest, amount = sys.argv[1], sys.argv[2]
issuer = Keypair.from_secret(os.environ["ISSUER_SECRET"])
usdc = Asset("USDC", issuer.public_key)
server = Server("https://horizon-testnet.stellar.org")

tx = (
    TransactionBuilder(server.load_account(issuer.public_key),
                       Network.TESTNET_NETWORK_PASSPHRASE, 100)
    .append_payment_op(destination=dest, asset=usdc, amount=amount)
    .set_timeout(60).build()
)
tx.sign(issuer)
print(server.submit_transaction(tx)["hash"])
