#!/usr/bin/env node

const deployUrl = process.env.DEPLOY_URL;
const cronSecret = process.env.CRON_SECRET;

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

async function assertJsonResponse(name, response) {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${name} failed with ${response.status}: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${name} did not return valid JSON: ${text}`);
  }
}

async function main() {
  const baseUrl = normalizeBaseUrl(deployUrl);

  console.log(`Checking health endpoint: ${baseUrl}/health`);
  const healthResponse = await fetch(`${baseUrl}/health`);
  const healthJson = await assertJsonResponse("Health check", healthResponse);

  if (healthJson.status !== "ok") {
    throw new Error(`Unexpected health payload: ${JSON.stringify(healthJson)}`);
  }

  console.log("Health endpoint passed.");

  console.log(`Triggering batch run: ${baseUrl}/api/internal/cron/run-all`);
  const batchResponse = await fetch(`${baseUrl}/api/internal/cron/run-all`, {
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
