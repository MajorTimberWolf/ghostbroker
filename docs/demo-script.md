# GhostBroker demo video script

Target length: 2-3 minutes.
Tone: conversational, honest, no hype. Show what's real, name what's simulated.

---

## Pre-recording setup

- Chrome with MetaMask Flask, Smart Account on Base Sepolia (chain 84532)
- Wallet funded with ~0.1 ETH on Base Sepolia
- `localhost:3000` running (`npm run dev`)
- Clear browser state (or click "Start a new task" to reset)
- Screen recording at 1920x1080, browser zoomed to 100%

---

## Script

### Opening (camera or voiceover, ~15s)

> Agents are getting good at doing work. What they're bad at is getting hired.
>
> If I want an agent to do something sensitive -- move money, handle private data, act on my behalf -- I have to either trust it completely or not use it at all. There's no middle ground.
>
> GhostBroker is that middle ground. It's a procurement layer: I describe a task, it privately evaluates which agents fit, I approve a bounded permission, and the whole thing settles onchain with a durable receipt.
>
> Let me show you how it works.

### Step 1: Intake (~20s)

*Show: the intake form at `/`, already visible.*

> This is the intake form. I'm hiring an agent to do a token swap on Base Sepolia.

*Type or show pre-filled:*
- Title: "Swap ETH to USDC on Base"
- Objective: "Convert 0.03 ETH to USDC using the best available DEX route on Base Sepolia"
- Budget: 0.03
- Funding token: ETH
- Urgency: Today
- Confidentiality: Standard

> I set the funding token to ETH and the budget to 0.03. That's a real amount on Base Sepolia testnet.

*Click "Run private evaluation".*

> The evaluation request goes to our server, which calls Venice AI privately. My task details never hit the client bundle -- the reasoning happens server-side.

*Wait for evaluation to complete (~8-9s). The loading state shows "Running private evaluation..."*

### Step 2: Evaluate (~25s)

*Navigate to `/evaluate` (via the stepper or the "View evaluation" link).*

> Here are the results. That green "Venice" badge means this ranking came from real Venice inference, not a local stub.

*Pause on the broker memo.*

> The broker wrote a private memo explaining its reasoning. Each candidate gets a score, a verdict, and specific rationales.

*Scroll through candidates. Point out the testnet provider pool banner.*

> We're honest about the fact that these agent identities come from a testnet registry. The evaluation logic is real; the providers are demo agents for now.

*Click the top-ranked candidate to select it. The card gets a blue border and a "SELECTED" badge.*

> I'll go with the top pick. Click "Configure delegation."

### Step 3: Delegate (~30s)

*Navigate to `/delegate`.*

> Now I need to give this agent permission to act. Not full wallet access -- a bounded, scoped permission.

*Show the "Wallet connection" card. If not connected, click "Connect MetaMask" and approve in Flask.*

> My wallet is connected on Base Sepolia, chain 84532.

*Scroll to the "Delegation scope" card.*

> The delegation is scoped to this specific task. The spend cap matches my budget. The permission expires in 24 hours. There's an explicit list of what the agent can and can't do.

*Scroll to the "Permission request" card.*

> Under the hood, this uses ERC-7715 -- MetaMask's execution permission standard. The app checks whether my wallet actually supports `erc20-token-periodic`. If it does, the permission request is real. If it doesn't, I get a simulation with an honest "simulated" badge instead of pretending.

*Click "Request bounded execution permission" (or "Simulate bounded approval for demo" if Flask doesn't support it).*

*Show the "Granted context" card that appears. Point out the badge: either "WALLET-GRANTED" (green) or "SIMULATED" (amber).*

> Permission granted. Notice the badge -- it says exactly how this was approved. No ambiguity.

### Step 4: Settle (~30s)

*Navigate to `/settle`.*

> Last step. The settlement path shows the swap route and the execution quote.

*Point out the "UNISWAP" badge and the route display.*

> That quote came from Uniswap's QuoterV2 contract on Base Sepolia. The app hit the real onchain quoter to get a price for ETH to USDC through their V3 pool.

*Point out the execution quote, broker fee, safety reserve, and gas estimate.*

> There's a small broker fee and a safety reserve. Everything is itemized.

*Click "Execute bounded settlement" (or "Record settlement plan + receipt").*

*Wait for receipt to appear.*

> The settlement executes and the receipt gets pinned to Filecoin via Lighthouse. That receipt anchor is a real CID -- you can look it up on IPFS.

*Point out the "FILECOIN" badge on the receipt card. If a tx hash is present, click "View tx on Base Sepolia" to show the Basescan link.*

> Every step of this workflow generated a real artifact: a private evaluation, a scoped permission, an onchain settlement, and a durable receipt.

### Closing (~20s)

*Show the "Workflow complete" banner.*

> That's GhostBroker. The thesis is simple: agents should be hired the way contractors are hired. You scope the work, evaluate candidates privately, grant limited authority, settle payment, and keep a receipt.
>
> The Venice evaluation is real. The MetaMask delegation is real where the wallet supports it and honestly labeled where it doesn't. The Uniswap quote is real onchain. The Filecoin receipt is real with a verifiable CID.
>
> We didn't fake anything. Where something is simulated, we say so.

*End on the app with the emerald completion banner visible.*

---

## Timing breakdown

| Section | Target |
|---|---|
| Opening | 15s |
| Intake | 20s |
| Evaluate | 25s |
| Delegate | 30s |
| Settle | 30s |
| Closing | 20s |
| **Total** | **~2:20** |

## Recording notes

- Keep the mouse movements deliberate and slow. Judges watch at 1x.
- Don't rush past the provider badges. Those are the honesty signals that differentiate this project.
- If Venice takes longer than 10s, just wait -- the loading state is clean.
- If MetaMask Flask throws an error on the permission request, use the "Simulate" fallback and narrate that you're doing so. That's actually a good demo moment: "My wallet doesn't support this yet, so I'm using the simulation. The badge changes to amber to show that."
- The voiceover should sound like you're explaining it to a friend who builds software, not pitching a VC.
