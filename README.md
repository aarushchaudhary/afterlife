# 🕊️ Afterlife Protocol

**Decentralized Digital Legacy & Multi-Sig Inheritance System**

Afterlife Protocol is a secure, automated system for transferring digital assets and sensitive information to beneficiaries. It combines the trustless nature of **Polygon Blockchain** with the scalability of **Supabase** and the real-time monitoring of a **Python Oracle**.

## 💻 Tech Stack

* **Frontend:** Next.js 15, Tailwind CSS, Lucide React.
* **Web3:** Wagmi, Viem, RainbowKit, Solidity.
* **Backend/Storage:** Supabase, Python (Web3.py).
* **Network:** Polygon Amoy Testnet.

## 🛠️ The Multi-Sig Execution Flow

| Step | Portal | Action | Required Wallet |
| --- | --- | --- | --- |
| **1** | `/user` | Register Vault & Save Note | **Account 1** (Owner) |
| **2** | `/hospital` | Initiate Emergency Protocol | **Account 1** (Hospital) |
| **3** | `/gov` | Approve Death Certificate | **Account 3** (Gov) |
| **4** | `/verifier` | Legal Verification | **Account 4** (Verifier) |
| **5** | `/beneficiary` | Claim & Decrypt Note | **Account 2** (Beneficiary) |

## ⚙️ Setup & Configuration

### 1. Polygon Amoy Setup (Smart Contract)

The backbone of the protocol is the `AfterlifeVault.sol` contract deployed on the **Polygon Amoy Testnet**.

* **Deployment:** Use Remix or Hardhat to deploy to `80002`.
* **Gas Configuration:** Polygon Amoy requires a minimum tip of **25 Gwei**. Ensure your frontend calls include `maxPriorityFeePerGas: parseGwei('30')` and `maxFeePerGas: parseGwei('40')`.
* **Contract Address:** Once deployed, update `frontend/lib/constants.ts` with your new address and the environment variable `NEXT_PUBLIC_CONTRACT_ADDRESS`.

### 2. Supabase Setup (Off-Chain Storage)

Supabase handles the private "Legacy Note" that is too heavy and sensitive for the blockchain.

**Table Schema: `vault_secrets`**

Create a new table in your Supabase dashboard with the following structure:
| Column | Type | Description |
| :--- | :--- | :--- |
| `owner_wallet` | `text` | The address of the deceased (lowercase) |
| `beneficiary_wallet` | `text` | The address of the recipient (lowercase) |
| `encrypted_note` | `text` | The actual legacy data/message |
| `status` | `text` | 'active' or 'unlocked' |

**Row Level Security (RLS)**

For the demo, you must either:
1. **Disable RLS:** Run `ALTER TABLE vault_secrets DISABLE ROW LEVEL SECURITY;` in the SQL Editor.
2. **Add Policy:** Create an "Enable Insert/Select for all" policy to allow the Next.js app to push and pull data without a service role key.

### 3. WalletConnect & RainbowKit Setup

We use **RainbowKit** to bridge the browser to the **MetaMask Mobile App**.

* **Project ID:** Register at [WalletConnect Cloud Dashboard](https://cloud.walletconnect.com/) to get a Project ID. This is required for QR code scanning on mobile devices.
* **Mobile Troubleshooting:** If the mobile app fails to trigger a popup, ensure you are using **Legacy Gas Prices** or manually overriding the gas tip to **30 Gwei** within the MetaMask app settings.

### 4. Python Oracle Setup

The Oracle acts as the "Timekeeper" that monitors the blockchain for the `DeathInitiated` event.

1. **Dependencies:** `pip install web3 python-dotenv`
2. **Provider:** Use an **Alchemy** or **Infura** WSS/HTTP RPC URL.
3. **Function:** The script listens for the Hospital's trigger and starts a 72-hour countdown. If the owner does not "Check-in" (cancel) during this window, the Oracle prepares the system for multi-sig unlocking.

## 📄 Environment Variables

You will need to set up environment variables for the different components of the protocol.

### 1. Contracts (`contracts/.env`)

Create a `.env` file in the `contracts` directory for deploying the smart contract.

```env
# Your EVM wallet private key for deployment
export PRIVATE_KEY=your_private_key_here

# Polygon Amoy RPC URL
export AMOY_RPC_URL=https://rpc-amoy.polygon.technology
```

### 2. Frontend (`frontend/.env.local`)

Create a `.env.local` file in the `frontend` directory. This keeps your API keys secure and accessible to Wagmi and Supabase.

```env
# --- WALLETCONNECT CONFIG ---
# Get this from https://cloud.walletconnect.com/
NEXT_PUBLIC_WC_PROJECT_ID=your_project_id_here

# --- SUPABASE CONFIG ---
# Get these from Settings -> API in your Supabase Dashboard
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key_here

# --- BLOCKCHAIN CONFIG ---
# The address of your deployed AfterlifeVault contract
NEXT_PUBLIC_CONTRACT_ADDRESS=0xF07b3D064c9aad3328975c4655CCC6e9cD746cc2

# (Optional) Alchemy/Infura RPC URL for faster data fetching
# While Wagmi provides default public RPCs, using a private one from Alchemy will prevent "Rate Limit" errors.
NEXT_PUBLIC_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/your_alchemy_key
```

### 3. Python Oracle (`oracle/.env`)

Create a `.env` file in the `oracle` directory.

```env
# Polygon Amoy RPC URL
AMOY_RPC_URL=https://rpc-amoy.polygon.technology

# The address of your deployed AfterlifeVault contract
CONTRACT_ADDRESS=0xF07b3D064c9aad3328975c4655CCC6e9cD746cc2
```

## 🚰 Faucets: How to get Free Amoy POL

Since you are testing a multi-sig with 4 different accounts, you'll need gas in all of them. Use these faucets:

1. **[Alchemy Amoy Faucet](https://www.alchemy.com/faucets/polygon-amoy):** The most reliable. You need an Alchemy account, but it gives you **0.1 POL** daily.
2. **[Polygon Faucet](https://faucet.polygon.technology/):** The official faucet. Select "Amoy" and "POL Token."
3. **[Chainstack Faucet](https://faucet.chainstack.com/polygon-amoy-faucet):** A backup if the others are empty.

> **Pro-Tip:** Once you get POL in **Account 1**, "Send" **0.02 POL** to Accounts 2, 3, and 4 inside MetaMask. That is more than enough for 10+ test transactions each.

## 🚀 Final Checklist Before Demo

* [ ] **Account 1 (Owner):** Has ~0.05 POL.
* [ ] **Account 3 (Gov):** Has ~0.02 POL.
* [ ] **Account 4 (Verifier):** Has ~0.02 POL.
* [ ] **Supabase:** Table `vault_secrets` exists and RLS is disabled (`ALTER TABLE... DISABLE RLS`).
* [ ] **Local Server:** Running on `localhost:3000`.