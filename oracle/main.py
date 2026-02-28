import os
import asyncio
from fastapi import FastAPI
from web3 import Web3
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

RPC_URL = os.getenv("AMOY_RPC_URL")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")

# Initialize FastAPI
app = FastAPI(title="Afterlife Oracle")

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(RPC_URL))

# We only need the ABI for the specific event we are listening for to save space
CONTRACT_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "address", "name": "owner", "type": "address"},
            {"indexed": False, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "name": "ProtocolInitiated",
        "type": "event"
    }
]

# Connect the contract
if CONTRACT_ADDRESS:
    contract = w3.eth.contract(address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=CONTRACT_ABI)

def send_emergency_alerts(owner_wallet: str, timestamp: int):
    """
    This is where your Web2 logic goes. 
    In a real app, you trigger an email API (like Resend or SMTP) here.
    """
    print("\n" + "="*50)
    print("🚨 AFTERLIFE PROTOCOL INITIATED 🚨")
    print(f"User Wallet: {owner_wallet}")
    print(f"Timestamp: {timestamp}")
    print("Action: Sending URGENT emails to Government and Verifier portals...")
    print("="*50 + "\n")
    
    # Example: requests.post("https://api.resend.com/emails", data={...})

async def listen_for_events():
    """Background task that polls the blockchain for new events."""
    print("Starting blockchain listener on Polygon Amoy...")
    
    # Create a filter to look for new ProtocolInitiated events from the latest block
    event_filter = contract.events.ProtocolInitiated.create_filter(fromBlock='latest')
    
    while True:
        try:
            # Check for new events
            new_entries = event_filter.get_new_entries()
            for event in new_entries:
                owner = event['args']['owner']
                timestamp = event['args']['timestamp']
                send_emergency_alerts(owner, timestamp)
                
            # Wait 3 seconds before checking again (prevents rate-limiting)
            await asyncio.sleep(3)
            
        except Exception as e:
            print(f"Listener error: {e}")
            await asyncio.sleep(5) # Back off if there's a network glitch

# Start the listener when the FastAPI server starts
@app.on_event("startup")
async def startup_event():
    if w3.is_connected():
        print("✅ Successfully connected to Polygon Amoy!")
        # Run the listener in the background
        asyncio.create_task(listen_for_events())
    else:
        print("❌ Failed to connect to Polygon Amoy. Check your RPC URL.")

# A simple health check endpoint
@app.get("/health")
def health_check():
    return {"status": "Oracle is running, watching the blockchain."}