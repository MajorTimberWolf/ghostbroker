"use client";

import { useBroker } from "@/lib/broker-context";
import { formatAddress } from "@/lib/metamask";
import {
  Badge,
  Card,
  EmptyState,
  KV,
  ListBlock,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SectionLabel,
  StepNav,
} from "@/components/ui";

export default function DelegatePage() {
  const {
    broker,
    wallet,
    connectWallet,
    requestApproval,
    simulateApproval,
    canRequestPermission,
    canSimulateApproval,
    unsupportedPermissionMessage,
    requestedPermission,
    permissionBlueprint,
    permissionSupport,
  } = useBroker();

  if (!broker.delegation || !broker.selected) {
    return (
      <>
        <PageHeader
          step="Step 03"
          title="Delegate authority"
          description="Select a provider first. Go back to the evaluation step."
        />
        <EmptyState text="No provider selected. Return to Evaluate and pick a candidate." />
        <StepNav back={{ href: "/evaluate", label: "Evaluate" }} />
      </>
    );
  }

  const delegation = broker.delegation;

  return (
    <>
      <PageHeader
        step="Step 03"
        title="Bounded delegation"
        description="Connect MetaMask and grant a scoped execution permission. The broker never gets full wallet access."
      />

      <div className="space-y-5">
        {/* Wallet connection */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <SectionLabel>Wallet connection</SectionLabel>
              <p className="mt-2 text-[0.88rem] font-medium text-[var(--ink-strong)]">
                {wallet.account
                  ? formatAddress(wallet.account)
                  : "Not connected"}
              </p>
              {wallet.chainId && (
                <p className="mt-0.5 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                  Chain {wallet.chainId}
                </p>
              )}
            </div>
            <Badge
              label={
                wallet.account
                  ? "connected"
                  : wallet.isMetaMask
                    ? "MetaMask ready"
                    : "no wallet"
              }
              variant={wallet.account ? "success" : "neutral"}
            />
          </div>
          {!wallet.account && wallet.isAvailable && (
            <div className="mt-4">
              <SecondaryButton
                onClick={() => void connectWallet()}
                disabled={wallet.isConnecting}
              >
                {wallet.isConnecting ? "Connecting..." : "Connect MetaMask"}
              </SecondaryButton>
            </div>
          )}
        </Card>

        {/* Delegation plan */}
        <Card>
          <SectionLabel>Delegation scope</SectionLabel>
          <p className="mt-1 mb-4 text-[0.78rem] text-[var(--ink-soft)]">
            Scoped to{" "}
            <span className="font-medium text-[var(--ink-strong)]">
              {broker.taskSnapshot?.title}
            </span>
          </p>
          <div className="space-y-0">
            <KV label="Delegate" value={delegation.delegate} />
            <KV label="Delegate wallet" value={formatAddress(delegation.delegateAddress)} />
            <KV
              label="Spend cap"
              value={`${delegation.spendCap} ${broker.taskSnapshot?.payoutToken ?? broker.task.payoutToken}`}
            />
            <KV
              label="Chain"
              value={`${permissionBlueprint?.chainName ?? delegation.chain} \u00b7 ${permissionBlueprint?.chainId ?? delegation.chainId}`}
            />
            <KV label="Expiry" value={`${delegation.expiryHours} hours`} />
          </div>

          <ListBlock title="Allowed actions" items={delegation.permissions} />
          <ListBlock title="Guardrails" items={delegation.guardrails} />
        </Card>

        {/* Permission request detail */}
        {requestedPermission && (
          <Card>
            <SectionLabel>Permission request</SectionLabel>
            <div className="mt-3 space-y-0">
              <KV label="Permission type" value={requestedPermission.permission.type} />
              <KV label="Delegator" value={formatAddress(wallet.account)} />
              <KV
                label="Adjustment"
                value={requestedPermission.isAdjustmentAllowed ? "Adjustable" : "Fixed bounds"}
              />
            </div>
            {permissionBlueprint && (
              <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3">
                <p className="text-[0.78rem] text-[var(--ink-soft)]">
                  Required capability:{" "}
                  <span className="font-medium text-[var(--ink-strong)]">
                    {permissionBlueprint.permissionType}
                  </span>
                </p>
                <p className="mt-1 text-[0.78rem] text-[var(--ink-soft)]">
                  Support:{" "}
                  {permissionSupport?.isTypeSupported
                    ? permissionSupport.isChainSupported
                      ? "available"
                      : "type OK, chain not reported"
                    : "not reported by wallet"}
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Unsupported wallet message */}
        {unsupportedPermissionMessage && (
          <Card className="border-amber-200/60 bg-amber-50/30">
            <p className="text-[0.82rem] font-medium text-amber-900">
              ERC-7715 periodic transfer not enabled
            </p>
            <p className="mt-1.5 text-[0.78rem] leading-6 text-amber-800/80">
              {unsupportedPermissionMessage}
            </p>
          </Card>
        )}

        {/* Action buttons */}
        {!broker.approved && (
          <div className="space-y-3">
            <PrimaryButton
              onClick={() => void requestApproval()}
              disabled={
                broker.approvalPending || !wallet.account || !canRequestPermission
              }
              variant="dark"
            >
              {broker.approvalPending
                ? "Requesting permission..."
                : "Request bounded execution permission"}
            </PrimaryButton>

            {canSimulateApproval && (
              <SecondaryButton onClick={simulateApproval}>
                Simulate bounded approval for demo
              </SecondaryButton>
            )}
          </div>
        )}

        {broker.approvalError && (
          <p className="text-[0.82rem] text-rose-700">{broker.approvalError}</p>
        )}

        {/* Granted permission result */}
        {broker.grantedPermission && (
          <Card
            className={
              broker.approvalMode === "wallet-granted"
                ? "border-emerald-200/60 bg-emerald-50/30"
                : "border-amber-200/60 bg-amber-50/30"
            }
          >
            <div className="flex items-center gap-3">
              <SectionLabel>Granted context</SectionLabel>
              <Badge
                label={
                  broker.approvalMode === "wallet-granted"
                    ? "wallet-granted"
                    : "simulated"
                }
                variant={
                  broker.approvalMode === "wallet-granted" ? "success" : "warning"
                }
              />
            </div>
            <div className="mt-3 space-y-0">
              <KV label="Permission type" value={broker.grantedPermission.permissionType} />
              <KV label="Context" value={formatAddress(broker.grantedPermission.context)} />
              <KV
                label="Delegation manager"
                value={formatAddress(broker.grantedPermission.delegationManager)}
              />
              <KV label="Granted for" value={formatAddress(broker.grantedPermission.to)} />
            </div>
          </Card>
        )}
      </div>

      <StepNav
        back={{ href: "/evaluate", label: "Evaluate" }}
        next={{ href: "/settle" }}
        nextLabel="Execute settlement"
        nextDisabled={!broker.approved}
      />
    </>
  );
}
