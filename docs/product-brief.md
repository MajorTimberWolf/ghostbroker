# GhostBroker Product Brief

## One-line pitch

GhostBroker helps humans and agents hire specialist agents for sensitive onchain work without leaking context or handing over unrestricted wallet control.

## Problem

Current agent workflows break down at the point where trust becomes expensive:

- private requirements should not be broadcast to every tool or provider
- users should not have to hand over full wallet control to get useful automation
- agent work is hard to verify, price, and settle cleanly
- receipts and reputation are usually fragmented across chats, wallets, and offchain logs

## Product shape

GhostBroker acts as a procurement and escrow layer:

1. A user submits a scoped task and a budget ceiling.
2. The broker evaluates candidate specialist agents.
3. Sensitive reasoning stays private where possible.
4. The user approves a narrow delegated action.
5. The chosen specialist executes.
6. Payment, receipt, and outcome are recorded for future trust.

## Intended hackathon posture

Anchor on one credible workflow and make integrations load-bearing.

Anchor track:

- Venice

Primary target tracks:

- MetaMask Delegations
- Uniswap API
- OpenServ
- Base Agent Services

Strong tracks:

- Protocol Labs Agents With Receipts
- Protocol Labs Let the Agent Cook
- Self Agent ID

Qualifier tracks:

- Filecoin Foundation
- ENS Identity

## MVP boundary

Not building:

- a broad marketplace
- generalized autonomous trading
- every sponsor integration at once

Building:

- a single compelling end-to-end procurement run
- private evaluation first, then delegated approval, then onchain settlement
