from algopy import (
    ARC4Contract,
    Account,
    BoxMap,
    Txn,
    UInt64,
    urange,  # <-- ADDED URANGE HERE
    arc4,
)

# 1. Recreate the BeneficiaryTarget Struct
class BeneficiaryTarget(arc4.Struct):
    wallet: arc4.Address
    percentage: arc4.UInt64

# 2. Recreate the Vault Struct
class VaultData(arc4.Struct):
    is_active: arc4.Bool
    is_unlocked: arc4.Bool
    hospital_approved: arc4.Bool
    gov_approved: arc4.Bool
    verifier_approved: arc4.Bool
    
    designated_hospital: arc4.Address
    designated_gov: arc4.Address
    designated_verifier: arc4.Address
    
    beneficiaries: arc4.DynamicArray[BeneficiaryTarget]

# 3. The Main Contract
class AfterlifeVault(ARC4Contract):
    def __init__(self) -> None:
        # BoxMap is the equivalent of Solidity's mapping(address => VaultData)
        self.vaults = BoxMap(Account, VaultData)

    @arc4.abimethod
    def create_vault(
        self,
        heir_wallets: arc4.DynamicArray[arc4.Address],
        percentages: arc4.DynamicArray[arc4.UInt64],
        hospital: Account,
        gov: Account,
        verifier: Account
    ) -> None:
        """Initializes a new Afterlife Vault with multiple beneficiaries."""
        assert heir_wallets.length == percentages.length, "Arrays length mismatch"
        
        # Verify percentages equal 100
        total_percentage = UInt64(0)
        for i in urange(percentages.length): # <-- CHANGED TO URANGE
            total_percentage += percentages[i].native
        assert total_percentage == 100, "Percentages must equal 100"

        # Construct the beneficiaries array
        beneficiary_list = arc4.DynamicArray[BeneficiaryTarget]()
        for i in urange(heir_wallets.length): # <-- CHANGED TO URANGE
            target = BeneficiaryTarget(
                wallet=heir_wallets[i], 
                percentage=percentages[i]
            )
            beneficiary_list.append(target.copy())

        # Save to Box Storage (User's Vault)
        self.vaults[Txn.sender] = VaultData(
            is_active=arc4.Bool(True),
            is_unlocked=arc4.Bool(False),
            hospital_approved=arc4.Bool(False),
            gov_approved=arc4.Bool(False),
            verifier_approved=arc4.Bool(False),
            designated_hospital=arc4.Address(hospital),
            designated_gov=arc4.Address(gov),
            designated_verifier=arc4.Address(verifier),
            beneficiaries=beneficiary_list.copy()
        )

    @arc4.abimethod
    def initiate_death(self, owner: Account) -> None:
        """Hospital triggers the protocol (1/3)."""
        vault = self.vaults[owner].copy()
        assert vault.is_active.native, "Vault is not active"
        assert Txn.sender == vault.designated_hospital.native, "Unauthorized: Not the designated hospital"
        
        vault.hospital_approved = arc4.Bool(True)
        self.vaults[owner] = vault.copy() # <-- ADDED .COPY() FOR SAFE ASSIGNMENT

    @arc4.abimethod
    def approve_death(self, owner: Account) -> None:
        """Gov or Verifier provides consensus (2/3 and 3/3)."""
        vault = self.vaults[owner].copy()
        assert vault.is_active.native, "Vault is not active"
        assert vault.hospital_approved.native, "Protocol not initiated by hospital"

        # Check caller identity
        is_gov = Txn.sender == vault.designated_gov.native
        is_verifier = Txn.sender == vault.designated_verifier.native
        assert is_gov or is_verifier, "Unauthorized: Not Gov or Verifier"

        if is_gov:
            vault.gov_approved = arc4.Bool(True)
        if is_verifier:
            vault.verifier_approved = arc4.Bool(True)

        # If 3/3 consensus reached, unlock the vault
        if vault.hospital_approved.native and vault.gov_approved.native and vault.verifier_approved.native:
            vault.is_unlocked = arc4.Bool(True)

        self.vaults[owner] = vault.copy() # <-- ADDED .COPY()

    @arc4.abimethod
    def cancel_death_protocol(self) -> None:
        """Owner's Dead Man Switch to cancel false alarm."""
        owner = Txn.sender
        vault = self.vaults[owner].copy()
        
        assert vault.is_active.native, "Vault is not active"
        assert not vault.is_unlocked.native, "Vault already permanently unlocked"
        
        # Reset the approvals
        vault.hospital_approved = arc4.Bool(False)
        vault.gov_approved = arc4.Bool(False)
        vault.verifier_approved = arc4.Bool(False)
        
        self.vaults[owner] = vault.copy() # <-- ADDED .COPY()

    @arc4.abimethod
    def get_beneficiaries(self, owner: Account) -> arc4.DynamicArray[BeneficiaryTarget]:
        """View function for the frontend to retrieve the heirs array."""
        vault = self.vaults[owner].copy() # <-- ADDED .COPY() TO READ VALUE
        return vault.beneficiaries

    @arc4.abimethod
    def is_vault_unlocked(self, owner: Account) -> bool:
        """View function to check unlock status."""
        vault = self.vaults[owner].copy() # <-- ADDED .COPY() TO READ VALUE
        return vault.is_unlocked.native