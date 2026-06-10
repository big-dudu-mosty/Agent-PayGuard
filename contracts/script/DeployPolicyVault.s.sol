// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {PolicyVault} from "../src/PolicyVault.sol";

interface Vm {
    function envAddress(string calldata key) external view returns (address);
    function envUint(string calldata key) external view returns (uint256);
    function startBroadcast() external;
    function stopBroadcast() external;
}

contract DeployPolicyVault {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external returns (PolicyVault vault) {
        address agent = vm.envAddress("AGENT_ADDRESS");
        uint256 maxPerTx = vm.envUint("MAX_PER_TX_WEI");
        uint256 dailyLimit = vm.envUint("DAILY_LIMIT_WEI");

        vm.startBroadcast();
        vault = new PolicyVault(agent, maxPerTx, dailyLimit);
        vm.stopBroadcast();
    }
}

