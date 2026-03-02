// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/AfterlifeVault.sol";

contract DeployVault is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        AfterlifeVault vault = new AfterlifeVault();
        vm.stopBroadcast();
        
        console.log("Afterlife Vault deployed to:", address(vault));
    }
}
