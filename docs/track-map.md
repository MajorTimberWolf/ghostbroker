# Track Map

## Anchor

### Venice — Private Agents, Trusted Actions

- The product thesis maps directly to this track.
- Private evaluation is not garnish. It is the decision layer for sensitive agent procurement.
- Current live prize pool: `11500 USD equivalent` (VVV tokens).
- Integration: real Venice inference via `zai-org-glm-4.7-flash`, server-side only.

## Primary

### MetaMask — Best Use of Delegations

- Delegated, permission-bounded execution is the core authorization mechanism.
- Real ERC-7715 `erc20-token-periodic` permission requests via MetaMask Flask.
- Honest `simulated` fallback with badge labeling when wallet doesn't support it.
- Current live prize pool: `5000 USD`.

### Uniswap — Agentic Finance

- Settlement is load-bearing.
- Real onchain quote via QuoterV2 contract on Base Sepolia.
- Swap-router execution path wired (WETH wrap + approve + exactInputSingle).
- Current live prize pool: `5000 USD`.

## Strong

### Protocol Labs — Agents With Receipts

- Durable receipts stored via Lighthouse with real Filecoin CIDs.
- Receipt anchors are verifiable on IPFS.
- Missing: ERC-8004 registry interaction, agent.json/agent_log.json manifests.
- Current live prize pool: `4000 USD`.

### Filecoin Foundation — Best Use Case with Agentic Storage

- Receipts pinned to Filecoin/IPFS via Lighthouse SDK.
- Real CIDs generated and displayed in the app.
- Note: track prefers FOC mainnet; we use Lighthouse.
- Current live prize pool: `2000 USD`.

### ENS — ENS Identity

- Agent ENS names displayed throughout the UI (evaluation, delegation, receipt).
- Cosmetic integration: no onchain registration or resolution.
- Current live prize pool: `600 USD`.

## General

### Synthesis Open Track

- Largest prize pool: `28134 USD`.
- No specific tech requirements. Community-funded, judge-contributed.
- Every project should be here.

### Student Founder's Bet (College.xyz)

- 5 x `500 USD` travel grants to ETH conference.
- Judged on idea quality and shipping, not perfect code.
- Requires student status.

## Dropped (no real integration)

- OpenServ — Ship Something Real: not implemented.
- Protocol Labs — Let the Agent Cook: requires full autonomy artifacts we don't have.
- Self — Best Agent ID: not implemented.
- Base — Agent Services: no x402 payment integration.
