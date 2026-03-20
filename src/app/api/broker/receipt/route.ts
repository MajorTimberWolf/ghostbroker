import { NextResponse } from "next/server";

import { getEvaluation } from "@/lib/broker-evaluation-store";
import { storeReceiptBundle } from "@/lib/filecoin";
import type {
  CandidateEvaluation,
  SettlementPlan,
  TaskForm,
} from "@/lib/ghostbroker";

export const runtime = "nodejs";

type ReceiptRouteRequest = {
  evaluationId?: string;
  agentId?: string;
  settlementPlan?: SettlementPlan;
  task?: TaskForm;
  candidate?: CandidateEvaluation;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as ReceiptRouteRequest;
  const evaluationId = payload.evaluationId;
  const agentId = payload.agentId;
  const settlementPlan = payload.settlementPlan;
  const fallbackTask = payload.task;
  const fallbackCandidate = payload.candidate;

  if (!evaluationId || !agentId || !settlementPlan) {
    return NextResponse.json(
      { error: "evaluationId, agentId, and settlementPlan are required." },
      { status: 400 },
    );
  }

  const evaluation = getEvaluation(evaluationId);
  const task = evaluation?.taskSnapshot ?? fallbackTask;

  if (!task) {
    return NextResponse.json(
      { error: "Receipt creation requires a valid broker evaluation." },
      { status: 404 },
    );
  }

  const candidate =
    evaluation?.candidates.find((entry) => entry.agent.id === agentId) ??
    (fallbackCandidate?.agent.id === agentId ? fallbackCandidate : null);

  if (!candidate) {
    return NextResponse.json(
      { error: "Receipt creation requires a selected provider from the stored evaluation." },
      { status: 404 },
    );
  }

  const result = await storeReceiptBundle({
    evaluationId,
    task,
    candidate,
    settlement: settlementPlan,
  });

  return NextResponse.json(result);
}
