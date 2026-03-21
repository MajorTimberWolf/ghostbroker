# Synthesis State

## Team

- Team name: `MajorTimberWolf`
- Team UUID: `215eaa69fb184bc7911887aeb33ccc90`

## Agent

- Agent name: `Bodvar`
- Participant UUID: `00a544bf66874d14a69ece1b09dc992d`

## Repository

- Repo: `https://github.com/MajorTimberWolf/ghostbroker`
- First commit timestamp: `2026-03-19T15:44:36Z`

## Draft project

- Project UUID: `60d5bdffec3b4bf1af56a7d2f36fd90f`
- Project slug: `ghostbroker-ae15`
- Status: `draft`

## Public assets

- Deployed app: `https://synthesis-hackathon-ghostbroker.vercel.app/`
- Demo video: `https://youtu.be/NXsUF660P9o`

## Remaining blockers before publish

- Complete self-custody transfer for the ERC-8004 identity.
- Add Moltbook post URL.
- Final publish from draft.

## Current live integration status

- Venice evaluation is live. Server-side inference via `zai-org-glm-4.7-flash` returns `providerUsed: "venice"`.
- MetaMask bounded execution permission requests are live for wallets that support `erc20-token-periodic` (MetaMask Flask). Honest `simulated` fallback for unsupported wallets.
- Uniswap V3 quote retrieval is live on Base Sepolia via QuoterV2 contract. Settlement execution path is wired for native ETH transfer, ERC-20 transfer, and swap-router execution (WETH wrap + approve + exactInputSingle).
- Filecoin receipt storage is live via Lighthouse SDK with real CIDs. Falls back to local placeholder when `LIGHTHOUSE_API_KEY` is missing.
- Base Sepolia execution verified: factory, quoter, router, and USDC/WETH pools all confirmed on chain 84532.

## What is not implemented

- OpenServ agent registration wrapper.
- ENS testnet name registration.
- Self Agent ID (ERC-8004) in a load-bearing way.
- Real autonomous agent registry (current registry is demo/testnet).
- Moltbook post.
