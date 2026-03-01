// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AfterlifeVault {
    
    // 1. The Core Data Structure
    struct Vault {
        address owner;
        address beneficiary;
        address hospitalAddress;
        address govAddress;
        address verifierAddress;
        
        uint256 initiationTime; // When the 72-hour clock starts
        
        bool hospitalApproved;
        bool govApproved;
        bool verifierApproved;
        bool isUnlocked;
    }

    // 2. The Database (Mapping owners to their Vault)
    mapping(address => Vault) public vaults;

    // 3. Events (These tell your Python backend when to send emails)
    event VaultCreated(address indexed owner, address beneficiary);
    event ProtocolInitiated(address indexed owner, uint256 timestamp);
    event ApprovalReceived(address indexed owner, address indexed approver);
    event AssetsUnlocked(address indexed owner, address indexed beneficiary);
    event ProtocolCancelled(address indexed owner);

    // 4. Custom Errors (Saves gas compared to require strings)
    error Unauthorized();
    error VaultAlreadyExists();
    error VaultDoesNotExist();
    error TimeWindowExpired();
    error NotInitiatedYet();
    error AlreadyUnlocked();

    // --- MAIN FUNCTIONS ---

    // Step 1: User registers their asset and assigns the 3 keys
    function createVault(
        address _beneficiary,
        address _hospitalAddress,
        address _govAddress,
        address _verifierAddress
    ) external {
        if (vaults[msg.sender].owner != address(0)) revert VaultAlreadyExists();

        vaults[msg.sender] = Vault({
            owner: msg.sender,
            beneficiary: _beneficiary,
            hospitalAddress: _hospitalAddress,
            govAddress: _govAddress,
            verifierAddress: _verifierAddress,
            initiationTime: 0,
            hospitalApproved: false,
            govApproved: false,
            verifierApproved: false,
            isUnlocked: false
        });

        emit VaultCreated(msg.sender, _beneficiary);
    }

    // Step 2: Hospital triggers the 72-hour countdown
    function initiateDeath(address _owner) external {
        Vault storage vault = vaults[_owner];
        if (vault.owner == address(0)) revert VaultDoesNotExist();
        if (msg.sender != vault.hospitalAddress) revert Unauthorized();
        if (vault.isUnlocked) revert AlreadyUnlocked();

        vault.hospitalApproved = true;
        vault.initiationTime = block.timestamp; // Clock starts NOW

        emit ProtocolInitiated(_owner, block.timestamp);
    }

    // Step 3: Government or Verifier provides their cryptographic signature
    function approveDeath(address _owner) external {
        Vault storage vault = vaults[_owner];
        if (vault.owner == address(0)) revert VaultDoesNotExist();
        if (!vault.hospitalApproved) revert NotInitiatedYet();
        if (vault.isUnlocked) revert AlreadyUnlocked();

        // Check if the 72-hour (259200 seconds) window has expired
        if (block.timestamp > vault.initiationTime + 72 hours) {
            revert TimeWindowExpired(); 
        }

        // Verify who is calling the function and mark them approved
        if (msg.sender == vault.govAddress) {
            vault.govApproved = true;
        } else if (msg.sender == vault.verifierAddress) {
            vault.verifierApproved = true;
        } else {
            revert Unauthorized();
        }

        emit ApprovalReceived(_owner, msg.sender);

        // Auto-unlock if consensus is reached
        if (vault.hospitalApproved && vault.govApproved && vault.verifierApproved) {
            vault.isUnlocked = true;
            emit AssetsUnlocked(_owner, vault.beneficiary);
        }
    }

    // Step 4: Beneficiary checks if they can access the off-chain data
    function isClaimable(address _owner) external view returns (bool) {
        return vaults[_owner].isUnlocked;
    }

    function cancelDeathProtocol() external {
        Vault storage vault = vaults[msg.sender];
        require(vault.owner != address(0), "Vault not active");
        require(vault.hospitalApproved, "Protocol not initiated");
        require(block.timestamp < vault.initiationTime + 72 hours, "Too late, 72 hours passed");
        require(!vault.isUnlocked, "Vault already unlocked");

        // Reset the state back to normal
        vault.hospitalApproved = false;
        vault.initiationTime = 0;

        emit ProtocolCancelled(msg.sender);
    }
}