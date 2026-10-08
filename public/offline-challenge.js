export const STYLE_SPECS = [
  { name: "Outdoor Walk", icon: "walk" },
  { name: "Park / Grass Bench", icon: "park" },
  { name: "Quick Porch Reset", icon: "balcony" }
];

export function fallbackChallenge(preferences) {
  const { duration, energy, focus, discomfort } = preferences;
  const pace = energy === "upbeat" ? "brisk but conversational" : "easy and unhurried";
  const gentle = discomfort === "moderate"
    ? "Keep every movement small and comfortable; skip anything that increases discomfort."
    : "Keep every movement comfortable and easy to stop.";
  const focusText = {
    "lower-back": "lower back",
    hips: "hips",
    "whole-body": "whole body"
  }[focus];

  return {
    title: `${duration}-minute ${focusText} reset`,
    durationMinutes: duration,
    focus: focusText,
    styles: [
      {
        ...STYLE_SPECS[0],
        instruction: `Walk at an ${pace} pace for ${duration} minutes. Every 2 minutes, pause for a comfortable overhead reach, then lower your arms and keep walking. ${gentle}`
      },
      {
        ...STYLE_SPECS[1],
        instruction: `Spend ${duration} minutes on a bench or patch of grass: do slow standing hip circles, a few gentle calf raises, and relaxed forward folds only if comfortable. ${gentle}`
      },
      {
        ...STYLE_SPECS[2],
        instruction: `Step onto a porch or balcony for ${duration} minutes. Alternate standing calf raises, easy torso turns, and slow breaths; keep a hand near a support if helpful. ${gentle}`
      }
    ],
    source: "local-plan"
  };
}
