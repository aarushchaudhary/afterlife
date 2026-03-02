import logging

import algokit_utils

logger = logging.getLogger(__name__)


def deploy() -> None:
    from smart_contracts.artifacts.afterlife_vault.afterlife_vault_client import (
        AfterlifeVaultFactory,
    )

    # Create an AlgorandClient for the local network
    algorand = algokit_utils.AlgorandClient.default_localnet()

    # Get (or create) a deployer account on localnet
    deployer = algorand.account.localnet_dispenser()

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