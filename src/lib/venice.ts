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
const VENICE_MODEL = process.env.VENICE_MODEL ?? "zai-org-glm-4.7-flash";
const VENICE_TIMEOUT_MS = Number.parseInt(
  process.env.VENICE_TIMEOUT_MS ?? "45000",
  10,
);

function normalizeVerdict(verdict: string): CandidateEvaluation["verdict"] {
  if (verdict === "strong-fit" || verdict === "good-fit" || verdict === "conditional") {
    return verdict;
  }

  if (verdict === "strong_fit") {
    return "strong-fit";
  }

  if (verdict === "good_fit") {
    return "good-fit";
  }

  return "conditional";
}

function normalizeCandidates(candidates: VeniceEvaluationResponse["candidates"]) {
  if (candidates.length !== agents.length) {
    throw new Error(
      `Venice returned ${candidates.length} candidates; expected ${agents.length}.`,
    );
  }

  return candidates.map((candidate) => {
    const agentId = candidate.agent?.id;
    const agent = agents.find((entry) => entry.id === agentId);

    if (!agent) {
      throw new Error(`Venice returned an unknown candidate id: ${agentId ?? "missing"}.`);
    }

    return {
      agent,
      score: Math.max(0, Math.min(100, Math.round(Number(candidate.score) || 0))),
      verdict: normalizeVerdict(candidate.verdict),
      rationales: Array.isArray(candidate.rationales)
        ? candidate.rationales.slice(0, 4).map(String)
        : [],
    } satisfies CandidateEvaluation;
  });
}

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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VENICE_TIMEOUT_MS);
  try {
    const response = await fetch(`${VENICE_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: VENICE_MODEL,
        temperature: 0.2,
        max_tokens: 2000,
        venice_parameters: {
          disable_thinking: true,
          strip_thinking_response: true,
        },
        messages: [
          {
            role: "system",
            content:
              "You are the private evaluation engine for GhostBroker, an agent procurement system. Return strict JSON only. Do not wrap in markdown or explain yourself. Produce an object with keys: memo, candidates. memo must be an array of 3 to 5 short redacted reasoning lines. candidates must be an array covering every input candidate agent. Each candidate must have keys: agent, score, verdict, rationales. Preserve the candidate agent id, name, ens, specialty, summary, feeRate, privacyScore, delegationScore, settlementScore, autonomyScore, identityScore, receiptsScore, supportedTokens, and recommendedFor fields. score must be an integer from 0 to 100. verdict must be one of strong-fit, good-fit, conditional. rationales must be 2 to 4 concise lines. Rank candidates by true suitability for this task, emphasizing privacy for sealed tasks, delegation safety, payout feasibility, autonomous completion, and durable receipts.",
          },
          {
            role: "user",
            content: JSON.stringify(buildPrompt(task)),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Venice request failed with ${response.status}: ${errorText.slice(0, 240)}`,
      );
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
      candidates: normalizeCandidates(parsed.candidates).sort(
        (left, right) => right.score - left.score,
      ),
    };
  } finally {
    clearTimeout(timeout);
  }
}
