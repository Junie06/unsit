import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildPrompt,
  challengeSchema,
  ChallengeError,
  fallbackChallenge,
  validateChallenge,
  validatePreferences
} from "./challenge.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicRoot = resolve(root, "public");
const portValue = process.env.PORT || "3000";
const port = Number(portValue);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error(`Invalid PORT value "${portValue}". Expected an integer between 1 and 65535.`);
}
const host = process.env.HOST || (process.env.PORT ? "0.0.0.0" : "127.0.0.1");
const ollamaHost = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const ollamaModel = process.env.OLLAMA_MODEL || "gemma2:2b";
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 16_384) {
      throw new ChallengeError("Request is too large.");
    }
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new ChallengeError("Request must contain valid JSON.");
  }
}

async function getLocalChallenge(preferences) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(`${ollamaHost}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: ollamaModel,
        prompt: buildPrompt(preferences),
        format: challengeSchema,
        stream: false,
        options: { temperature: 0.6 }
      })
    });
    if (!response.ok) {
      throw new Error(`Ollama returned HTTP ${response.status}.`);
    }
    const result = await response.json();
    return validateChallenge(JSON.parse(result.response), preferences.duration);
  } finally {
    clearTimeout(timeout);
  }
}

async function serveStatic(pathname, response) {
  const relativePath = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const filePath = resolve(publicRoot, relativePath);
  if (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}${sep}`)) {
    sendJson(response, 404, { error: "Not found." });
    return;
  }
  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer"
    });
    response.end(content);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      sendJson(response, 404, { error: "Not found." });
      return;
    }
    throw error;
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  try {
    if (request.method === "POST" && url.pathname === "/api/challenge") {
      const preferences = validatePreferences(await readJson(request));
      try {
        sendJson(response, 200, await getLocalChallenge(preferences));
      } catch (error) {
        if (error.name !== "AbortError" && error.name !== "TimeoutError" && !(error.cause?.code === "ECONNREFUSED")) {
          console.warn(`Local Gemma generation unavailable; using local plan: ${error.message}`);
        }
        sendJson(response, 200, fallbackChallenge(preferences));
      }
      return;
    }

    if (request.method === "GET" && !url.pathname.startsWith("/api/")) {
      await serveStatic(url.pathname, response);
      return;
    }

    sendJson(response, 404, { error: "Not found." });
  } catch (error) {
    if (error instanceof ChallengeError) {
      sendJson(response, error.statusCode, { error: error.message });
    } else {
      console.error(error);
      sendJson(response, 500, { error: "The request could not be completed." });
    }
  }
});

server.listen(port, host, () => {
  console.log(`UnSit is listening on ${host}:${port}`);
  console.log(`Local model: ${ollamaModel} via ${ollamaHost}`);
});
