import {
  agents,
  type CandidateEvaluation,
  type TaskForm,
} from "@/lib/ghostbroker";

type VeniceEvaluationResponse = {
  memo: string[];
  candidates: CandidateEvaluation[];
};

const VENICE_BASE_URL = process.env.VENICE_BASE_URL ?? "https://api.venice.ai/api/v1";
const VENICE_MODEL = process.env.VENICE_MODEL ?? "deepseek-v3.2";

function extractJsonObject(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  throw new Error("Venice response did not contain a JSON object.");
}

function buildPrompt(task: TaskForm) {
  return {
    task,
    candidateAgents: agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      ens: agent.ens,
      specialty: agent.specialty,
      summary: agent.summary,
      feeRate: agent.feeRate,
      privacyScore: agent.privacyScore,
      delegationScore: agent.delegationScore,
      settlementScore: agent.settlementScore,
      autonomyScore: agent.autonomyScore,
      identityScore: agent.identityScore,
      receiptsScore: agent.receiptsScore,
      supportedTokens: agent.supportedTokens,
      recommendedFor: agent.recommendedFor,
    })),
  };
}

export function canUseVenice() {
  return Boolean(process.env.VENICE_API_KEY);
}

export async function evaluateWithVenice(task: TaskForm) {
  const apiKey = process.env.VENICE_API_KEY;

  if (!apiKey) {
    throw new Error("VENICE_API_KEY is not configured.");
  }

  const response = await fetch(`${VENICE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VENICE_MODEL,
      temperature: 0.2,
      max_tokens: 1200,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content:
            "You are the private evaluation engine for GhostBroker, an agent procurement system. Return strict JSON only. Do not wrap in markdown. Produce an object with keys: memo, candidates. memo must be an array of 3 to 5 short redacted reasoning lines. candidates must be an array covering every input candidate agent. Each candidate must have keys: agent, score, verdict, rationales. Preserve the agent object exactly as provided. score must be an integer from 0 to 100. verdict must be one of strong-fit, good-fit, conditional. rationales must be 2 to 4 concise lines. Rank candidates by true suitability for this task, emphasizing privacy for sealed tasks, delegation safety, payout feasibility, autonomous completion, and durable receipts.",
        },
        {
          role: "user",
          content: JSON.stringify(buildPrompt(task)),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Venice request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Venice returned an empty completion.");
  }

  const parsed = JSON.parse(extractJsonObject(content)) as VeniceEvaluationResponse;

  if (!Array.isArray(parsed.memo) || !Array.isArray(parsed.candidates)) {
    throw new Error("Venice returned an invalid evaluation payload.");
  }

  return {
    memo: parsed.memo.slice(0, 5),
    candidates: parsed.candidates.sort((left, right) => right.score - left.score),
  };
}
