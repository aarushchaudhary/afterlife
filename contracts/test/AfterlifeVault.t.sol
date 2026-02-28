// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AfterlifeVault.sol";

contract AfterlifeVaultTest is Test {
    AfterlifeVault vault;
    
    // Mock wallet addresses for our actors
    address owner = address(1);
    address beneficiary = address(2);
    address hospital = address(3);
    address gov = address(4);
    address verifier = address(5);

    function setUp() public {
        vault = new AfterlifeVault();
    }

    function test_FullAfterlifeProtocolFlow() public {
        // 1. Owner registers the vault
        vm.prank(owner); // Simulates the next transaction coming from 'owner'
        vault.createVault(beneficiary, hospital, gov, verifier);

        // 2. Hospital initiates the protocol
        vm.prank(hospital);
        vault.initiateDeath(owner);

        // 3. Move time forward by 24 hours (86400 seconds)
        skip(24 hours);

        // 4. Gov and Verifier approve
        vm.prank(gov);
        vault.approveDeath(owner);
        vm.prank(verifier);
        vault.approveDeath(owner);

        // 5. Assert that the vault is now unlocked!
        assertTrue(vault.isClaimable(owner));
    }

    function test_CannotApproveAfter72Hours() public {
        vm.prank(owner);
        vault.createVault(beneficiary, hospital, gov, verifier);

        vm.prank(hospital);
        vault.initiateDeath(owner);

        // Move time forward by 73 hours (This should cause the next approvals to fail)
        skip(73 hours);

        vm.prank(gov);
        vm.expectRevert(AfterlifeVault.TimeWindowExpired.selector);
        vault.approveDeath(owner);
    }
}