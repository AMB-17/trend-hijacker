#!/usr/bin/env node

const deployUrl = process.env.DEPLOY_URL;
const cronSecret = process.env.CRON_SECRET;
const vercelBypassToken = process.env.VERCEL_BYPASS_TOKEN;

if (!deployUrl) {
  console.error("Missing DEPLOY_URL. Example: https://your-app.example.com");
  process.exit(1);
}

if (!cronSecret) {
  console.error("Missing CRON_SECRET.");
  process.exit(1);
}

function normalizeBaseUrl(url) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function withBypass(url) {
  if (!vercelBypassToken) {
    return url;
  }

  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${encodeURIComponent(vercelBypassToken)}`;
}

function sanitizeUrlForLogs(url) {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has("x-vercel-protection-bypass")) {
      parsed.searchParams.set("x-vercel-protection-bypass", "[REDACTED]");
    }
    return parsed.toString();
  } catch {
    return url.replace(/x-vercel-protection-bypass=[^&]+/g, "x-vercel-protection-bypass=[REDACTED]");
  }
}

function buildBypassHeaders(extraHeaders = {}) {
  if (!vercelBypassToken) {
    return extraHeaders;
  }

  return {
    ...extraHeaders,
    "x-vercel-protection-bypass": vercelBypassToken,
    cookie: `x-vercel-protection-bypass=${vercelBypassToken}`,
  };
}

async function fetchWithBypass(url, init = {}) {
  const headers = buildBypassHeaders(init.headers ?? {});
  return fetch(withBypass(url), {
    ...init,
    headers,
  });
}

async function assertJsonResponse(name, response) {
  const text = await response.text();

  if (!response.ok) {
    const looksLikeNextHtml = text.includes("_next/static") || text.includes("This page could not be found");
    const configHint = looksLikeNextHtml
      ? " Hint: DEPLOY_URL/CRON_API_URL is likely pointing to the frontend URL, not the backend API base URL."
      : "";
    throw new Error(`${name} failed with ${response.status}: ${text}${configHint}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${name} did not return valid JSON: ${text}`);
  }
}

async function main() {
  const baseUrl = normalizeBaseUrl(deployUrl);
  let apiBaseUrl = baseUrl;

  let healthJson;
  const healthUrl = `${baseUrl}/health`;

  try {
    console.log(`Checking health endpoint: ${sanitizeUrlForLogs(withBypass(healthUrl))}`);
    const healthResponse = await fetchWithBypass(healthUrl);
    healthJson = await assertJsonResponse("Health check", healthResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Direct health check failed. Retrying through proxy route. Reason: ${message}`);

    const proxyHealthUrl = `${baseUrl}/api/proxy/health`;
    console.log(`Checking proxied health endpoint: ${sanitizeUrlForLogs(withBypass(proxyHealthUrl))}`);
    const proxyHealthResponse = await fetchWithBypass(proxyHealthUrl);
    healthJson = await assertJsonResponse("Health check via proxy", proxyHealthResponse);
    apiBaseUrl = `${baseUrl}/api/proxy`;
  }

  if (healthJson.status !== "ok") {
    throw new Error(`Unexpected health payload: ${JSON.stringify(healthJson)}`);
  }

  console.log("Health endpoint passed.");

  const batchUrl = `${apiBaseUrl}/api/internal/cron/run-all`;
  console.log(`Triggering batch run: ${sanitizeUrlForLogs(withBypass(batchUrl))}`);
  const batchResponse = await fetchWithBypass(batchUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-cron-secret": cronSecret,
    },
    body: JSON.stringify({
      sources: ["reddit", "hackernews", "rss"],
      limitPerSource: 15,
      hoursBack: 24,
      maxTrends: 10,
      minMentions: 4,
    }),
  });

  const batchJson = await assertJsonResponse("Batch run", batchResponse);

  if (!batchJson.success) {
    throw new Error(`Batch run returned unsuccessful payload: ${JSON.stringify(batchJson)}`);
  }

  console.log("Batch run endpoint passed.");
  console.log(JSON.stringify(batchJson, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
