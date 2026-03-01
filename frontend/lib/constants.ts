// frontend/lib/constants.ts
export const AFTERLIFE_CONTRACT_ADDRESS = "0x51fC81A0ffF7275D5f0Bc5B0B96A159725825CB7";

export const AFTERLIFE_ABI = [
    {
        "inputs": [
            { "internalType": "address[]", "name": "_heirWallets", "type": "address[]" },
            { "internalType": "uint256[]", "name": "_percentages", "type": "uint256[]" },
            { "internalType": "address", "name": "_hospitalAddress", "type": "address" },
            { "internalType": "address", "name": "_govAddress", "type": "address" },
            { "internalType": "address", "name": "_verifierAddress", "type": "address" }
        ],
        "name": "createVault",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "_owner", "type": "address" }],
        "name": "initiateDeath",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "_owner", "type": "address" }],
        "name": "approveDeath",
        "outputs": [],
        "stateMutability": "nonpayable",
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
        "inputs": [],
        "name": "cancelDeathProtocol",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "_owner", "type": "address" }],
        "name": "getBeneficiaries",
        "outputs": [
            {
                "internalType": "struct AfterlifeVault.BeneficiaryTarget[]",
                "name": "",
                "type": "tuple[]",
                "components": [
                    { "internalType": "address", "name": "wallet", "type": "address" },
                    { "internalType": "uint256", "name": "percentage", "type": "uint256" }
                ]
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "name": "vaults",
        "outputs": [
            { "internalType": "address", "name": "owner", "type": "address" },
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