"use client";

import type {
  GetGrantedExecutionPermissionsResult,
  GetSupportedExecutionPermissionsResult,
  PermissionRequestParameter,
} from "@metamask/smart-accounts-kit/actions";
import { parseUnits, type Address } from "viem";

import {
  isTestnetChainId,
  type DelegationPlan,
  type SettlementToken,
  type TaskForm,
} from "@/lib/ghostbroker";

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export type EthereumProvider = {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

export type MetaMaskSession = {
  account: Address | null;
  chainId: number | null;
};

export type PermissionBlueprint = {
  chainId: number;
  chainName: string;
  permissionType: PermissionRequestParameter["permission"]["type"];
  tokenLabel: SettlementToken;
  tokenAddress?: Address;
  decimals: number;
};

const mainnetBlueprints: Record<SettlementToken, PermissionBlueprint> = {
  USDC: {
    chainId: 8453,
    chainName: "Base",
    permissionType: "erc20-token-periodic",
    tokenLabel: "USDC",
    tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    decimals: 6,
  },
  ETH: {
    chainId: 8453,
    chainName: "Base",
    permissionType: "native-token-periodic",
    tokenLabel: "ETH",
    decimals: 18,
  },
  cUSD: {
    chainId: 42220,
    chainName: "Celo",
    permissionType: "erc20-token-periodic",
    tokenLabel: "cUSD",
    tokenAddress: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    decimals: 18,
  },
};

const testnetBlueprints: Record<SettlementToken, PermissionBlueprint> = {
  USDC: {
    chainId: 84532,
    chainName: "Base Sepolia",
    permissionType: "erc20-token-periodic",
    tokenLabel: "USDC",
    tokenAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    decimals: 6,
  },
  ETH: {
    chainId: 84532,
    chainName: "Base Sepolia",
    permissionType: "native-token-periodic",
    tokenLabel: "ETH",
    decimals: 18,
  },
  cUSD: {
    chainId: 44787,
    chainName: "Celo Alfajores",
    permissionType: "erc20-token-periodic",
    tokenLabel: "cUSD",
    tokenAddress: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
    decimals: 18,
  },
};

export function getMetaMaskProvider() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.ethereum ?? null;
}

export function getPermissionBlueprint(
  token: SettlementToken,
  walletChainId: number | null = null,
) {
  return (isTestnetChainId(walletChainId) ? testnetBlueprints : mainnetBlueprints)[token];
}

function toIntegerUnits(amount: number, decimals: number) {
  return parseUnits(Math.max(amount, 0).toString(), decimals);
}

function toTimestampHours(hours: number) {
  return Math.floor(Date.now() / 1000) + hours * 60 * 60;
}

async function createErc7715Client(provider: EthereumProvider) {
  const [{ createClient, custom }, { erc7715ProviderActions }] = await Promise.all([
    import("viem"),
    import("@metamask/smart-accounts-kit/actions"),
  ]);

  return createClient({
    transport: custom(provider),
  }).extend(erc7715ProviderActions());
}

async function requestAccounts(method: "eth_accounts" | "eth_requestAccounts") {
  const provider = getMetaMaskProvider();
  if (!provider) {
    throw new Error("MetaMask is not available in this browser.");
  }

  const accounts = (await provider.request({
    method,
  })) as Address[];

  return accounts;
}

async function requestChainId() {
  const provider = getMetaMaskProvider();
  if (!provider) {
    throw new Error("MetaMask is not available in this browser.");
  }

  const chainIdHex = (await provider.request({
    method: "eth_chainId",
  })) as `0x${string}`;

  return Number.parseInt(chainIdHex, 16);
}

export async function readMetaMaskSession(): Promise<MetaMaskSession> {
  const provider = getMetaMaskProvider();
  if (!provider) {
    return {
      account: null,
      chainId: null,
    };
  }

  const [accounts, chainId] = await Promise.all([
    requestAccounts("eth_accounts"),
    requestChainId(),
  ]);

  return {
    account: accounts[0] ?? null,
    chainId,
  };
}

export async function connectMetaMask(): Promise<MetaMaskSession> {
  const [accounts, chainId] = await Promise.all([
    requestAccounts("eth_requestAccounts"),
    requestChainId(),
  ]);

  return {
    account: accounts[0] ?? null,
    chainId,
  };
}

export async function loadMetaMaskExecutionPermissions() {
  const provider = getMetaMaskProvider();
  if (!provider) {
    throw new Error("MetaMask is not available in this browser.");
  }

  const client = await createErc7715Client(provider);
  // Flask appears to serialize execution-permission RPCs. Running these
  // concurrently can surface "already being processed" and leave capability
  // state empty even when the wallet supports the requested type.
  const supportedPermissions = await client.getSupportedExecutionPermissions();
  const grantedPermissions = await client.getGrantedExecutionPermissions();

  return {
    supportedPermissions,
    grantedPermissions,
  } satisfies {
    supportedPermissions: GetSupportedExecutionPermissionsResult;
    grantedPermissions: GetGrantedExecutionPermissionsResult;
  };
}

export function buildGhostBrokerPermissionRequest(args: {
  account: Address;
  task: TaskForm;
  delegation: DelegationPlan;
  walletChainId?: number | null;
}) {
  const { account, task, delegation, walletChainId = null } = args;
  const blueprint = getPermissionBlueprint(task.payoutToken, walletChainId);
  const startTime = Math.floor(Date.now() / 1000);
  const expiry = toTimestampHours(delegation.expiryHours);
  const justification = `GhostBroker scoped delegation for ${task.title}. Cap ${delegation.spendCap} ${task.payoutToken}; delegate ${delegation.delegate}.`;

  const baseRequest = {
    chainId: blueprint.chainId,
    expiry,
    from: account,
    isAdjustmentAllowed: false,
    to: delegation.delegateAddress,
  };

  if (blueprint.permissionType === "native-token-periodic") {
    return {
      ...baseRequest,
      permission: {
        type: "native-token-periodic",
        data: {
          periodAmount: toIntegerUnits(delegation.spendCap, blueprint.decimals),
          periodDuration: delegation.expiryHours * 60 * 60,
          startTime,
          justification,
        },
      },
    } satisfies PermissionRequestParameter;
  }

  return {
    ...baseRequest,
    permission: {
      type: "erc20-token-periodic",
      data: {
        tokenAddress: blueprint.tokenAddress!,
        periodAmount: toIntegerUnits(delegation.spendCap, blueprint.decimals),
        periodDuration: delegation.expiryHours * 60 * 60,
        startTime,
        justification,
      },
    },
  } satisfies PermissionRequestParameter;
}

export async function requestGhostBrokerExecutionPermission(args: {
  account: Address;
  task: TaskForm;
  delegation: DelegationPlan;
  walletChainId?: number | null;
}) {
  const provider = getMetaMaskProvider();
  if (!provider) {
    throw new Error("MetaMask is not available in this browser.");
  }

  const client = await createErc7715Client(provider);
  const request = buildGhostBrokerPermissionRequest(args);
  const result = await client.requestExecutionPermissions([request]);
  const latestGrant = result.at(-1) ?? null;

  return {
    request,
    latestGrant,
  };
}

export function isBlueprintSupported(args: {
  blueprint: PermissionBlueprint;
  supportedPermissions: GetSupportedExecutionPermissionsResult | null;
}) {
  const { blueprint, supportedPermissions } = args;
  const support = supportedPermissions?.[blueprint.permissionType];
  const supportedChainIds =
    support?.chainIds.map((chainId) =>
      typeof chainId === "number" ? chainId : Number.parseInt(chainId, 16),
    ) ?? [];

  return {
    isTypeSupported: Boolean(support),
    isChainSupported: supportedChainIds.includes(blueprint.chainId),
    support,
  };
}

export function formatAddress(address: string | null) {
  if (!address) {
    return "Not connected";
  }

  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
