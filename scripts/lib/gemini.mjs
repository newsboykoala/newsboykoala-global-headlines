import { sleep } from "./util.mjs";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

function modelId(model) { return String(model || "").trim().replace(/^models\//, ""); }
function candidates(primary, fallbacks) { return [...new Set([primary, ...fallbacks].map(modelId).filter(Boolean))]; }
function jsonResponse(response) { return response.json().catch(() => ({})); }

async function modelCatalog(apiKey, fetchImpl) {
  const response = await fetchImpl(`${API_BASE}/models?key=${encodeURIComponent(apiKey)}`);
  const body = await jsonResponse(response);
  if (!response.ok) return { ok: false, status: response.status };
  const supported = new Set((body.models || []).filter(model => (model.supportedGenerationMethods || []).includes("generateContent")).map(model => modelId(model.name)));
  return { ok: true, supported };
}

function prompt(batch) {
  return [
    "다음은 외신 기사 제목입니다. 각 제목만 자연스러운 한국어 뉴스 제목으로 번역하세요.",
    "원문의 주체, 수치, 부정, 의문, 시제, 인용 강도를 유지하고 원문에 없는 사실을 추가하지 마세요.",
    "설명이나 마크다운 없이 JSON만 출력하세요: {\"translations\":[{\"id\":\"...\",\"titleKo\":\"...\"}]}",
    JSON.stringify(batch.map(item => ({ id: item.id, title: item.titleOriginal })))
  ].join("\n");
}

async function callModel({ apiKey, model, batch, fetchImpl }) {
  const endpoint = `${API_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt(batch) }] }], generationConfig: { temperature: 0.2, responseMimeType: "application/json" } })
  });
  const body = await jsonResponse(response);
  if (!response.ok) return { ok: false, status: response.status, message: String(body?.error?.message || "") };
  const text = body?.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("") || "";
  try {
    const parsed = JSON.parse(text);
    const translations = new Map((parsed.translations || []).filter(item => item?.id && item?.titleKo).map(item => [String(item.id), String(item.titleKo).trim()]));
    return translations.size ? { ok: true, translations } : { ok: false, status: 200, message: "invalid_response" };
  } catch { return { ok: false, status: 200, message: "invalid_response" }; }
}

function unsupported(result) { return result.status === 404 || (result.status === 400 && /not found|unsupported|generatecontent/i.test(result.message)); }
function transient(result) { return result.status === 429 || result.status >= 500; }

export async function translateHeadlines(items, options = {}) {
  const apiKey = String(options.apiKey || "").trim();
  const available = candidates(options.model, options.fallbackModels || []);
  const result = { translations: new Map(), state: "translated", message: "", calls: 0, model: null };
  if (!items.length) return result;
  if (!apiKey) return { ...result, state: "missing_api_key", message: "번역 키가 없어 원문을 표시합니다." };
  if (!available.length) return { ...result, state: "missing_model", message: "허용된 Gemini 모델이 설정되지 않아 원문을 표시합니다." };
  const fetchImpl = options.fetchImpl || fetch;
  if (options.verifyModels !== false) {
    const catalog = await modelCatalog(apiKey, fetchImpl);
    if (catalog.status === 401 || catalog.status === 403) return { ...result, state: "authentication_error", message: "Gemini 인증 또는 권한 오류로 원문을 표시합니다." };
    if (catalog.ok) {
      const filtered = available.filter(model => catalog.supported.has(model));
      if (!filtered.length) return { ...result, state: "model_unavailable", message: "승인한 모델이 generateContent를 지원하지 않아 원문을 표시합니다." };
      available.splice(0, available.length, ...filtered);
    }
  }
  const batchSize = Math.max(1, Math.min(20, Number(options.batchSize || 8)));
  const sleepFn = options.sleepFn || sleep;
  let modelIndex = 0;
  for (let offset = 0; offset < items.length; offset += batchSize) {
    const batch = items.slice(offset, offset + batchSize);
    let complete = false;
    while (!complete && modelIndex < available.length) {
      const model = available[modelIndex];
      let response;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        response = await callModel({ apiKey, model, batch, fetchImpl });
        result.calls += 1;
        if (!transient(response) || attempt === 2) break;
        await sleepFn(700 * 2 ** attempt);
      }
      if (response.ok) {
        for (const [id, titleKo] of response.translations) result.translations.set(id, { titleKo, model });
        result.model = model;
        complete = true;
      } else if (response.status === 401 || response.status === 403) {
        return { ...result, state: "authentication_error", message: "Gemini 인증 또는 권한 오류로 원문을 표시합니다." };
      } else if (unsupported(response)) {
        modelIndex += 1;
      } else if (transient(response)) {
        return { ...result, state: "retry_later", message: "Gemini 한도 또는 일시 오류로 원문을 표시하며 다음 실행에서 재시도합니다." };
      } else {
        return { ...result, state: "translation_error", message: "Gemini 응답을 해석하지 못해 원문을 표시합니다." };
      }
    }
    if (!complete) return { ...result, state: "model_unavailable", message: "승인한 Gemini 모델을 사용할 수 없어 원문을 표시합니다." };
  }
  return result;
}
