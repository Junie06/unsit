import { buildPrompt, validateChallenge } from "./challenge-core.js";

const WEBLLM_URL = "https://esm.sh/@mlc-ai/web-llm@0.2.85";
const MODEL_ID = "gemma3-1b-it-q4f16_1-MLC";
let enginePromise = null;
let modelWorker = null;

async function getEngine(onProgress) {
  if (!globalThis.isSecureContext || !navigator.gpu) {
    throw new Error("Gemma in the browser needs a secure connection and WebGPU.");
  }
  if (!await navigator.gpu.requestAdapter()) {
    throw new Error("This device does not have an available WebGPU adapter.");
  }

  if (!enginePromise) {
    enginePromise = (async () => {
      try {
        const { CreateWebWorkerMLCEngine } = await import(WEBLLM_URL);
        modelWorker = new Worker(new URL("./gemma-worker.js", import.meta.url), { type: "module" });
        return await CreateWebWorkerMLCEngine(modelWorker, MODEL_ID, {
          initProgressCallback: (progress) => onProgress(progress.text)
        });
      } catch (error) {
        modelWorker?.terminate();
        modelWorker = null;
        throw error;
      }
    })().catch((error) => {
      enginePromise = null;
      throw error;
    });
  }

  return enginePromise;
}

function parseModelResponse(content) {
  if (typeof content !== "string") {
    throw new Error("Gemma returned an empty response.");
  }
  const json = content.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error("Gemma did not return a JSON challenge.");
  return JSON.parse(json);
}

export async function generateGemmaChallenge(preferences, onProgress = () => {}) {
  const engine = await getEngine(onProgress);
  onProgress("Gemma is making your options…");

  const response = await engine.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You create brief, safe outdoor movement plans. Follow the user's preferences and return only the requested JSON. Never prescribe treatment."
      },
      { role: "user", content: buildPrompt(preferences) }
    ],
    temperature: 0.4,
    max_tokens: 700
  });
  const parsed = parseModelResponse(response.choices[0]?.message?.content);
  return { ...validateChallenge(parsed, preferences.duration), source: "gemma-browser" };
}
