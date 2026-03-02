import logging
import os
import algokit_utils

logger = logging.getLogger(__name__)

def deploy() -> None:
    from smart_contracts.artifacts.afterlife_vault.afterlife_vault_client import (
        AfterlifeVaultFactory,
    )

    # 1. Connect to PUBLIC TESTNET (Not LocalNet)
    algorand = algokit_utils.AlgorandClient.testnet()

    # 2. Use your Testnet Wallet
    mnemonic = os.environ.get("DEPLOYER_MNEMONIC")
    if not mnemonic:
        raise Exception("DEPLOYER_MNEMONIC environment variable is not set")

    deployer = algorand.account.from_mnemonic(mnemonic=mnemonic)

    # 3. Create factory
    factory = AfterlifeVaultFactory(
        algorand,
        default_sender=deployer.address,
        default_signer=deployer.signer,
    )

    # 4. Deploy
    client, deploy_result = factory.deploy(
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp, # Safer for Testnet
        on_update=algokit_utils.OnUpdate.AppendApp,
    )

    logger.info(
        f"🌍 AfterlifeVault deployed to TESTNET — App ID: {client.app_id}"
    )