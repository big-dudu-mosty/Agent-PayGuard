// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {PolicyVault} from "../src/PolicyVault.sol";

interface Vm {
    function deal(address account, uint256 newBalance) external;
    function prank(address sender) external;
    function expectRevert(bytes4 errorSelector) external;
    function expectEmit(bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData, address emitter)
        external;
    function warp(uint256 newTimestamp) external;
}

contract PolicyVaultTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    address private constant AGENT = address(0xA11CE);
    address private constant NEW_AGENT = address(0xA22CE);
    address payable private constant RECIPIENT = payable(address(0xB0B));
    address payable private constant NOT_WHITELISTED = payable(address(0xBAD));
    address private constant ATTACKER = address(0xE11E);

    event PaymentExecuted(
        address indexed agent,
        address indexed to,
        uint256 amount,
        uint256 day,
        uint256 dailySpentAfter,
        string memo
    );

    function testConstructorSetsPolicyAndReceivesFunds() external {
        PolicyVault vault = _deployFundedVault();
        PolicyVault.Policy memory policy = vault.getPolicy();

        _assertEq(policy.owner, address(this), "owner");
        _assertEq(policy.agent, AGENT, "agent");
        _assertEq(policy.maxPerTx, 1 ether, "maxPerTx");
        _assertEq(policy.dailyLimit, 3 ether, "dailyLimit");
        _assertEq(address(vault).balance, 10 ether, "vault balance");
        _assertTrue(vault.allowedActions(uint8(PolicyVault.ActionType.PAYMENT)), "payment action");
    }

    function testOwnerCanSetAgent() external {
        PolicyVault vault = _deployFundedVault();

        vault.setAgent(NEW_AGENT);

        PolicyVault.Policy memory policy = vault.getPolicy();
        _assertEq(policy.agent, NEW_AGENT, "new agent");
        _assertTrue(!policy.revoked, "revoked reset");
    }

    function testNonOwnerCannotSetLimits() external {
        PolicyVault vault = _deployFundedVault();

        vm.prank(ATTACKER);
        vm.expectRevert(PolicyVault.NotOwner.selector);
        vault.setLimits(2 ether, 4 ether);
    }

    function testAgentCanPayWhitelistedRecipientWithinLimits() external {
        PolicyVault vault = _deployFundedVault();
        vault.setWhitelist(RECIPIENT, true);

        uint256 beforeBalance = RECIPIENT.balance;

        vm.prank(AGENT);
        vault.executePayment(RECIPIENT, 0.5 ether, "valid payment");

        _assertEq(RECIPIENT.balance, beforeBalance + 0.5 ether, "recipient balance");

        (, uint256 spent) = vault.getDailySpent();
        _assertEq(spent, 0.5 ether, "daily spent");
    }

    function testPaymentEmitsEvent() external {
        PolicyVault vault = _deployFundedVault();
        vault.setWhitelist(RECIPIENT, true);
        uint256 day = block.timestamp / 1 days;

        vm.expectEmit(true, true, false, true, address(vault));
        emit PaymentExecuted(AGENT, RECIPIENT, 0.5 ether, day, 0.5 ether, "event payment");

        vm.prank(AGENT);
        vault.executePayment(RECIPIENT, 0.5 ether, "event payment");
    }

    function testPaymentAbovePerTxLimitReverts() external {
        PolicyVault vault = _deployFundedVault();
        vault.setWhitelist(RECIPIENT, true);

        vm.prank(AGENT);
        vm.expectRevert(PolicyVault.ExceedsMaxPerTx.selector);
        vault.executePayment(RECIPIENT, 2 ether, "too much");
    }

    function testPaymentAboveDailyLimitReverts() external {
        PolicyVault vault = _deployFundedVault();
        vault.setWhitelist(RECIPIENT, true);

        vm.prank(AGENT);
        vault.executePayment(RECIPIENT, 1 ether, "first");

        vm.prank(AGENT);
        vault.executePayment(RECIPIENT, 1 ether, "second");

        vm.prank(AGENT);
        vault.executePayment(RECIPIENT, 1 ether, "third");

        vm.prank(AGENT);
        vm.expectRevert(PolicyVault.ExceedsDailyLimit.selector);
        vault.executePayment(RECIPIENT, 0.1 ether, "exceeds daily");
    }

    function testDailyLimitResetsOnNextDay() external {
        PolicyVault vault = _deployFundedVault();
        vault.setWhitelist(RECIPIENT, true);

        vm.prank(AGENT);
        vault.executePayment(RECIPIENT, 1 ether, "today");

        vm.warp(block.timestamp + 1 days);

        (uint256 day, uint256 spent) = vault.getDailySpent();
        _assertEq(day, block.timestamp / 1 days, "new day");
        _assertEq(spent, 0, "spent reset");

        vm.prank(AGENT);
        vault.executePayment(RECIPIENT, 1 ether, "tomorrow");
    }

    function testNonWhitelistedRecipientReverts() external {
        PolicyVault vault = _deployFundedVault();

        vm.prank(AGENT);
        vm.expectRevert(PolicyVault.RecipientNotWhitelisted.selector);
        vault.executePayment(NOT_WHITELISTED, 0.1 ether, "not whitelisted");
    }

    function testUnauthorizedCallerCannotExecutePayment() external {
        PolicyVault vault = _deployFundedVault();
        vault.setWhitelist(RECIPIENT, true);

        vm.prank(ATTACKER);
        vm.expectRevert(PolicyVault.NotAgent.selector);
        vault.executePayment(RECIPIENT, 0.1 ether, "attacker");
    }

    function testPausedAgentCannotExecutePayment() external {
        PolicyVault vault = _deployFundedVault();
        vault.setWhitelist(RECIPIENT, true);
        vault.pauseAgent(true);

        vm.prank(AGENT);
        vm.expectRevert(PolicyVault.AgentPausedError.selector);
        vault.executePayment(RECIPIENT, 0.1 ether, "paused");
    }

    function testRevokedAgentCannotExecutePayment() external {
        PolicyVault vault = _deployFundedVault();
        vault.setWhitelist(RECIPIENT, true);
        vault.revokeAgent();

        vm.prank(AGENT);
        vm.expectRevert(PolicyVault.AgentRevokedError.selector);
        vault.executePayment(RECIPIENT, 0.1 ether, "revoked");
    }

    function testDisabledPaymentActionReverts() external {
        PolicyVault vault = _deployFundedVault();
        vault.setWhitelist(RECIPIENT, true);
        vault.setAllowedAction(uint8(PolicyVault.ActionType.PAYMENT), false);

        vm.prank(AGENT);
        vm.expectRevert(PolicyVault.ActionNotAllowed.selector);
        vault.executePayment(RECIPIENT, 0.1 ether, "disabled");
    }

    function testIsAllowedReturnsReason() external {
        PolicyVault vault = _deployFundedVault();

        vm.prank(AGENT);
        (bool allowed, string memory reason) = vault.isAllowed(NOT_WHITELISTED, 0.1 ether);

        _assertTrue(!allowed, "not allowed");
        _assertEq(reason, "NOT_WHITELISTED", "reason");
    }

    function testIsAllowedForNonAgentCaller() external {
        PolicyVault vault = _deployFundedVault();
        vault.setWhitelist(RECIPIENT, true);

        (bool allowed, string memory reason) = vault.isAllowedFor(ATTACKER, RECIPIENT, 0.1 ether);

        _assertTrue(!allowed, "non-agent not allowed");
        _assertEq(reason, "NOT_AGENT", "reason");
    }

    function testIsAllowedForAgentWithinPolicy() external {
        PolicyVault vault = _deployFundedVault();
        vault.setWhitelist(RECIPIENT, true);

        // Called by owner without prank: identity comes from the explicit caller arg.
        (bool allowed, string memory reason) = vault.isAllowedFor(AGENT, RECIPIENT, 0.5 ether);

        _assertTrue(allowed, "agent allowed");
        _assertEq(reason, "OK", "reason ok");
    }

    function testIsAllowedMatchesIsAllowedFor() external {
        PolicyVault vault = _deployFundedVault();
        vault.setWhitelist(RECIPIENT, true);

        vm.prank(AGENT);
        (bool allowedLegacy,) = vault.isAllowed(RECIPIENT, 0.5 ether);
        (bool allowedExplicit,) = vault.isAllowedFor(AGENT, RECIPIENT, 0.5 ether);

        _assertTrue(allowedLegacy == allowedExplicit, "wrapper equivalence");
    }

    function testOwnerCanWithdraw() external {
        PolicyVault vault = _deployFundedVault();
        address payable sink = payable(address(0xCAFE));

        vault.ownerWithdraw(sink, 4 ether);

        _assertEq(sink.balance, 4 ether, "withdrawn");
        _assertEq(address(vault).balance, 6 ether, "vault remainder");
    }

    function testOwnerWithdrawNotLimitedByAgentPolicy() external {
        PolicyVault vault = _deployFundedVault();
        address payable sink = payable(address(0xCAFE));

        // 10 ether vault, maxPerTx is only 1 ether: owner is not bound by agent limits.
        vault.ownerWithdraw(sink, 10 ether);

        _assertEq(address(vault).balance, 0, "vault drained by owner");
    }

    function testOwnerCanWithdrawAfterRevoke() external {
        PolicyVault vault = _deployFundedVault();
        vault.revokeAgent();

        address payable sink = payable(address(0xCAFE));
        vault.ownerWithdraw(sink, 10 ether);

        _assertEq(address(vault).balance, 0, "funds never locked");
    }

    function testNonOwnerCannotWithdraw() external {
        PolicyVault vault = _deployFundedVault();

        vm.prank(ATTACKER);
        vm.expectRevert(PolicyVault.NotOwner.selector);
        vault.ownerWithdraw(payable(ATTACKER), 1 ether);
    }

    function testWithdrawAboveBalanceReverts() external {
        PolicyVault vault = _deployFundedVault();

        vm.expectRevert(PolicyVault.InsufficientBalance.selector);
        vault.ownerWithdraw(payable(address(0xCAFE)), 11 ether);
    }

    function testWithdrawZeroAmountReverts() external {
        PolicyVault vault = _deployFundedVault();

        vm.expectRevert(PolicyVault.InsufficientBalance.selector);
        vault.ownerWithdraw(payable(address(0xCAFE)), 0);
    }

    function testWithdrawToZeroAddressReverts() external {
        PolicyVault vault = _deployFundedVault();

        vm.expectRevert(PolicyVault.InvalidConfig.selector);
        vault.ownerWithdraw(payable(address(0)), 1 ether);
    }

    function _deployFundedVault() internal returns (PolicyVault vault) {
        vm.deal(address(this), 100 ether);
        vault = new PolicyVault{value: 10 ether}(AGENT, 1 ether, 3 ether);
    }

    function _assertTrue(bool condition, string memory message) internal pure {
        if (!condition) revert(message);
    }

    function _assertEq(address actual, address expected, string memory message) internal pure {
        if (actual != expected) revert(message);
    }

    function _assertEq(uint256 actual, uint256 expected, string memory message) internal pure {
        if (actual != expected) revert(message);
    }

    function _assertEq(string memory actual, string memory expected, string memory message) internal pure {
        if (keccak256(bytes(actual)) != keccak256(bytes(expected))) revert(message);
    }
}

