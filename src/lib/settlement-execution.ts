"use client";

import { createPublicClient, createWalletClient, custom, http, parseAbi, type Address, type Hash } from "viem";
import { base, baseSepolia, celo, celoAlfajores } from "viem/chains";

import type { SettlementPlan } from "@/lib/ghostbroker";
import { getMetaMaskProvider } from "@/lib/metamask";

const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
]);

const wethAbi = parseAbi([
  "function deposit() payable",
]);

const swapRouterAbi = parseAbi([
  "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)",
]);

function resolveChain(chainId: number | null) {
  switch (chainId) {
    case 8453:
      return base;
    case 84532:
      return baseSepolia;
    case 42220:
      return celo;
    case 44787:
      return celoAlfajores;
    default:
      throw new Error("Unsupported chain for wallet execution.");
  }
}

export async function executeSettlementPlan(settlement: SettlementPlan): Promise<Hash> {
  const provider = getMetaMaskProvider();
  if (!provider) {
    throw new Error("MetaMask is not available in this browser.");
  }

  const chain = resolveChain(settlement.chainId);
  const walletClient = createWalletClient({
    chain,
    transport: custom(provider),
  });
  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  const [account] = (await provider.request({
    method: "eth_accounts",
    params: [],
  })) as Address[];

  if (!account) {
    throw new Error("Connect MetaMask before executing the settlement path.");
  }

  if (!settlement.recipient) {
    throw new Error("Settlement recipient is missing.");
  }

  if (!settlement.amountInBaseUnits) {
    throw new Error("Settlement input amount is missing.");
  }

  let hash: Hash;

  switch (settlement.executionKind) {
    case "native-transfer":
      hash = await walletClient.sendTransaction({
        account,
        to: settlement.recipient,
        value: BigInt(settlement.amountInBaseUnits),
      });
      break;
    case "erc20-transfer":
      if (!settlement.tokenInAddress) {
        throw new Error("Settlement token address is missing for ERC20 transfer.");
      }

      hash = await walletClient.writeContract({
        account,
        address: settlement.tokenInAddress,
        abi: erc20Abi,
        functionName: "transfer",
        args: [settlement.recipient, BigInt(settlement.amountInBaseUnits)],
      });
      break;
    case "swap-router":
      if (
        !settlement.routerAddress ||
        !settlement.tokenInAddress ||
        !settlement.tokenOutAddress ||
        settlement.feeTier === null ||
        !settlement.amountOutMinimumBaseUnits
      ) {
        throw new Error("Settlement swap metadata is incomplete.");
      }

      if (settlement.fundingToken !== "ETH") {
        throw new Error(
          "Real swap execution is currently wired for native ETH input routes only.",
        );
      }

      const wrapHash = await walletClient.writeContract({
        account,
        address: settlement.tokenInAddress,
        abi: wethAbi,
        functionName: "deposit",
        value: BigInt(settlement.amountInBaseUnits),
      });
      await publicClient.waitForTransactionReceipt({ hash: wrapHash });

      const approvalHash = await walletClient.writeContract({
        account,
        address: settlement.tokenInAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [settlement.routerAddress, BigInt(settlement.amountInBaseUnits)],
      });
      await publicClient.waitForTransactionReceipt({ hash: approvalHash });

      hash = await walletClient.writeContract({
        account,
        address: settlement.routerAddress,
        abi: swapRouterAbi,
        functionName: "exactInputSingle",
        args: [
          {
            tokenIn: settlement.tokenInAddress,
            tokenOut: settlement.tokenOutAddress,
            fee: settlement.feeTier,
            recipient: settlement.recipient,
            amountIn: BigInt(settlement.amountInBaseUnits),
            amountOutMinimum: BigInt(settlement.amountOutMinimumBaseUnits),
            sqrtPriceLimitX96: BigInt(0),
          },
        ],
        value: BigInt(0),
      });
      break;
    default:
      throw new Error("This settlement path is currently receipt-only.");
  }

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
