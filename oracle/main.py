import os
import asyncio
import time
import base64
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from dotenv import load_dotenv

# Algorand Imports
from algosdk.v2client import indexer
from algosdk.abi import Method

# Load environment variables
load_dotenv()

# We no longer need AMOY_RPC_URL or CONTRACT_ADDRESS
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Algorand LocalNet Config
INDEXER_URL = os.getenv("INDEXER_URL", "http://localhost:8980")
INDEXER_TOKEN = os.getenv("INDEXER_TOKEN", "")
APP_ID = int(os.getenv("ALGORAND_APP_ID", 1002)) # Your deployed Vault App ID

# Initialize FastAPI
app = FastAPI(title="Afterlife Oracle (Algorand)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, change this to your Vercel domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize Algorand Indexer
indexer_client = indexer.IndexerClient(INDEXER_TOKEN, INDEXER_URL)

# --- ALGORAND ABI METHOD SELECTORS ---
# We calculate the 4-byte hash of your Python smart contract methods
# so the Oracle knows exactly which function was called in the transaction.
CREATE_VAULT_SEL = Method.from_signature("create_vault(address[],uint64[],account,account,account)void").get_selector()
INITIATE_DEATH_SEL = Method.from_signature("initiate_death(account)void").get_selector()
APPROVE_DEATH_SEL = Method.from_signature("approve_death(account)void").get_selector()
CANCEL_DEATH_SEL = Method.from_signature("cancel_death_protocol()void").get_selector()

# --- DATABASE HANDLERS ---
# Note: Algorand addresses are uppercase Base32 strings. 
# The .lower() has been removed to ensure perfect DB matching with the frontend.

def handle_vault_created(owner: str):
    """Adds a new row to the verification queue when a vault is registered."""
    try:
        data = {
            "owner_wallet": owner,
            "status": "active"
        }
        supabase.table("verification_queue").upsert(data).execute()
        print(f"✅ DB: Vault added to queue for {owner}")
    except Exception as e:
        print(f"❌ DB Error (VaultCreated): {e}")

def handle_protocol_initiated(owner: str):
    """Updates status to 'initiated' so it appears on Gov/Verifier dashboards."""
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        supabase.table("verification_queue").update({
            "status": "initiated",
            "initiated_at": now_iso
        }).eq("owner_wallet", owner).execute()
        print(f"🚨 DB: Queue status updated to INITIATED for {owner}")
    except Exception as e:
        print(f"❌ DB Error (ProtocolInitiated): {e}")

def handle_assets_unlocked(owner: str):
    """Marks queue as unlocked AND unlocks the actual secret note."""
    try:
        # 1. Update the Queue dashboard status
        supabase.table("verification_queue").update({
            "status": "unlocked"
        }).eq("owner_wallet", owner).execute()
        
        # 2. Unlock the actual encrypted note for the beneficiary
        supabase.table("vault_secrets").update({
            "status": "unlocked"
        }).eq("owner_wallet", owner).execute()
        print(f"🔓 DB: Vault successfully UNLOCKED for {owner}")
    except Exception as e:
        print(f"❌ DB Error (AssetsUnlocked): {e}")

def handle_protocol_cancelled(owner: str):
    """Reverts status to 'active' so the Gov/Verifier queues drop the case."""
    try:
        supabase.table("verification_queue").update({
            "status": "active"
        }).eq("owner_wallet", owner).execute()
        print(f"🛑 DB: Protocol CANCELLED by owner {owner}. Queue reset.")
    except Exception as e:
        print(f"❌ DB Error (ProtocolCancelled): {e}")

# --- BLOCKCHAIN LISTENER (ALGORAND INDEXER) ---

async def listen_for_events():
    print(f"Starting Algorand Indexer Listener on App ID {APP_ID}...")
    min_round = 0

    while True:
        try:
            # Fetch recent smart contract interactions
            response = indexer_client.search_transactions(
                application_id=APP_ID,
                min_round=min_round,
                txn_type="appl"
            )
            
            transactions = response.get("transactions", [])
            
            for txn in transactions:
                # Update block tracker
                if txn["confirmed-round"] >= min_round:
                    min_round = txn["confirmed-round"] + 1

                app_txn = txn.get("application-transaction", {})
                app_args = app_txn.get("application-args", [])
                
                if not app_args:
                    continue
                    
                # Decode the method selector from Base64
                called_selector_b64 = app_args[0]
                called_selector_bytes = base64.b64decode(called_selector_b64)
                
                sender = txn["sender"]
                
                # 1. Check for VaultCreated
                if called_selector_bytes == CREATE_VAULT_SEL:
                    print(f"🔍 [Round {txn['confirmed-round']}] VaultCreated detected")
                    handle_vault_created(sender) # Owner is the sender

                # 2. Check for ProtocolInitiated
                elif called_selector_bytes == INITIATE_DEATH_SEL:
                    print(f"🔍 [Round {txn['confirmed-round']}] ProtocolInitiated detected")
                    accounts = app_txn.get("accounts", [])
                    if accounts:
                        handle_protocol_initiated(accounts[0]) # Target owner is passed in accounts array

                # 3. Check for AssetsUnlocked (Triggered by approve_death)
                elif called_selector_bytes == APPROVE_DEATH_SEL:
                    print(f"🔍 [Round {txn['confirmed-round']}] AssetUnlock/Approval detected")
                    accounts = app_txn.get("accounts", [])
                    if accounts:
                        handle_assets_unlocked(accounts[0])

                # 4. Check for ProtocolCancelled
                elif called_selector_bytes == CANCEL_DEATH_SEL:
                    print(f"🔍 [Round {txn['confirmed-round']}] ProtocolCancelled detected")
                    handle_protocol_cancelled(sender)

        except Exception as e:
            print(f"Listener error: {e}")
            
        # Algorand block time is ~2.8s, poll every 3 seconds
        await asyncio.sleep(3)

@app.on_event("startup")
async def startup_event():
    try:
        # Quick ping to make sure the indexer is online
        indexer_client.health()
        print("✅ Successfully connected to Algorand LocalNet Indexer!")
        asyncio.create_task(listen_for_events())
    except Exception as e:
        print(f"❌ Failed to connect to Algorand Indexer: {e}")

@app.get("/health")
def health_check():
    return {"status": "Algorand Indexer is running, syncing blockchain to Supabase."}