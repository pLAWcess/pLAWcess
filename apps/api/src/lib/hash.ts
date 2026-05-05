import { createHash } from "crypto";

// 객체 키 정렬해서 직렬화 (같은 입력이면 같은 hash 보장)
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify((value as Record<string, unknown>)[k])).join(",") + "}";
}

export function hashAnalysisInput(payload: unknown): string {
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}
