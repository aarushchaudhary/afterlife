import os
import asyncio
import time
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # 1. IMPORT THIS
from web3 import Web3
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

RPC_URL = os.getenv("AMOY_RPC_URL")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Initialize FastAPI
app = FastAPI(title="Afterlife Oracle")

# 2. ADD THIS ENTIRE BLOCK
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, change this to your Vercel domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(RPC_URL))

# Expanded ABI to listen to all 3 major lifecycle events
CONTRACT_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "address", "name": "owner", "type": "address"},
            {"indexed": False, "internalType": "address", "name": "beneficiary", "type": "address"}
        ],
        "name": "VaultCreated",
        "type": "event"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "address", "name": "owner", "type": "address"},
            {"indexed": False, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "name": "ProtocolInitiated",
        "type": "event"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "address", "name": "owner", "type": "address"},
            {"indexed": True, "internalType": "address", "name": "beneficiary", "type": "address"}
        ],
        "name": "AssetsUnlocked",
        "type": "event"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "address", "name": "owner", "type": "address"}
        ],
        "name": "ProtocolCancelled",
        "type": "event"
    }
]

if CONTRACT_ADDRESS:
    contract = w3.eth.contract(address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=CONTRACT_ABI)

# --- DATABASE HANDLERS ---

def handle_vault_created(owner: str, beneficiary: str):
    """Adds a new row to the verification queue when a vault is registered."""
    try:
        data = {
            "owner_wallet": owner.lower(),
            "beneficiary_wallet": beneficiary.lower(),
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
        }).eq("owner_wallet", owner.lower()).execute()
        print(f"🚨 DB: Queue status updated to INITIATED for {owner}")
    except Exception as e:
        print(f"❌ DB Error (ProtocolInitiated): {e}")

def handle_assets_unlocked(owner: str):
    """Marks queue as unlocked AND unlocks the actual secret note."""
    try:
        # 1. Update the Queue dashboard status
        supabase.table("verification_queue").update({
            "status": "unlocked"
        }).eq("owner_wallet", owner.lower()).execute()
        
        # 2. Unlock the actual encrypted note for the beneficiary
        supabase.table("vault_secrets").update({
            "status": "unlocked"
        }).eq("owner_wallet", owner.lower()).execute()
        print(f"🔓 DB: Vault successfully UNLOCKED for {owner}")
    except Exception as e:
        print(f"❌ DB Error (AssetsUnlocked): {e}")

def handle_protocol_cancelled(owner: str):
    """Reverts status to 'active' so the Gov/Verifier queues drop the case."""
    try:
        supabase.table("verification_queue").update({
            "status": "active"
        }).eq("owner_wallet", owner.lower()).execute()
        print(f"🛑 DB: Protocol CANCELLED by owner {owner}. Queue reset.")
    except Exception as e:
        print(f"❌ DB Error (ProtocolCancelled): {e}")

# --- BLOCKCHAIN LISTENER ---

async def listen_for_events():
    print("Starting blockchain listener (Indexer Mode) on Polygon Amoy...")
    last_checked_block = w3.eth.block_number

    while True:
        try:
            current_block = w3.eth.block_number
            if current_block > last_checked_block:
                
                # 1. Check for VaultCreated
                created_logs = contract.events.VaultCreated.get_logs(from_block=last_checked_block + 1, to_block=current_block)
                for event in created_logs:
                    handle_vault_created(event['args']['owner'], event['args']['beneficiary'])

                # 2. Check for ProtocolInitiated
                initiated_logs = contract.events.ProtocolInitiated.get_logs(from_block=last_checked_block + 1, to_block=current_block)
                for event in initiated_logs:
                    handle_protocol_initiated(event['args']['owner'])

                # 3. Check for AssetsUnlocked
                unlocked_logs = contract.events.AssetsUnlocked.get_logs(from_block=last_checked_block + 1, to_block=current_block)
                for event in unlocked_logs:
                    handle_assets_unlocked(event['args']['owner'])

                # 4. Check for ProtocolCancelled
                cancelled_logs = contract.events.ProtocolCancelled.get_logs(from_block=last_checked_block + 1, to_block=current_block)
                for event in cancelled_logs:
                    handle_protocol_cancelled(event['args']['owner'])
                    
                last_checked_block = current_block
            
            await asyncio.sleep(5)

        except Exception as e:
            print(f"Listener error: {e}")
            await asyncio.sleep(10)

@app.on_event("startup")
async def startup_event():
    if w3.is_connected():
        print("✅ Successfully connected to Polygon Amoy!")
        asyncio.create_task(listen_for_events())
    else:
        print("❌ Failed to connect to Polygon Amoy. Check your RPC URL.")

@app.get("/health")
def health_check():
    return {"status": "Indexer is running, syncing blockchain to Supabase."}