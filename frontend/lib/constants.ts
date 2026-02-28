// frontend/lib/constants.ts
export const AFTERLIFE_CONTRACT_ADDRESS = "0xF07b3D064c9aad3328975c4655CCC6e9cD746cc2";

export const AFTERLIFE_ABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "_beneficiary", "type": "address" },
            { "internalType": "address", "name": "_hospitalAddress", "type": "address" },
            { "internalType": "address", "name": "_govAddress", "type": "address" },
            { "internalType": "address", "name": "_verifierAddress", "type": "address" }
        ],
        "name": "createVault",
        "outputs": [],
        "stateMutability": "external",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "_owner", "type": "address" }],
        "name": "initiateDeath",
        "outputs": [],
        "stateMutability": "external",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "_owner", "type": "address" }],
        "name": "approveDeath",
        "outputs": [],
        "stateMutability": "external",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "_owner", "type": "address" }],
        "name": "isClaimable",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "name": "vaults",
        "outputs": [
            { "internalType": "address", "name": "owner", "type": "address" },
            { "internalType": "address", "name": "beneficiary", "type": "address" },
            { "internalType": "address", "name": "hospitalAddress", "type": "address" },
            { "internalType": "address", "name": "govAddress", "type": "address" },
            { "internalType": "address", "name": "verifierAddress", "type": "address" },
            { "internalType": "uint256", "name": "initiationTime", "type": "uint256" },
            { "internalType": "bool", "name": "hospitalApproved", "type": "bool" },
            { "internalType": "bool", "name": "govApproved", "type": "bool" },
            { "internalType": "bool", "name": "verifierApproved", "type": "bool" },
            { "internalType": "bool", "name": "isUnlocked", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
] as const;