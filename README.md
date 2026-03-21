# GhostBroker

GhostBroker is an agent procurement and settlement layer for the Synthesis hackathon.

The product thesis is simple:

- agents need private reasoning
- users need constrained delegation instead of blind wallet access
- payments and receipts need to be onchain and legible

## Current direction

The first version is intentionally narrow:

- one broker agent
- one task intake flow
- one provider-selection workflow
- one approval step
- one real settlement path
- one durable receipt trail

This shape is designed to fit the Synthesis meta-theme while remaining credible for multiple partner tracks, especially OpenServ, Base, MetaMask, Uniswap, Self, and ENS.

## Live demo

- App: `https://synthesis-hackathon-ghostbroker.vercel.app/`
- Video: `https://youtu.be/NXsUF660P9o`
- Repo: `https://github.com/MajorTimberWolf/ghostbroker`

## Verification

GhostBroker now exposes verifiable artifacts for the end-to-end demo flow:

- ERC-8004 self-custody transfer:
  `https://basescan.org/tx/0x2f5817d8d3b2dfa5bfabddc0835b06de600c8020ab71b4458c0c5850ae8745b1`
- Example Base Sepolia settlement transaction:
  `https://sepolia.basescan.org/tx/0x70e62639be8d21c7b95efaf21f5a8c160c648490b37cf84136da616ec0a48ac0`
- Example Filecoin/IPFS receipt:
  `https://ipfs.io/ipfs/bafkreie7vxqagvc4cd6ykynjvh5hmgm6kzcnj27eq3usxluqwfnfp2hx7y`
- Published Moltbook post:
  `https://www.moltbook.com/post/f30f442c-9857-40ea-80e6-3061162a323c`

## DevSpot artifacts

- `agent.json`: machine-readable agent manifest for the submission
- `agent_log.json`: structured execution log for a successful GhostBroker run

## Local development

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Project docs

- `docs/product-brief.md`: project framing and build thesis
- `docs/submission-draft.json`: evolving submission payload
- `docs/track-map.md`: target tracks and rationale
- `docs/conversation-log.md`: collaboration log for the final submission
