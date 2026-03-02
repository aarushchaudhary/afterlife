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
import algosdk
from algosdk.v2client import indexer
from algosdk.abi import Method, ABIType

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Algorand LocalNet Config
INDEXER_URL = os.getenv("INDEXER_URL", "https://testnet-idx.algonode.cloud")
INDEXER_TOKEN = os.getenv("INDEXER_TOKEN", "")
APP_ID = int(os.getenv("ALGORAND_APP_ID", 756429590))

# Initialize FastAPI
app = FastAPI(title="Afterlife Oracle (Algorand)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
indexer_client = indexer.IndexerClient(INDEXER_TOKEN, INDEXER_URL)

CREATE_VAULT_SEL = Method.from_signature("create_vault(address[],uint64[],address,address,address)void").get_selector()
INITIATE_DEATH_SEL = Method.from_signature("initiate_death(address)void").get_selector()
APPROVE_DEATH_SEL = Method.from_signature("approve_death(address)void").get_selector()
CANCEL_DEATH_SEL = Method.from_signature("cancel_death_protocol()void").get_selector()

def handle_vault_created(owner: str):
    try:
        supabase.table("verification_queue").upsert({"owner_wallet": owner, "status": "active"}).execute()
        print(f"✅ DB: Vault added to queue for {owner}")
    except Exception as e:
        print(f"❌ DB Error (VaultCreated): {e}")

def handle_protocol_initiated(owner: str):
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        supabase.table("verification_queue").update({"status": "initiated", "initiated_at": now_iso}).eq("owner_wallet", owner).execute()
        print(f"🚨 DB: Queue status updated to INITIATED for {owner}")
    except Exception as e:
        print(f"❌ DB Error (ProtocolInitiated): {e}")

def handle_approve_death(owner: str):
    try:
        pubkey = algosdk.encoding.decode_address(owner)
        box_name = b"vaults" + pubkey
        
        try:
            box_response = indexer_client.application_box_by_name(APP_ID, box_name)
        except Exception as e:
            if "no application boxes found" in str(e).lower():
                print(f"   ⚠️ Box no longer exists for {owner} (likely cancelled). Skipping.")
                return
            raise e
            
        box_value_b64 = box_response.get("value")
        if not box_value_b64:
            return
            
        box_value = base64.b64decode(box_value_b64)
        vault_abi = ABIType.from_string("(bool,bool,bool,bool,bool,address,address,address,(address,uint64)[])")
        decoded_vault = vault_abi.decode(box_value)
        
        is_unlocked = decoded_vault[1] 

        if is_unlocked:
            # Update Queue
            q_res = supabase.table("verification_queue").update({"status": "unlocked"}).eq("owner_wallet", owner).execute()
            # Update Secrets
            v_res = supabase.table("vault_secrets").update({"status": "unlocked"}).eq("owner_wallet", owner).execute()
            
            # Diagnostic logs
            print(f"Queue Update Response: {q_res.data}")
            print(f"Secrets Update Response: {v_res.data}")
            
            if len(v_res.data) == 0:
                print(f"⚠️ WARNING: Supabase updated 0 rows in vault_secrets! The user '{owner}' does not exist in the vault_secrets table.")
            else:
                print(f"🔓 DB SUCCESS: 3/3 Consensus Reached! Vault FULLY UNLOCKED for {owner}")
        else:
            print(f"⚖️ DB UPDATE: Approval logged for {owner}, but consensus not yet 3/3. Status remains 'initiated'.")

    except Exception as e:
        print(f"❌ DB ERROR (ApproveDeath): {e}")

def handle_protocol_cancelled(owner: str):
    try:
        supabase.table("verification_queue").update({"status": "active"}).eq("owner_wallet", owner).execute()
        print(f"🛑 DB: Protocol CANCELLED by owner {owner}. Queue reset.")
    except Exception as e:
        print(f"❌ DB Error (ProtocolCancelled): {e}")

async def listen_for_events():
    print(f"🚀 Starting Algorand Indexer Listener on App ID {APP_ID}...")
    min_round = 0

    while True:
        try:
            response = indexer_client.search_transactions(application_id=APP_ID, min_round=min_round, txn_type="appl")
            transactions = response.get("transactions", [])
            
            for txn in transactions:
                if txn["confirmed-round"] >= min_round:
                    min_round = txn["confirmed-round"] + 1

                app_txn = txn.get("application-transaction", {})
                app_args = app_txn.get("application-args", [])
                
                if not app_args:
                    continue
                    
                called_selector_b64 = app_args[0]
                called_selector_bytes = base64.b64decode(called_selector_b64)
                sender = txn["sender"]
                
                if called_selector_bytes == CREATE_VAULT_SEL:
                    print(f"🔍 [Round {txn['confirmed-round']}] VaultCreated detected")
                    handle_vault_created(sender)
                
                elif called_selector_bytes == INITIATE_DEATH_SEL:
                    if len(app_args) > 1:
                        owner_addr = algosdk.encoding.encode_address(base64.b64decode(app_args[1]))
                        handle_protocol_initiated(owner_addr)
                
                elif called_selector_bytes == APPROVE_DEATH_SEL:
                    print(f"🔍 [Round {txn['confirmed-round']}] 🎯 MATCH: AssetUnlock/Approval!")
                    if len(app_args) > 1:
                        owner_addr = algosdk.encoding.encode_address(base64.b64decode(app_args[1]))
                        handle_approve_death(owner_addr)
                
                elif called_selector_bytes == CANCEL_DEATH_SEL:
                    handle_protocol_cancelled(sender)

        except Exception as e:
            print(f"❌ Listener error: {e}")
            
        await asyncio.sleep(3)

@app.on_event("startup")
async def startup_event():
    try:
        indexer_client.health()
        print("✅ Successfully connected to Algorand LocalNet Indexer!")
        asyncio.create_task(listen_for_events())
    except Exception as e:
        print(f"❌ Failed to connect to Algorand Indexer: {e}")

@app.get("/health")
def health_check():
    return {"status": "Algorand Indexer is running, syncing blockchain to Supabase."}