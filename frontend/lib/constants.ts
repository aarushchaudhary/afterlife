// frontend/lib/constants.ts
export const AFTERLIFE_CONTRACT_ADDRESS = "0xF07b3D064c9aad3328975c4655CCC6e9cD746cc2";

export const AFTERLIFE_ABI = [
    "function createVault(address _beneficiary, address _hospitalAddress, address _govAddress, address _verifierAddress) external",
    "function initiateDeath(address _owner) external",
    "function approveDeath(address _owner) external",
    "function isClaimable(address _owner) external view returns (bool)",
    "function vaults(address) external view returns (address owner, address beneficiary, address hospitalAddress, address govAddress, address verifierAddress, uint256 initiationTime, bool hospitalApproved, bool govApproved, bool verifierApproved, bool isUnlocked)"
] as const;