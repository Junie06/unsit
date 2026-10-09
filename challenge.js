import { fallbackChallenge } from "./public/offline-challenge.js";
import {
  ChallengeError,
  buildPrompt,
  challengeSchema,
  validateChallenge
} from "./public/challenge-core.js";

export { ChallengeError, buildPrompt, challengeSchema, fallbackChallenge, validateChallenge };

export function validatePreferences(value) {
  const allowed = {
    duration: [5, 10, 15],
    energy: ["low", "steady", "upbeat"],
    focus: ["lower-back", "hips", "whole-body"],
    setting: ["anywhere", "green-space", "porch"]
  };

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ChallengeError("Choose a duration, energy level, focus, and setting.");
  }

  for (const [key, choices] of Object.entries(allowed)) {
    if (!choices.includes(value[key])) {
      throw new ChallengeError(`Choose a valid ${key.replace("-", " ")}.`);
    }
  }
  if (value.discomfort !== undefined && !["none", "mild", "moderate"].includes(value.discomfort)) {
    throw new ChallengeError("Choose a valid comfort level.");
  }

  return {
    duration: value.duration,
    energy: value.energy,
    focus: value.focus,
    setting: value.setting,
    discomfort: value.discomfort || "none"
  };
}
