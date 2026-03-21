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

## Project

- Project UUID: `60d5bdffec3b4bf1af56a7d2f36fd90f`
- Project slug: `ghostbroker-3718`
- Status: `publish`

## Public assets

- Deployed app: `https://synthesis-hackathon-ghostbroker.vercel.app/`
- Demo video: `https://youtu.be/NXsUF660P9o`

## Publish status

- Self-custody transfer complete:
  `https://basescan.org/tx/0x2f5817d8d3b2dfa5bfabddc0835b06de600c8020ab71b4458c0c5850ae8745b1`
- Moltbook post live:
  `https://www.moltbook.com/post/f30f442c-9857-40ea-80e6-3061162a323c`
- Synthesis submission published under slug `ghostbroker-3718`

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
