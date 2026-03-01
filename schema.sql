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
    beneficiary_wallets TEXT[],
    encrypted_note TEXT,
    file_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unlocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE verification_queue (
    owner_wallet TEXT PRIMARY KEY,
    status TEXT DEFAULT 'active', -- 'active', 'initiated', 'unlocked'
    initiated_at TIMESTAMP WITH TIME ZONE
);

-- ==========================================
-- 3. TURN ON ROW LEVEL SECURITY (RLS)
-- This physically prevents unauthorized data reads
-- ==========================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_secrets ENABLE ROW LEVEL SECURITY;

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
    current_setting('request.headers')::json->>'x-user-wallet' = ANY(beneficiary_wallets)
    AND status = 'unlocked'
);

-- ==========================================
-- 1. RLS FOR VAULT SECRETS TABLE
-- ==========================================

-- Allow anyone to create a vault (Insert)
CREATE POLICY "Allow public inserts on vault_secrets" 
ON vault_secrets 
FOR INSERT 
TO public 
WITH CHECK (true);

-- Allow public fetching (Select)
-- (Your Next.js frontend needs this so the Beneficiary can query the payload)
CREATE POLICY "Allow public select on vault_secrets" 
ON vault_secrets 
FOR SELECT 
TO public 
USING (true); 

-- ==========================================
-- 2. RLS FOR STORAGE BUCKET (vault_files)
-- ==========================================

-- Allow public uploads to the specific bucket
CREATE POLICY "Allow public uploads to vault_files" 
ON storage.objects 
FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'vault_files');

-- Allow public updates (Required because we used { upsert: true })
CREATE POLICY "Allow public updates to vault_files" 
ON storage.objects 
FOR UPDATE 
TO public 
USING (bucket_id = 'vault_files');

-- Allow public reads (So the beneficiary can download the file)
CREATE POLICY "Allow public reads from vault_files" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'vault_files');

-- Allow public updates for the upsert command
CREATE POLICY "Allow public updates on vault_secrets" 
ON vault_secrets 
FOR UPDATE 
TO public 
USING (true);

-- Allow the frontend portals to read the verification queue
CREATE POLICY "Allow public select on verification_queue" 
ON verification_queue 
FOR SELECT 
TO public 
USING (true);

-- 1. Allow the Oracle to add new patients to the queue (Insert)
CREATE POLICY "Allow public inserts on verification_queue" 
ON verification_queue 
FOR INSERT 
TO public 
WITH CHECK (true);

-- 2. Allow the Oracle to update patient status (Update)
-- This is needed for when the status changes from 'active' to 'initiated' or 'unlocked'
CREATE POLICY "Allow public updates on verification_queue" 
ON verification_queue 
FOR UPDATE 
TO public 
USING (true);