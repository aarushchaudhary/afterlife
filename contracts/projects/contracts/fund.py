import os
import algokit_utils
from algosdk.v2client import algod
from algosdk.transaction import PaymentTxn
from dotenv import load_dotenv

load_dotenv()

# 1. Configuration
# Your Testnet/LocalNet address from .env or manual entry
TARGET_ADDRESS = "5QFX5GTR43LHTYRKDPASITAFJKXHF6HA7HIUVZQD2VZCDEA75GN3BXGG6M"
ALGOD_URL = "http://localhost:4001"
ALGOD_TOKEN = "a" * 64

def fund_localnet():
    try:
        algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_URL)
        # Check if LocalNet is actually running
        algod_client.health()
        
        dispenser = algokit_utils.get_localnet_default_account(algod_client)
        sp = algod_client.suggested_params()
        
        # Fund 100 ALGO (100,000,000 microAlgos)
        txn = PaymentTxn(dispenser.address, sp, TARGET_ADDRESS, 100_000_000)
        signed_txn = txn.sign(dispenser.private_key)
        txid = algod_client.send_transaction(signed_txn)
        
        print(f"✅ Successfully sent 100 ALGO to {TARGET_ADDRESS} on LocalNet!")
        print(f"🔗 Transaction ID: {txid}")
    except Exception as e:
        print(f"❌ LocalNet funding failed: {e}")
        print("\n💡 TIP: If you are trying to fund TESTNET, visit:")
        print("   https://bank.testnet.algorand.network/")
        print(f"   and paste your address: {TARGET_ADDRESS}")

if __name__ == "__main__":
    print(f"🏦 Afterlife Funding Tool")
    print(f"📍 Target Address: {TARGET_ADDRESS}\n")
    fund_localnet()