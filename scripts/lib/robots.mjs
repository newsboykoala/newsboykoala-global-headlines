import { sleep } from "./util.mjs";

const USER_AGENT = "NewsBriefKR/1.0 (+https://github.com/your-account/your-repo)";

async function request(url, { fetchImpl = fetch, timeoutMs = 10000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { signal: controller.signal, headers: { "User-Agent": USER_AGENT, Accept: "text/plain,*/*" } });
    return { status: response.status, body: response.ok ? await response.text() : "" };
  } catch (error) {
    return { status: 0, body: "", error: error?.name || "network_error" };
  } finally {
    clearTimeout(timer);
  }
}

function rulesForStar(robotsText) {
  const rules = [];
  let applies = false;
  for (const raw of robotsText.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const index = line.indexOf(":");
    if (index < 0) continue;
    const field = line.slice(0, index).trim().toLowerCase();
    const value = line.slice(index + 1).trim();
    if (field === "user-agent") {
      applies = value === "*";
    } else if (applies && (field === "allow" || field === "disallow") && value) {
      rules.push({ kind: field, pattern: value });
    }
  }
  return rules;
}

function matches(path, pattern) {
  const anchored = pattern.endsWith("$");
  const raw = anchored ? pattern.slice(0, -1) : pattern;
  const expression = raw.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${expression}${anchored ? "$" : ""}`).test(path);
}

export async function isRobotsAllowed(url, options = {}) {
  const origin = new URL(url).origin;
  const cache = options.cache || new Map();
  let record = cache.get(origin);
  if (!record) {
    record = await request(`${origin}/robots.txt`, options);
    cache.set(origin, record);
  }
  if (record.status !== 200 || !record.body || /^\s*</.test(record.body)) {
    return { allowed: Boolean(options.knownAllowedWhenUnavailable), status: "unavailable" };
  }
  const path = new URL(url).pathname || "/";
  let winner = null;
  for (const rule of rulesForStar(record.body)) {
    if (!matches(path, rule.pattern)) continue;
    const specificity = rule.pattern.replace(/[*$]/g, "").length;
    if (!winner || specificity > winner.specificity || (specificity === winner.specificity && rule.kind === "allow")) {
      winner = { ...rule, specificity };
    }
  }
  return { allowed: !winner || winner.kind === "allow", status: winner?.kind || "allowed" };
}

export async function retryAfter429(attempt, sleepFn = sleep) {
  await sleepFn(800 * 2 ** attempt);
}
