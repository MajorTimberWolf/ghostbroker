import { NextResponse } from "next/server";

import { getEvaluation } from "@/lib/broker-evaluation-store";
import { storeReceiptBundle } from "@/lib/filecoin";
import type { SettlementPlan } from "@/lib/ghostbroker";

export const runtime = "nodejs";

type ReceiptRouteRequest = {
  evaluationId?: string;
  agentId?: string;
  settlementPlan?: SettlementPlan;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as ReceiptRouteRequest;
  const evaluationId = payload.evaluationId;
  const agentId = payload.agentId;
  const settlementPlan = payload.settlementPlan;

  if (!evaluationId || !agentId || !settlementPlan) {
    return NextResponse.json(
      { error: "evaluationId, agentId, and settlementPlan are required." },
      { status: 400 },
    );
  }

  const evaluation = getEvaluation(evaluationId);
  if (!evaluation) {
    return NextResponse.json(
      { error: "Receipt creation requires a valid broker evaluation." },
      { status: 404 },
    );
  }

  const candidate = evaluation.candidates.find((entry) => entry.agent.id === agentId);
  if (!candidate) {
    return NextResponse.json(
      { error: "Receipt creation requires a selected provider from the stored evaluation." },
      { status: 404 },
    );
  }

  const result = await storeReceiptBundle({
    evaluationId,
    task: evaluation.taskSnapshot,
    candidate,
    settlement: settlementPlan,
  });

  return NextResponse.json(result);
}
