import { parseUnits, type Address } from "viem";

export type Urgency = "today" | "48h" | "this-week";
export type Confidentiality = "standard" | "sensitive" | "sealed";
export type SettlementToken = "USDC" | "ETH" | "cUSD";
export type SettlementExecutionKind =
  | "receipt-only"
  | "native-transfer"
  | "erc20-transfer"
  | "swap-router";

export type TaskForm = {
  title: string;
  objective: string;
  budget: number;
  urgency: Urgency;
  confidentiality: Confidentiality;
  payoutToken: SettlementToken;
  requiresHumanIdentity: boolean;
  requiresPersistentReceipts: boolean;
  requiresAutonomy: boolean;
};

export type AgentProfile = {
  id: string;
  name: string;
  ens: string;
  delegateAddress: Address;
  specialty: string;
  summary: string;
  feeRate: number;
  privacyScore: number;
  delegationScore: number;
  settlementScore: number;
  autonomyScore: number;
  identityScore: number;
  receiptsScore: number;
  supportedTokens: SettlementToken[];
  recommendedFor: string[];
};

export type CandidateEvaluation = {
  agent: AgentProfile;
  score: number;
  verdict: "strong-fit" | "good-fit" | "conditional";
  rationales: string[];
};

export type EvaluationProvider = "venice" | "local";
export type SettlementProvider = "uniswap" | "local";
export type ReceiptProvider = "filecoin" | "local";

export type BrokerEvaluationResponse = {
  taskSnapshot: TaskForm;
  memo: string[];
  candidates: CandidateEvaluation[];
  evaluationId: string;
  providerUsed: EvaluationProvider;
};

export type DelegationPlan = {
  delegate: string;
  delegateAddress: Address;
  spendCap: number;
  chain: string;
  chainId: number;
  expiryHours: number;
  permissions: string[];
  guardrails: string[];
};

export type SettlementPlan = {
  chain: string;
  chainId: number;
  fundingToken: SettlementToken;
  payoutToken: SettlementToken;
  route: string;
  quoteAmount: number;
  brokerFee: number;
  reserve: number;
  settlementNote: string;
  requestId: string | null;
  quoteId: string | null;
  routing: string | null;
  gasEstimateUSD: string | null;
  swapper: Address | null;
  txFailureReason: string | null;
  executionKind: SettlementExecutionKind;
  recipient: Address | null;
  tokenInAddress: Address | null;
  tokenOutAddress: Address | null;
  routerAddress: Address | null;
  feeTier: number | null;
  amountInBaseUnits: string | null;
  amountOutMinimumBaseUnits: string | null;
  txHash: string | null;
};

export type SettlementQuoteResponse = {
  settlementPlan: SettlementPlan;
  providerUsed: SettlementProvider;
  diagnostics: string[];
};

export type Receipt = {
  id: string;
  providerEns: string;
  amount: number;
  token: SettlementToken;
  txHash: string | null;
  receiptAnchor: string;
  storagePlan: string;
  trustUpdate: string;
  executionSummary: string;
};

export type ReceiptUploadResponse = {
  receipt: Receipt;
  providerUsed: ReceiptProvider;
  diagnostics: string[];
};

export const defaultTask: TaskForm = {
  title: "Confidential treasury diligence",
  objective:
    "Evaluate a short list of counterparties for a sensitive onchain treasury action, then execute the chosen path under a constrained budget.",
  budget: 2400,
  urgency: "48h",
  confidentiality: "sealed",
  payoutToken: "USDC",
  requiresHumanIdentity: true,
  requiresPersistentReceipts: true,
  requiresAutonomy: true,
};

export function getSuggestedBudgetForToken(token: SettlementToken) {
  if (token === "ETH") {
    return 0.03;
  }

  return 2400;
}

const DEFAULT_DEMO_RECIPIENT =
  "0xf63e9e2227f5ff84c328d76b21f730d314b840d0" as Address;

const DEMO_RECIPIENT =
  (process.env.NEXT_PUBLIC_GHOSTBROKER_DEMO_RECIPIENT as Address | undefined) ??
  DEFAULT_DEMO_RECIPIENT;

const TESTNET_CHAIN_IDS = new Set([84532, 44787, 11155111]);

export function isTestnetChainId(chainId: number | null) {
  return chainId !== null && TESTNET_CHAIN_IDS.has(chainId);
}

export function getSettlementChain(
  token: SettlementToken,
  walletChainId: number | null = null,
) {
  const isTestnet = isTestnetChainId(walletChainId);

  if (token === "cUSD") {
    return {
      chain: isTestnet ? "Celo Alfajores" : "Celo",
      chainId: isTestnet ? 44787 : 42220,
    };
  }

  return {
    chain: isTestnet ? "Base Sepolia" : "Base",
    chainId: isTestnet ? 84532 : 8453,
  };
}

function getSettlementTokenMetadata(
  token: SettlementToken,
  walletChainId: number | null = null,
) {
  const isTestnet = isTestnetChainId(walletChainId);

  if (token === "ETH") {
    return {
      address: null,
      decimals: 18,
    };
  }

  if (token === "USDC") {
    return {
      address: isTestnet
        ? ("0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address)
        : ("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address),
      decimals: 6,
    };
  }

  return {
    address: isTestnet
      ? ("0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1" as Address)
      : ("0x765DE816845861e75A25fCA122bb6898B8B1282a" as Address),
    decimals: 18,
  };
}

export const agents: AgentProfile[] = [
  {
    id: "venice-risk-desk",
    name: "Venice Risk Desk",
    ens: "riskdesk.ghost.eth",
    delegateAddress: DEMO_RECIPIENT,
    specialty: "Private due diligence",
    summary:
      "High-confidence private evaluation agent for sensitive finance and counterparty screening.",
    feeRate: 0.22,
    privacyScore: 10,
    delegationScore: 7,
    settlementScore: 6,
    autonomyScore: 8,
    identityScore: 7,
    receiptsScore: 7,
    supportedTokens: ["USDC", "ETH"],
    recommendedFor: ["sealed", "counterparty review", "treasury ops"],
  },
  {
    id: "uniswap-settler",
    name: "Uniswap Settler",
    ens: "settler.ghost.eth",
    delegateAddress: DEMO_RECIPIENT,
    specialty: "Execution and routing",
    summary:
      "Execution-focused agent for swaps, routing, and payout settlement across supported rails.",
    feeRate: 0.15,
    privacyScore: 5,
    delegationScore: 8,
    settlementScore: 10,
    autonomyScore: 7,
    identityScore: 6,
    receiptsScore: 6,
    supportedTokens: ["USDC", "ETH", "cUSD"],
    recommendedFor: ["swaps", "settlement", "payout routing"],
  },
  {
    id: "receipts-notary",
    name: "Receipts Notary",
    ens: "notary.ghost.eth",
    delegateAddress: DEMO_RECIPIENT,
    specialty: "Receipts and provenance",
    summary:
      "Agent optimized for execution logging, reputation updates, and durable proof trails.",
    feeRate: 0.12,
    privacyScore: 6,
    delegationScore: 6,
    settlementScore: 5,
    autonomyScore: 8,
    identityScore: 8,
    receiptsScore: 10,
    supportedTokens: ["USDC"],
    recommendedFor: ["receipts", "reputation", "audit trail"],
  },
  {
    id: "celo-field-ops",
    name: "Celo Field Ops",
    ens: "fieldops.ghost.eth",
    delegateAddress: DEMO_RECIPIENT,
    specialty: "Mobile-first payouts",
    summary:
      "Stablecoin-native operations agent for fast real-world settlement and service delivery.",
    feeRate: 0.14,
    privacyScore: 4,
    delegationScore: 7,
    settlementScore: 8,
    autonomyScore: 9,
    identityScore: 7,
    receiptsScore: 5,
    supportedTokens: ["USDC", "cUSD"],
    recommendedFor: ["stablecoin payouts", "field ops", "fast fulfilment"],
  },
];

function urgencyWeight(urgency: Urgency) {
  if (urgency === "today") return 1.2;
  if (urgency === "48h") return 1;
  return 0.8;
}

function amountPrecision(token: SettlementToken) {
  return token === "ETH" ? 6 : 2;
}

export function roundTokenAmount(amount: number, token: SettlementToken) {
  const factor = 10 ** amountPrecision(token);
  return Math.round(amount * factor) / factor;
}

export function cloneTask(task: TaskForm): TaskForm {
  return { ...task };
}

export function taskFingerprint(task: TaskForm) {
  return JSON.stringify(task);
}

export function buildPrivateMemo(task: TaskForm) {
  const memo = [
    `Classify request as ${task.confidentiality} and restrict provider disclosure to minimum viable context.`,
    `Budget ceiling fixed at ${task.budget} ${task.payoutToken}; reject providers whose fee profile leaves no settlement reserve.`,
  ];

  if (task.requiresHumanIdentity) {
    memo.push(
      "Prioritize providers with stronger operator identity and human-backed verification.",
    );
  }

  if (task.requiresPersistentReceipts) {
    memo.push(
      "Require durable receipts suitable for later reputation updates and audit trails.",
    );
  }

  if (task.requiresAutonomy) {
    memo.push(
      "Favor providers capable of completing execution without repeated human intervention.",
    );
  }

  return memo;
}

export function evaluateCandidates(task: TaskForm) {
  return agents
    .map((agent) => {
      let score = 0;
      const rationales: string[] = [];

      score += agent.privacyScore * (task.confidentiality === "sealed" ? 1.6 : 1.1);
      score += agent.delegationScore * 1.25;
      score += agent.settlementScore * 1.2;

      if (task.requiresAutonomy) {
        score += agent.autonomyScore * 1.25;
      }

      if (task.requiresHumanIdentity) {
        score += agent.identityScore * 1.35;
      }

      if (task.requiresPersistentReceipts) {
        score += agent.receiptsScore * 1.35;
      }

      if (agent.supportedTokens.includes(task.payoutToken)) {
        score += 6;
        rationales.push(`Supports native payout in ${task.payoutToken}.`);
      } else {
        rationales.push("Needs token routing before final payout.");
      }

      const effectiveFee = Math.round(task.budget * agent.feeRate);
      if (effectiveFee < task.budget * 0.2) {
        score += 4;
        rationales.push(
          `Fee model leaves room for execution reserve (${effectiveFee} ${task.payoutToken}).`,
        );
      } else {
        rationales.push(
          "Higher fee profile may constrain downstream execution budget.",
        );
      }

      if (task.confidentiality === "sealed" && agent.privacyScore >= 8) {
        score += 8;
        rationales.push(
          "Strong fit for private cognition and restricted disclosure.",
        );
      }

      if (task.requiresPersistentReceipts && agent.receiptsScore >= 8) {
        score += 6;
        rationales.push(
          "Capable of generating durable receipt and provenance artifacts.",
        );
      }

      if (task.requiresAutonomy && agent.autonomyScore >= 8) {
        score += 5;
        rationales.push(
          "Can complete the workflow with limited human follow-ups.",
        );
      }

      score *= urgencyWeight(task.urgency);

      const rounded = Math.round(score);
      const verdict =
        rounded >= 54 ? "strong-fit" : rounded >= 44 ? "good-fit" : "conditional";

      return {
        agent,
        score: rounded,
        verdict,
        rationales,
      } satisfies CandidateEvaluation;
    })
    .sort((left, right) => right.score - left.score);
}

export function buildDelegationPlan(
  task: TaskForm,
  candidate: CandidateEvaluation,
  walletChainId: number | null = null,
) {
  const spendCap = roundTokenAmount(task.budget * 0.88, task.payoutToken);
  const settlementChain = getSettlementChain(task.payoutToken, walletChainId);

  return {
    delegate: candidate.agent.ens,
    delegateAddress: candidate.agent.delegateAddress,
    spendCap,
    chain: settlementChain.chain,
    chainId: settlementChain.chainId,
    expiryHours: task.urgency === "today" ? 8 : task.urgency === "48h" ? 24 : 72,
    permissions: [
      "Request quote from approved settlement rail",
      "Execute bounded payout to selected provider",
      "Write receipt metadata after completion",
    ],
    guardrails: [
      `Reject any spend above ${spendCap} ${task.payoutToken}.`,
      "Allow execution only for the selected provider ENS.",
      "Require receipt write after successful settlement.",
    ],
  } satisfies DelegationPlan;
}

export function buildSettlementPlan(
  task: TaskForm,
  candidate: CandidateEvaluation,
  walletChainId: number | null = null,
) {
  const settlementChain = getSettlementChain(task.payoutToken, walletChainId);
  const brokerFee = roundTokenAmount(task.budget * candidate.agent.feeRate, task.payoutToken);
  const reserve = roundTokenAmount(task.budget * 0.12, task.payoutToken);
  const quoteAmount = roundTokenAmount(task.budget - brokerFee - reserve, task.payoutToken);
  const payoutToken = candidate.agent.supportedTokens[0];
  const sameTokenRoute = task.payoutToken === payoutToken;
  const fundingToken = task.payoutToken;
  const fundingTokenMeta = getSettlementTokenMetadata(fundingToken, walletChainId);
  const payoutTokenMeta = getSettlementTokenMetadata(payoutToken, walletChainId);

  return {
    chain: settlementChain.chain,
    chainId: settlementChain.chainId,
    fundingToken,
    payoutToken,
    route: sameTokenRoute
      ? `Direct ${fundingToken} settlement`
      : `${fundingToken} -> ${payoutToken} via Uniswap routing`,
    quoteAmount,
    brokerFee,
    reserve,
    settlementNote:
      payoutToken === "cUSD"
        ? "Route final payout to a mobile-friendly stablecoin rail."
        : "Settle on the default execution rail with an auditable quote.",
    requestId: null,
    quoteId: null,
    routing: null,
    gasEstimateUSD: null,
    swapper: null,
    txFailureReason: null,
    executionKind:
      sameTokenRoute
        ? fundingToken === "ETH"
          ? "native-transfer"
          : "erc20-transfer"
        : "receipt-only",
    recipient: candidate.agent.delegateAddress,
    tokenInAddress: sameTokenRoute ? fundingTokenMeta.address : null,
    tokenOutAddress: sameTokenRoute ? payoutTokenMeta.address : null,
    routerAddress: null,
    feeTier: null,
    amountInBaseUnits: sameTokenRoute
      ? parseUnits(
          Math.max(quoteAmount, 0).toString(),
          fundingTokenMeta.decimals,
        ).toString()
      : null,
    amountOutMinimumBaseUnits: null,
    txHash: null,
  } satisfies SettlementPlan;
}

export function buildReceipt(
  task: TaskForm,
  candidate: CandidateEvaluation,
  settlement: SettlementPlan,
) {
  const receiptId = crypto.randomUUID();

  return {
    id: receiptId,
    providerEns: candidate.agent.ens,
    amount: settlement.quoteAmount,
    token: settlement.payoutToken,
    txHash: settlement.txHash,
    receiptAnchor: `filecoin://ghostbroker/${candidate.agent.id}/${receiptId}`,
    storagePlan:
      "Persist settlement details, delegation scope, and execution summary as a durable receipt bundle.",
    trustUpdate:
      "Increase provider trust for successful bounded execution under delegated constraints.",
    executionSummary: `${candidate.agent.name} accepted '${task.title}' and completed the payout-approved workflow.`,
  } satisfies Receipt;
}
