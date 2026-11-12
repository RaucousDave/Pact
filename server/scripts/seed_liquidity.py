import os

from stellar_sdk import Asset, Keypair, Network, Server, TransactionBuilder


issuer = Keypair.from_secret(os.environ["USDC_ISSUER_SECRET"])
usdc = Asset("USDC", issuer.public_key)
server = Server("https://horizon-testnet.stellar.org")

tx = (
    TransactionBuilder(
        server.load_account(issuer.public_key),
        Network.TESTNET_NETWORK_PASSPHRASE,
        100,
    )
    .append_manage_sell_offer_op(
        selling=usdc,
        buying=Asset.native(),
        amount="100000",
        price="8",
    )
    .set_timeout(60)
    .build()
)
tx.sign(issuer)
print(server.submit_transaction(tx)["hash"])
