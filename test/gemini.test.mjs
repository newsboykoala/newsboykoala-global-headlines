import test from "node:test";
import assert from "node:assert/strict";
import { translateHeadlines } from "../scripts/lib/gemini.mjs";

const item = [{ id: "one", titleOriginal: "A headline with 25 people" }];
const response = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const modelList = response(200, { models: [{ name: "models/old", supportedGenerationMethods: ["generateContent"] }, { name: "models/new", supportedGenerationMethods: ["generateContent"] }] });
const generated = response(200, { candidates: [{ content: { parts: [{ text: JSON.stringify({ translations: [{ id: "one", titleKo: "25명이 관련된 헤드라인" }] }) }] } }] });

test("키가 없으면 호출 없이 원문 폴백 상태를 반환한다", async () => {
  const result = await translateHeadlines(item, { model: "old", fetchImpl: () => { throw new Error("must not call"); } });
  assert.equal(result.state, "missing_api_key");
  assert.equal(result.calls, 0);
});

test("404 모델 종료 시 승인한 다음 후보만 사용한다", async () => {
  const calls = [];
  const result = await translateHeadlines(item, { apiKey: "test", model: "old", fallbackModels: ["new"], sleepFn: async () => {}, fetchImpl: async url => {
    calls.push(url);
    if (url.includes("/models?")) return modelList.clone();
    if (url.includes("models/old:generateContent")) return response(404, { error: { message: "not found" } });
    return generated.clone();
  } });
  assert.equal(result.state, "translated");
  assert.equal(result.translations.get("one").model, "new");
  assert.equal(calls.filter(url => url.includes("generateContent")).length, 2);
});

for (const [status, expected] of [[429, "retry_later"], [500, "retry_later"], [401, "authentication_error"], [403, "authentication_error"]]) {
  test(`Gemini HTTP ${status}은 ${expected}로 안전하게 끝낸다`, async () => {
    let calls = 0;
    const result = await translateHeadlines(item, { apiKey: "test", model: "old", verifyModels: false, sleepFn: async () => {}, fetchImpl: async () => { calls += 1; return response(status, { error: { message: "simulated" } }); } });
    assert.equal(result.state, expected);
    assert.equal(calls, status === 401 || status === 403 ? 1 : 3);
  });
}
