import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPrompt,
  fallbackChallenge,
  validateChallenge,
  validatePreferences
} from "../challenge.js";

const preferences = {
  duration: 10,
  energy: "steady",
  focus: "lower-back",
  setting: "anywhere",
  discomfort: "mild"
};

test("validates supported preference values", () => {
  assert.deepEqual(validatePreferences(preferences), preferences);
  assert.throws(() => validatePreferences({ ...preferences, duration: 7 }), /valid duration/);
  assert.throws(() => validatePreferences({ ...preferences, discomfort: "severe" }), /valid comfort/);
});

test("creates three fallback options for the selected duration", () => {
  const challenge = fallbackChallenge(preferences);
  assert.equal(challenge.durationMinutes, 10);
  assert.equal(challenge.styles.length, 3);
  assert.deepEqual(challenge.styles.map(({ name }) => name), [
    "Outdoor Walk",
    "Park / Grass Bench",
    "Quick Porch Reset"
  ]);
  assert.equal(challenge.source, "local-plan");
  assert.ok(challenge.styles.every(({ instruction }) => instruction.length > 20));
});

test("validates model output shape and tags it as local Gemma", () => {
  const base = fallbackChallenge(preferences);
  const result = validateChallenge(base, 10);
  assert.equal(result.source, "gemma-local");
  assert.equal(result.styles[0].icon, "walk");
  assert.throws(() => validateChallenge({ ...base, durationMinutes: 5 }, 10), /unexpected format/);
  assert.throws(() => validateChallenge({ ...base, styles: [] }, 10), /unexpected format/);
});

test("prompt includes safety constraints and no external service instructions", () => {
  const prompt = buildPrompt(preferences);
  assert.match(prompt, /non-diagnostic/);
  assert.match(prompt, /stop if discomfort increases/);
});
