import type { BrokerEvaluationResponse } from "@/lib/ghostbroker";

const evaluations = new Map<string, BrokerEvaluationResponse>();

export function storeEvaluation(result: BrokerEvaluationResponse) {
  evaluations.set(result.evaluationId, result);
}

export function getEvaluation(evaluationId: string) {
  return evaluations.get(evaluationId) ?? null;
}
