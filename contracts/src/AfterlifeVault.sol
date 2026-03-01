// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AfterlifeVault {

    // Percentage-based beneficiary target
    struct BeneficiaryTarget {
        address wallet;
        uint256 percentage; // Must sum to 100
    }
    
    // 1. The Core Data Structure
    struct Vault {
        address owner;
        BeneficiaryTarget[] beneficiaries;
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
    event VaultCreated(address indexed owner);
    event ProtocolInitiated(address indexed owner, uint256 timestamp);
    event ApprovalReceived(address indexed owner, address indexed approver);
    event AssetsUnlocked(address indexed owner);
    event ProtocolCancelled(address indexed owner);

    // 4. Custom Errors (Saves gas compared to require strings)
    error Unauthorized();
    error VaultAlreadyExists();
    error VaultDoesNotExist();
    error TimeWindowExpired();
    error NotInitiatedYet();
    error AlreadyUnlocked();

    // --- MAIN FUNCTIONS ---

    // Step 1: User registers their asset with multiple heirs and assigns the 3 keys
    function createVault(
        address[] memory _heirWallets,
        uint256[] memory _percentages,
        address _hospitalAddress,
        address _govAddress,
        address _verifierAddress
    ) external {
        if (vaults[msg.sender].owner != address(0)) revert VaultAlreadyExists();
        require(_heirWallets.length == _percentages.length, "Arrays must match");

        // Verify percentages sum to exactly 100
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < _percentages.length; i++) {
            totalPercentage += _percentages[i];
        }
        require(totalPercentage == 100, "Percentages must equal 100");

        Vault storage v = vaults[msg.sender];
        v.owner = msg.sender;
        v.hospitalAddress = _hospitalAddress;
        v.govAddress = _govAddress;
        v.verifierAddress = _verifierAddress;

        for (uint256 i = 0; i < _heirWallets.length; i++) {
            v.beneficiaries.push(BeneficiaryTarget({
                wallet: _heirWallets[i],
                percentage: _percentages[i]
            }));
        }

        emit VaultCreated(msg.sender);
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
            emit AssetsUnlocked(_owner);
        }
    }

    // Step 4: Beneficiary checks if they can access the off-chain data
    function isClaimable(address _owner) external view returns (bool) {
        return vaults[_owner].isUnlocked;
    }

    // Step 5: Read the beneficiary array from the frontend
    function getBeneficiaries(address _owner) external view returns (BeneficiaryTarget[] memory) {
        return vaults[_owner].beneficiaries;
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