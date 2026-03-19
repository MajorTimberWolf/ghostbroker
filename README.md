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
