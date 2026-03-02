import logging
import os

import algokit_utils

logger = logging.getLogger(__name__)


def deploy() -> None:
    from smart_contracts.artifacts.afterlife_vault.afterlife_vault_client import (
        AfterlifeVaultFactory,
    )

    # Create an AlgorandClient for testnet
    algorand = algokit_utils.AlgorandClient.testnet()

    # Load deployer account from mnemonic env var
    mnemonic = os.environ.get("DEPLOYER_MNEMONIC")
    if not mnemonic:
        raise Exception("DEPLOYER_MNEMONIC environment variable is not set")

    deployer = algorand.account.from_mnemonic(mnemonic=mnemonic)

    # Create factory with deployer as default sender
    factory = AfterlifeVaultFactory(
        algorand,
        default_sender=deployer.address,
        default_signer=deployer.signer,
    )

    # Deploy the contract
    client, deploy_result = factory.deploy(
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
        on_update=algokit_utils.OnUpdate.AppendApp,
    )

    logger.info(
        f"🚀 AfterlifeVault deployed — App ID: {client.app_id}, Address: {client.app_address}"
    )