// frontend/lib/constants.ts
import algosdk from 'algosdk';
import abiJson from './AfterlifeVault.arc56.json';

export const ALGORAND_APP_ID = 1002;

export const ALGORAND_NODE_URL = 'http://localhost';
export const ALGORAND_NODE_PORT = 4001;
export const ALGORAND_NODE_TOKEN = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

/** Shared Algod client for direct reads (box lookups, etc.) */
export const algodClient = new algosdk.Algodv2(
    ALGORAND_NODE_TOKEN,
    ALGORAND_NODE_URL,
    ALGORAND_NODE_PORT,
);

/** Build an ABIContract from the ARC56 JSON (for use with AtomicTransactionComposer) */
export function getABIContract(): algosdk.ABIContract {
    return new algosdk.ABIContract({
        name: abiJson.name,
        methods: abiJson.methods.map((m) => ({
            name: m.name,
            args: m.args.map((a) => ({ type: a.type, name: a.name })),
            returns: { type: m.returns.type },
        })),
    });
}

/**
 * Encode the box key used by the contract's `vaults` BoxMap.
 * The prefix is "vaults" (decoded from the base64 in the ABI: "dmF1bHRz")
 * followed by the 32-byte public key of the owner address.
 */
export function encodeVaultBoxKey(ownerAddress: string): Uint8Array {
    const prefix = new TextEncoder().encode('vaults');
    const addrBytes = algosdk.decodeAddress(ownerAddress).publicKey;
    const key = new Uint8Array(prefix.length + addrBytes.length);
    key.set(prefix);
    key.set(addrBytes, prefix.length);
    return key;
}