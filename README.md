# 🕊️ Afterlife Protocol

**Decentralized Digital Legacy & Multi-Sig Inheritance System**

Afterlife Protocol is a secure, automated system for transferring digital assets and sensitive information to beneficiaries. It combines the trustless nature of the **Algorand Blockchain** with the scalability of **AWS (RDS & S3)** and the real-time monitoring of a **Python Oracle** on EC2.

## 💻 Tech Stack

* **Frontend:** Next.js 15, Tailwind CSS, Lucide React.
* **Web3:** `algosdk`, PeraWallet, Defly, Lute, Python Smart Contracts (Puya).
* **Backend/Storage:** AWS RDS (PostgreSQL), AWS S3, AWS Lambda.
* **Oracle:** Built in Python (FastAPI), running on AWS EC2, indexing Algorand Application calls.
* **Network:** Algorand Testnet / LocalNet.

## 🛠️ The Multi-Sig Execution Flow

| Step | Portal | Action | Required Wallet |
| --- | --- | --- | --- |
| **1** | `/user` | Register Vault & Save Note | **Account 1** (Owner) |
| **2** | `/hospital` | Initiate Emergency Protocol | **Account 1** (Hospital) |
| **3** | `/gov` | Approve Death Certificate | **Account 3** (Gov) |
| **4** | `/verifier` | Legal Verification | **Account 4** (Verifier) |
| **5** | `/beneficiary` | Claim & Decrypt Note | **Account 2** (Beneficiary) |

## 🏗️ System Architecture & Data Flow

The Afterlife Protocol utilizes a hybrid Web2/Web3 architecture. State changes are strictly enforced on the Algorand blockchain, while a real-time Python Oracle indexes these application calls to trigger off-chain metadata updates in AWS RDS.

```mermaid
sequenceDiagram
    autonumber
    
    actor User as Citizen (Pera Wallet)
    participant UI as Next.js Frontend
    participant DB as AWS (S3 & RDS)
    participant SC as Algorand Contract
    participant Oracle as Python Oracle (EC2)
    actor Auth as Designated Authorities
    actor Heir as Beneficiary

    rect rgb(30, 41, 59)
    note right of User: Phase 1: Secure Registration
    User->>UI: Enter Heirs, Percentages & Legacy File
    UI->>DB: Encrypt & upload file to S3 Bucket
    DB-->>UI: Return S3 object key
    UI->>DB: Save `encrypted_note` & S3 `file_url` into RDS
    UI->>User: Request Pera Wallet Signature
    User->>SC: `create_vault(...)`
    SC-->>Oracle: Algorand Indexer detects transaction
    Oracle->>DB: Insert owner into `verification_queue` (Status: Active)
    end

    rect rgb(69, 10, 10)
    note right of User: Phase 2: Emergency Protocol
    Auth->>SC: Hospital calls `initiate_death(owner)`
    SC-->>Oracle: Indexer detects `initiate_death`
    Oracle->>DB: Update queue to `status: initiated`
    end

    rect rgb(6, 78, 59)
    note right of User: Phase 3: Hybrid Consensus
    Auth->>SC: Gov / Verifier call `approve_death(owner)`
    SC-->>Oracle: Indexer detects `approve_death` (3/3 local box state unlocked)
    Oracle->>DB: Update queue & vault_secrets to `status: unlocked`
    end

    rect rgb(88, 28, 135)
    note right of User: Phase 4: Beneficiary Claim
    Heir->>UI: Connect Wallet & Request Claim
    UI->>SC: Check Application Box for Unlocked Status
    SC-->>UI: Confirm Access Granted
    UI->>DB: Query AWS RDS `vault_secrets` for payload
    DB-->>UI: Return `encrypted_note` & `file_url`
    UI-->>Heir: Render Decrypted Vault & Generate S3 Presigned URL
    end
```

> 📁 **API Documentation:** The Oracle's OpenAPI spec is available at [`docs/openapi.json`](docs/openapi.json). Run the oracle locally or on EC2 and visit `/docs` for the interactive Swagger UI.

## ⚙️ Setup & Configuration

### 1. Algorand Setup (Smart Contract)

The backbone of the protocol is the Algorand Smart Contract built with **AlgoKit & Python (Puya)**.

* **Deployment:** Use `algokit` to compile and deploy to LocalNet or Testnet.
* **Environment:** Update `frontend/lib/constants.ts` with your deployed `ALGORAND_APP_ID`.

### 2. AWS Setup (Database & Storage)

AWS handles the private "Legacy Note" that is too heavy and sensitive for the blockchain.

**Table Schema (PostgreSQL on AWS RDS)**

Create tables using the provided schemas:
* `roles (wallet_address, role)`
* `vault_secrets (owner_wallet, beneficiary_wallets[], encrypted_note, file_url, status, created_at)`
* `verification_queue (owner_wallet, status, initiated_at)`

**S3 Storage (Files)**

* Configure an S3 Bucket with appropriate IAM roles to allow bucket uploads (multipart via presigned URLs if needed) and downloads.

### 3. Wallet Setup

We use **@txnlab/use-wallet** for connecting directly using **Pera Wallet**, **Defly**, and **Lute**.

### 4. Python Oracle

The Oracle runs on **AWS EC2** and is awakened by **AWS Lambda** when needed.
1. **Dependencies:** `pip install fastapi psycopg2-binary algosdk python-dotenv uvicorn`
2. **Provider:** Connects to standard **Algorand Indexers** (`testnet-idx.algonode.cloud`).
3. **Function:** Indexes application transactions and syncs the multi-sig approval states to AWS RDS.

## 📄 Environment Variables

### 1. Frontend (`frontend/.env.local` or `.env`)

```env
# --- AWS CONFIG ---
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
S3_BUCKET_NAME=your_bucket_name
DATABASE_URL=postgres://user:password@rdshost:5432/dbname

# --- ORACLE / AWS LAMBDA ---
NEXT_PUBLIC_LAMBDA_WAKE_URL=https://<lambda-id>.lambda-url.ap-south-1.on.aws/
NEXT_PUBLIC_ORACLE_URL=http://<ec2-ip>:8000
```

### 2. Python Oracle (`oracle/.env`)

```env
# Algorand Testnet Indexer URL
INDEXER_URL=https://testnet-idx.algonode.cloud
INDEXER_TOKEN=

# The App ID of the deployed Algorand Contract
ALGORAND_APP_ID=756429590

# AWS RDS Connection
DATABASE_URL=postgres://user:password@rdshost:5432/dbname
```

## 🚰 Faucets: How to get Free Algorand Testnet ALGO

Since you are testing a multi-sig with 4 different accounts, you'll need gas for all. Use these faucets to fund your Pera/Defly wallets:

1. **[Algorand Bank Faucet](https://bank.testnet.algorand.network/):** The official faucet.
2. **[AlgoNode Dispenser](https://dispenser.testnet.aws.algodev.network/):** Great reliable backup.

> **Pro-Tip:** Fund **Account 1** with test ALGO, then distribute minimum balances to the Hospital, Gov, and Verifier wallets to cover transaction fees.

## 🚀 Final Checklist Before Demo

* [ ] **Account 1 (Owner):** Funded with Testnet ALGO.
* [ ] **Account 3 (Gov) & Account 4 (Verifier):** Funded for approval transactions.
* [ ] **AWS S3 & RDS:** Configured and `DATABASE_URL` is correct.
* [ ] **Oracle EC2 / Lambda:** Running and accessible.
* [ ] **Local Server:** Running on `localhost:3000`.