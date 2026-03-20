import type { Address } from "viem";
import {
  createPublicClient,
  formatUnits,
  http,
  parseAbi,
  parseUnits,
} from "viem";
import { baseSepolia } from "viem/chains";

import {
  buildSettlementPlan,
  isTestnetChainId,
  roundTokenAmount,
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
  wrappedAddress?: Address;
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
const BASE_SEPOLIA_UNISWAP = {
  v3CoreFactory: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24" as Address,
  quoterV2: "0xC5290058841028F1614F3A6F0F5816cAd0df5E27" as Address,
  swapRouter: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4" as Address,
  weth: "0x4200000000000000000000000000000000000006" as Address,
};
const TESTNET_FEE_TIERS = [100, 500, 3000, 10000] as const;
const TESTNET_QUOTE_SLIPPAGE_BPS = BigInt(500);

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

const baseSepoliaTokenConfigs: Partial<Record<SettlementToken, TokenConfig>> = {
  USDC: {
    symbol: "USDC",
    chainId: 84532,
    address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    decimals: 6,
  },
  ETH: {
    symbol: "ETH",
    chainId: 84532,
    address: NATIVE_TOKEN_ADDRESS,
    wrappedAddress: BASE_SEPOLIA_UNISWAP.weth,
    decimals: 18,
  },
};

function toAmountBaseUnits(amount: number, decimals: number) {
  return parseUnits(Math.max(amount, 0).toString(), decimals).toString();
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

function getBaseSepoliaTokenConfig(token: SettlementToken) {
  return baseSepoliaTokenConfigs[token] ?? null;
}

function buildQuoteDiagnostics(message: string) {
  return [message];
}

const v3FactoryAbi = parseAbi([
  "function getPool(address,address,uint24) view returns (address)",
]);
const v3PoolAbi = parseAbi([
  "function liquidity() view returns (uint128)",
]);
const quoterV2Abi = parseAbi([
  "function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96)) returns (uint256 amountOut,uint160 sqrtPriceX96After,uint32 initializedTicksCrossed,uint256 gasEstimate)",
]);

async function getBestBaseSepoliaPoolFee(args: {
  tokenIn: Address;
  tokenOut: Address;
}) {
  const client = createPublicClient({ chain: baseSepolia, transport: http() });
  const candidates = await Promise.all(
    TESTNET_FEE_TIERS.map(async (fee) => {
      const pool = await client.readContract({
        address: BASE_SEPOLIA_UNISWAP.v3CoreFactory,
        abi: v3FactoryAbi,
        functionName: "getPool",
        args: [args.tokenIn, args.tokenOut, fee],
      });

      if (!pool || /^0x0+$/i.test(pool)) {
        return null;
      }

      const liquidity = await client.readContract({
        address: pool,
        abi: v3PoolAbi,
        functionName: "liquidity",
      });

      return {
        fee,
        pool,
        liquidity,
      };
    }),
  );

  return (
    candidates
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((left, right) =>
        left.liquidity === right.liquidity ? 0 : left.liquidity > right.liquidity ? -1 : 1,
      )[0] ?? null
  );
}

async function getBaseSepoliaSettlementQuote(args: {
  candidate: CandidateEvaluation;
  localPlan: ReturnType<typeof buildSettlementPlan>;
  task: TaskForm;
}): Promise<SettlementQuoteResponse> {
  const tokenIn = getBaseSepoliaTokenConfig(args.localPlan.fundingToken);
  const tokenOut = getBaseSepoliaTokenConfig(args.localPlan.payoutToken);

  if (!tokenIn || !tokenOut) {
    return {
      settlementPlan: args.localPlan,
      providerUsed: "local" as const,
      diagnostics: buildQuoteDiagnostics(
        "This testnet settlement pair is not wired into the Base Sepolia quote path yet.",
      ),
    };
  }

  if (tokenIn.address === tokenOut.address) {
    return {
      settlementPlan: {
        ...args.localPlan,
        chain: "Base Sepolia",
        chainId: 84532,
        executionKind:
          args.localPlan.fundingToken === "ETH"
            ? ("native-transfer" as const)
            : ("erc20-transfer" as const),
        tokenInAddress:
          args.localPlan.fundingToken === "ETH" ? null : tokenIn.address,
        tokenOutAddress:
          args.localPlan.payoutToken === "ETH" ? null : tokenOut.address,
      },
      providerUsed: "local" as const,
      diagnostics: buildQuoteDiagnostics(
        "No swap is required for this provider path, so the broker will use a direct testnet transfer when funded.",
      ),
    };
  }

  const wrappedTokenIn = tokenIn.wrappedAddress ?? tokenIn.address;
  const wrappedTokenOut = tokenOut.wrappedAddress ?? tokenOut.address;
  const bestPool = await getBestBaseSepoliaPoolFee({
    tokenIn: wrappedTokenIn,
    tokenOut: wrappedTokenOut,
  });

  if (!bestPool) {
    return {
      settlementPlan: args.localPlan,
      providerUsed: "local" as const,
      diagnostics: buildQuoteDiagnostics(
        "Base Sepolia has no live Uniswap V3 pool for this swap pair.",
      ),
    };
  }

  const client = createPublicClient({ chain: baseSepolia, transport: http() });
  const amountIn = parseUnits(
    Math.max(args.localPlan.quoteAmount, 0).toString(),
    tokenIn.decimals,
  );
  const quote = (await client.readContract({
    address: BASE_SEPOLIA_UNISWAP.quoterV2,
    abi: quoterV2Abi,
    functionName: "quoteExactInputSingle",
    args: [
      {
        tokenIn: wrappedTokenIn,
        tokenOut: wrappedTokenOut,
        amountIn,
        fee: bestPool.fee,
        sqrtPriceLimitX96: BigInt(0),
      },
    ],
  })) as readonly [bigint, bigint, number, bigint];
  const amountOut = quote[0];
  const gasEstimate = quote[3];
  const minOut =
    (amountOut * (BigInt(10_000) - TESTNET_QUOTE_SLIPPAGE_BPS)) / BigInt(10_000);

  return {
    settlementPlan: {
      ...args.localPlan,
      chain: "Base Sepolia",
      chainId: 84532,
      route: `${tokenIn.symbol} -> ${tokenOut.symbol} via Uniswap V3 Base Sepolia ${bestPool.fee}`,
      quoteAmount: roundTokenAmount(
        Number.parseFloat(formatUnits(amountOut, tokenOut.decimals)),
        args.localPlan.payoutToken,
      ),
      settlementNote:
        "Live onchain quote from Uniswap V3 QuoterV2 on Base Sepolia. Execution can route through the Sepolia swap router when the connected wallet is funded.",
      routing: `BASE_SEPOLIA_V3_${bestPool.fee}`,
      gasEstimateUSD: null,
      executionKind: "swap-router" as const,
      recipient: args.candidate.agent.delegateAddress,
      tokenInAddress: wrappedTokenIn,
      tokenOutAddress: wrappedTokenOut,
      routerAddress: BASE_SEPOLIA_UNISWAP.swapRouter,
      feeTier: bestPool.fee,
      amountInBaseUnits: amountIn.toString(),
      amountOutMinimumBaseUnits: minOut.toString(),
    },
    providerUsed: "uniswap" as const,
    diagnostics: buildQuoteDiagnostics(
      `Live quote received from Uniswap V3 on Base Sepolia using pool ${bestPool.pool}. Estimated swap gas: ${gasEstimate.toString()} units.`,
    ),
  };
}

export async function getUniswapSettlementQuote(args: {
  candidate: CandidateEvaluation;
  swapper: Address | null;
  task: TaskForm;
  walletChainId?: number | null;
}): Promise<SettlementQuoteResponse> {
  const { candidate, swapper, task, walletChainId = null } = args;
  const localPlan = buildSettlementPlan(task, candidate, walletChainId);

  if (!swapper) {
    return {
      settlementPlan: localPlan,
      providerUsed: "local",
      diagnostics: buildQuoteDiagnostics(
        "Connect MetaMask to upgrade the settlement panel from a local plan to a live Uniswap quote.",
      ),
    };
  }

  if (walletChainId === 84532) {
    try {
      return await getBaseSepoliaSettlementQuote({
        candidate,
        localPlan,
        task,
      });
    } catch (error) {
      return {
        settlementPlan: localPlan,
        providerUsed: "local",
        diagnostics: buildQuoteDiagnostics(
          error instanceof Error
            ? `Base Sepolia quote failed: ${error.message}`
            : "Base Sepolia quote failed unexpectedly.",
        ),
      };
    }
  }

  if (isTestnetChainId(walletChainId)) {
    return {
      settlementPlan: localPlan,
      providerUsed: "local",
      diagnostics: buildQuoteDiagnostics(
        "Connected wallet is on a testnet with no supported live quote path for this pair.",
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
