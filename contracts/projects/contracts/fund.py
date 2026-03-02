from algosdk.v2client import algod
from algosdk.transaction import PaymentTxn
import algokit_utils

# 1. Connect to your LocalNet
algod_client = algod.AlgodClient("a" * 64, "http://localhost:4001")

# 2. Get the LocalNet Dispenser (the account with unlimited fake ALGOs)
dispenser = algokit_utils.get_localnet_default_account(algod_client)
target_address = "B7LDQMBWOSX56AH2AI65ZSZYMECI25L22YM76F35D5T3TYQETMWQGA6QD4"

# 3. Build and send a transaction for 10 ALGO (10,000,000 microAlgos)
sp = algod_client.suggested_params()
txn = PaymentTxn(dispenser.address, sp, target_address, 10_000_000)
signed_txn = txn.sign(dispenser.private_key)
txid = algod_client.send_transaction(signed_txn)

print(f"✅ Successfully sent 10 ALGO to {target_address}!")
print(f"🔗 Transaction ID: {txid}")