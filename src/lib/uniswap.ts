import type { Address } from "viem";
import { formatUnits } from "viem";

import {
  buildSettlementPlan,
  isTestnetChainId,
  type CandidateEvaluation,
  type SettlementQuoteResponse,
  type SettlementToken,
  type TaskForm,
} from "@/lib/ghostbroker";

type TokenConfig = {
  symbol: SettlementToken;
  chainId: number;
  address: Address;
  decimals: number;
};

type QuoteRequest = {
  amount: string;
  autoSlippage: "DEFAULT";
  routingPreference: "BEST_PRICE";
  swapper: Address;
  tokenIn: Address;
  tokenInChainId: number;
  tokenOut: Address;
  tokenOutChainId: number;
  type: "EXACT_INPUT";
  urgency: "normal" | "urgent";
};

type QuoteResponse = {
  requestId?: string;
  routing?: string;
  txFailureReason?: string;
  quote?: {
    aggregatedOutputs?: Array<{
      amount?: string;
      minAmount?: string;
      recipient?: string;
      token?: string;
    }>;
    classicGasUseEstimateUSD?: string;
    quoteId?: string;
  };
};

const UNISWAP_BASE_URL =
  process.env.UNISWAP_API_BASE_URL ?? "https://trade-api.gateway.uniswap.org/v1";
const NATIVE_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000";

const uniswapTokenConfigs: Partial<Record<SettlementToken, TokenConfig>> = {
  USDC: {
    symbol: "USDC",
    chainId: 8453,
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    decimals: 6,
  },
  ETH: {
    symbol: "ETH",
    chainId: 8453,
    address: NATIVE_TOKEN_ADDRESS,
    decimals: 18,
  },
};

function toAmountBaseUnits(amount: number, decimals: number) {
  return (
    BigInt(Math.max(0, Math.round(amount))) *
    BigInt(10) ** BigInt(decimals)
  ).toString();
}

function roundForDisplay(amount: string, decimals: number) {
  return Math.round(Number.parseFloat(formatUnits(BigInt(amount), decimals)) * 10000) / 10000;
}

function urgencyToUniswap(task: TaskForm): QuoteRequest["urgency"] {
  return task.urgency === "today" ? "urgent" : "normal";
}

function canUseUniswap() {
  return Boolean(process.env.UNISWAP_API_KEY);
}

function getTokenConfig(token: SettlementToken) {
  return uniswapTokenConfigs[token] ?? null;
}

function buildQuoteDiagnostics(message: string) {
  return [message];
}

export async function getUniswapSettlementQuote(args: {
  candidate: CandidateEvaluation;
  swapper: Address | null;
  task: TaskForm;
  walletChainId?: number | null;
}): Promise<SettlementQuoteResponse> {
  const { candidate, swapper, task, walletChainId = null } = args;
  const localPlan = buildSettlementPlan(task, candidate);

  if (!swapper) {
    return {
      settlementPlan: localPlan,
      providerUsed: "local",
      diagnostics: buildQuoteDiagnostics(
        "Connect MetaMask to upgrade the settlement panel from a local plan to a live Uniswap quote.",
      ),
    };
  }

  if (isTestnetChainId(walletChainId)) {
    return {
      settlementPlan: localPlan,
      providerUsed: "local",
      diagnostics: buildQuoteDiagnostics(
        "Connected wallet is on a testnet. The live Uniswap Trade API quote path is currently mainnet only.",
      ),
    };
  }

  const tokenIn = getTokenConfig(localPlan.fundingToken);
  const tokenOut = getTokenConfig(localPlan.payoutToken);

  if (!tokenIn || !tokenOut) {
    return {
      settlementPlan: localPlan,
      providerUsed: "local",
      diagnostics: buildQuoteDiagnostics(
        "This settlement pair is not yet wired into the live Uniswap quote path.",
      ),
    };
  }

  if (tokenIn.chainId !== tokenOut.chainId) {
    return {
      settlementPlan: localPlan,
      providerUsed: "local",
      diagnostics: buildQuoteDiagnostics(
        "Cross-chain settlement is still using the local planner. The live Uniswap quote path is currently single-chain.",
      ),
    };
  }

  if (tokenIn.address === tokenOut.address) {
    return {
      settlementPlan: localPlan,
      providerUsed: "local",
      diagnostics: buildQuoteDiagnostics(
        "No swap is required for this provider path, so the direct settlement plan is retained.",
      ),
    };
  }

  if (!canUseUniswap()) {
    return {
      settlementPlan: localPlan,
      providerUsed: "local",
      diagnostics: buildQuoteDiagnostics(
        "UNISWAP_API_KEY is not configured, so the client is showing the local settlement plan.",
      ),
    };
  }

  const body = {
    amount: toAmountBaseUnits(localPlan.quoteAmount, tokenIn.decimals),
    autoSlippage: "DEFAULT",
    routingPreference: "BEST_PRICE",
    swapper,
    tokenIn: tokenIn.address,
    tokenInChainId: tokenIn.chainId,
    tokenOut: tokenOut.address,
    tokenOutChainId: tokenOut.chainId,
    type: "EXACT_INPUT",
    urgency: urgencyToUniswap(task),
  } satisfies QuoteRequest;

  try {
    const response = await fetch(`${UNISWAP_BASE_URL}/quote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.UNISWAP_API_KEY!,
        "x-permit2-disabled": "true",
        "x-universal-router-version": "2.0",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();

      return {
        settlementPlan: localPlan,
        providerUsed: "local",
        diagnostics: buildQuoteDiagnostics(
          `Uniswap quote request failed (${response.status}). ${errorText.slice(0, 180)}`,
        ),
      };
    }

    const payload = (await response.json()) as QuoteResponse;
    const outputAmount = payload.quote?.aggregatedOutputs?.[0]?.amount ?? null;

    if (!outputAmount) {
      return {
        settlementPlan: {
          ...localPlan,
          requestId: payload.requestId ?? null,
          routing: payload.routing ?? null,
          txFailureReason: payload.txFailureReason ?? null,
        },
        providerUsed: "local",
        diagnostics: buildQuoteDiagnostics(
          "Uniswap returned no executable output amount, so the broker kept the local settlement plan.",
        ),
      };
    }

    return {
      settlementPlan: {
        ...localPlan,
        route: `${tokenIn.symbol} -> ${tokenOut.symbol} via Uniswap ${payload.routing ?? "CLASSIC"}`,
        quoteAmount: roundForDisplay(outputAmount, tokenOut.decimals),
        settlementNote: payload.quote?.classicGasUseEstimateUSD
          ? `Live quote from the Uniswap Trade API. Estimated gas impact: $${payload.quote.classicGasUseEstimateUSD}.`
          : "Live quote from the Uniswap Trade API for the currently selected wallet and route.",
        requestId: payload.requestId ?? null,
        quoteId: payload.quote?.quoteId ?? null,
        routing: payload.routing ?? null,
        gasEstimateUSD: payload.quote?.classicGasUseEstimateUSD ?? null,
        swapper,
        txFailureReason: payload.txFailureReason ?? null,
      },
      providerUsed: "uniswap",
      diagnostics: buildQuoteDiagnostics(
        "Live quote received from the Uniswap Trade API using the connected wallet as the swapper.",
      ),
    };
  } catch (error) {
    return {
      settlementPlan: localPlan,
      providerUsed: "local",
      diagnostics: buildQuoteDiagnostics(
        error instanceof Error
          ? `Uniswap quote request failed: ${error.message}`
          : "Uniswap quote request failed unexpectedly.",
      ),
    };
  }
}
