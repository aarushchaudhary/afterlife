-- ==========================================
-- 1. CREATE THE ROLES TABLE
-- Maps wallet addresses to their specific portals
-- ==========================================
CREATE TABLE roles (
    wallet_address TEXT PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('citizen', 'hospital', 'government', 'verifier'))
);

-- ==========================================
-- 2. CREATE THE VAULT SECRETS TABLE (The "users" table)
-- Stores the off-chain private data
-- ==========================================
CREATE TABLE vault_secrets (
    owner_wallet TEXT PRIMARY KEY,
    beneficiary_wallet TEXT NOT NULL,
    encrypted_note TEXT,
    file_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unlocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE verification_queue (
    owner_wallet TEXT PRIMARY KEY,
    beneficiary_wallet TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'initiated', 'unlocked'
    initiated_at TIMESTAMP WITH TIME ZONE
);

-- ==========================================
-- 3. TURN ON ROW LEVEL SECURITY (RLS)
-- This physically prevents unauthorized data reads
-- ==========================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_secrets ADD COLUMN file_url TEXT;

-- ==========================================
-- 4. RLS POLICIES FOR 'ROLES'
-- Anyone connecting their wallet needs to know their role for routing.
-- ==========================================
CREATE POLICY "Public read access for routing" 
ON roles FOR SELECT 
USING (true); 

-- ==========================================
-- 5. RLS POLICIES FOR 'VAULT SECRETS'
-- The absolute core of your privacy model.
-- ==========================================

-- Policy A: Owners can read and write their own data
CREATE POLICY "Owners can manage their vault" 
ON vault_secrets FOR ALL 
USING (owner_wallet = current_setting('request.headers')::json->>'x-user-wallet');

-- Policy B: Beneficiaries can ONLY read the data IF the status is 'unlocked'
CREATE POLICY "Beneficiaries can read unlocked vaults" 
ON vault_secrets FOR SELECT 
USING (
    beneficiary_wallet = current_setting('request.headers')::json->>'x-user-wallet' 
    AND status = 'unlocked'
);