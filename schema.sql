CREATE TABLE roles (
    wallet_address TEXT PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('citizen', 'hospital', 'government', 'verifier'))
);

CREATE TABLE vault_secrets (
    owner_wallet TEXT PRIMARY KEY,
    beneficiary_wallets TEXT[],
    encrypted_note TEXT,
    file_url TEXT, -- This will now store your S3 objectKey
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unlocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE verification_queue (
    owner_wallet TEXT PRIMARY KEY,
    status TEXT DEFAULT 'active',
    initiated_at TIMESTAMP WITH TIME ZONE
);