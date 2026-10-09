import { fallbackChallenge } from "./offline-challenge.js";
import { generateGemmaChallenge } from "./gemma-client.js";

const STORAGE_KEY = "unsit.v1";
const WEEKLY_GOAL = 5;
const STREAK_RING_GOAL = 7;
const icons = { walk: "↗", park: "⌂", balcony: "☼" };
const sections = ["builder", "challenge-section", "active-section", "checkin-section"];
let state = loadState();
let currentChallenge = null;
let currentSessionId = null;
let selectedStyle = null;
let timerInterval = null;
let toastTimeout = null;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      sessions: Array.isArray(saved.sessions) ? saved.sessions : [],
      active: saved.active && typeof saved.active === "object" ? saved.active : null
    };
  } catch (error) {
    console.error("Could not read local activity:", error);
    return { sessions: [], active: null };
  }
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Could not save local activity:", error);
    showToast("Your browser couldn’t save this break. Check available storage.");
  }
}

function getPreferences() {
  const form = document.querySelector("#preferences-form");
  const values = new FormData(form);
  return {
    duration: Number(values.get("duration")),
    energy: values.get("energy"),
    focus: values.get("focus"),
    setting: values.get("setting"),
    discomfort: values.get("discomfort")
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("visible"), 3600);
}

function showSection(id) {
  for (const sectionId of sections) {
    document.getElementById(sectionId).hidden = sectionId !== id;
  }
}

function scrollToSection(id) {
  document.getElementById(id).scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderChallenge(challenge, sessionId) {
  currentChallenge = challenge;
  currentSessionId = sessionId || null;
  selectedStyle = null;
  document.querySelector("#challenge-title").textContent = challenge.title;
  document.querySelector("#challenge-duration").textContent = `${challenge.durationMinutes} MIN`;
  document.querySelector("#challenge-focus").textContent = `Focus: ${challenge.focus}. Choose whichever version feels right.`;
  document.querySelector("#challenge-source").textContent = ["gemma-local", "gemma-browser"].includes(challenge.source)
    ? "Made by Gemma on this device"
    : "A ready-to-go local plan";
  const styleList = document.querySelector("#style-list");
  styleList.replaceChildren();

  for (const style of challenge.styles) {
    const card = document.createElement("article");
    card.className = "style-card";
    card.dataset.style = style.name;
    const icon = document.createElement("span");
    icon.className = "style-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = icons[style.icon] || "✳";
    const heading = document.createElement("h3");
    heading.textContent = style.name;
    const instruction = document.createElement("p");
    instruction.textContent = style.instruction;
    const choose = document.createElement("button");
    choose.type = "button";
    choose.className = "style-select";
    choose.textContent = "Choose this →";
    choose.addEventListener("click", () => chooseStyle(style));
    card.append(icon, heading, instruction, choose);
    styleList.append(card);
  }

  const startButton = document.querySelector("#begin-button");
  startButton.disabled = true;
  startButton.innerHTML = 'Choose a style to begin <span aria-hidden="true">→</span>';
  showSection("challenge-section");
  scrollToSection("challenge-section");
}

function chooseStyle(style) {
  selectedStyle = style;
  document.querySelectorAll(".style-card").forEach((card) => {
    card.classList.toggle("selected", card.dataset.style === style.name);
  });
  const startButton = document.querySelector("#begin-button");
  startButton.disabled = false;
  startButton.innerHTML = `Start ${escapeHtml(style.name)} <span aria-hidden="true">→</span>`;
}

function calculateStats() {
  const completed = state.sessions.filter((session) => session.completedAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekCount = completed.filter((session) => new Date(session.completedAt) >= weekStart).length;
  const days = new Set(completed.map((session) => new Date(session.completedAt).toDateString()));
  let streak = 0;
  const date = new Date(today);
  if (!days.has(date.toDateString())) date.setDate(date.getDate() - 1);
  while (days.has(date.toDateString())) {
    streak += 1;
    date.setDate(date.getDate() - 1);
  }
  document.querySelector("#week-count").textContent = weekCount;
  document.querySelector("#week-count").nextElementSibling.textContent = weekCount === 1 ? "break" : "breaks";
  document.querySelector("#streak-count").textContent = streak;
  document.querySelector("#streak-count").nextElementSibling.textContent = streak === 1 ? "day" : "days";
  document.querySelector("#week-ring").style.setProperty("--ring-progress", `${Math.min(100, Math.round((weekCount / WEEKLY_GOAL) * 100))}%`);
  document.querySelector("#week-ring").setAttribute("aria-label", `${weekCount} of ${WEEKLY_GOAL} weekly goal breaks`);
  document.querySelector("#streak-ring").style.setProperty("--ring-progress", `${Math.min(100, Math.round((streak / STREAK_RING_GOAL) * 100))}%`);
  document.querySelector("#streak-ring").setAttribute("aria-label", `${streak} ${streak === 1 ? "day" : "days"} in a row`);
}

function renderHistory() {
  const list = document.querySelector("#history-list");
  const completed = state.sessions.filter((session) => session.completedAt)
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    .slice(0, 5);
  list.replaceChildren();
  document.querySelector("#clear-history").hidden = state.sessions.length === 0;
  if (completed.length === 0) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "Your first fresh-air break can start right here.";
    list.append(empty);
    calculateStats();
    return;
  }
  for (const session of completed) {
    const item = document.createElement("article");
    item.className = "history-item";
    const symbol = document.createElement("span");
    symbol.className = "history-symbol";
    symbol.setAttribute("aria-hidden", "true");
    symbol.textContent = icons[session.style?.icon] || "✳";
    const info = document.createElement("div");
    info.className = "history-info";
    const title = document.createElement("strong");
    title.textContent = session.challengeTitle;
    const meta = document.createElement("span");
    meta.textContent = `${session.durationMinutes} min · ${session.style?.name || "Outdoor reset"} · ${new Date(session.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    info.append(title, meta);
    item.append(symbol, info);
    if (session.feeling) {
      const feeling = document.createElement("span");
      feeling.className = "history-feeling";
      feeling.textContent = { better: "Felt better", same: "About the same", worse: "Not so great" }[session.feeling];
      item.append(feeling);
    }
    list.append(item);
  }
  calculateStats();
}

function updateTimer() {
  if (!state.active) return;
  const remaining = state.active.endsAt === null
    ? state.active.pausedRemaining
    : Math.max(0, state.active.endsAt - Date.now());
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  document.querySelector("#timer-text").textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const total = state.active.durationMinutes * 60_000;
  const elapsed = Math.min(1, Math.max(0, (total - remaining) / total));
  document.querySelector("#timer-progress").style.setProperty("--progress", `${Math.round(elapsed * 100)}%`);
  if (remaining === 0) {
    clearInterval(timerInterval);
    document.querySelector("#active-title").textContent = "Whenever you’re ready.";
    document.querySelector("#timer-caption").textContent = "Your time is up. Take a breath, then head back when it feels right.";
  }
}

function resumeActive() {
  if (!state.active) return;
  document.querySelector("#active-title").textContent = "Take your time.";
  document.querySelector("#timer-style").textContent = state.active.style.name;
  document.querySelector("#active-instruction").textContent = state.active.style.instruction;
  showSection("active-section");
  updateTimer();
  if (state.active.endsAt !== null) timerInterval = setInterval(updateTimer, 1_000);
  if (state.active.endsAt === null) {
    document.querySelector("#timer-caption").textContent = "Timer paused. Resume whenever you’re ready.";
    document.querySelector("#pause-button").dataset.paused = "true";
    document.querySelector("#pause-button").textContent = "Resume timer";
  }
}

async function createChallenge() {
  const button = document.querySelector("#generate-button");
  button.disabled = true;
  button.textContent = "Preparing your options…";
  try {
    const preferences = getPreferences();
    const useGemma = document.querySelector("#use-gemma").checked;
    let result;
    let gemmaUnavailable = false;
    if (useGemma) {
      try {
        result = await generateGemmaChallenge(preferences, (progress) => {
          button.textContent = progress || "Loading Gemma…";
        });
      } catch (error) {
        console.warn(`Using the built-in plan because browser Gemma is unavailable: ${error.message}`);
        gemmaUnavailable = true;
        result = fallbackChallenge(preferences);
      }
    } else {
      result = fallbackChallenge(preferences);
    }
    if (!useGemma && ["localhost", "127.0.0.1", "::1"].includes(location.hostname)) {
      try {
        const response = await fetch("/api/challenge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preferences)
        });
        if (!response.ok) throw new Error(`Local challenge service returned HTTP ${response.status}.`);
        result = await response.json();
      } catch (error) {
        console.warn(`Using the built-in plan because local Ollama is unavailable: ${error.message}`);
      }
    }
    if (result.source === "local-plan") {
      result = fallbackChallenge(preferences);
    }
    const session = {
      id: crypto.randomUUID(),
      challengeTitle: result.title,
      durationMinutes: result.durationMinutes,
      source: result.source,
      createdAt: new Date().toISOString(),
      challenge: result
    };
    state.sessions.push(session);
    currentSessionId = session.id;
    persistState();
    renderChallenge(result, session.id);
    if (result.source === "gemma-browser") {
      showToast("Gemma made this plan on your device. Your plan is saved in this browser.");
    } else if (result.source === "gemma-local") {
      showToast("Made locally with Gemma through Ollama. Your plan is saved on this device.");
    } else if (gemmaUnavailable) {
      showToast("Gemma couldn't run here. Your built-in offline plan is ready.");
    } else {
      showToast("Your offline-ready local plan is ready.");
    }
  } catch (error) {
    console.error("Challenge generation failed:", error);
    showToast(error.message || "Couldn’t connect to UnSit. Try again.");
  } finally {
    button.disabled = false;
    button.innerHTML = 'Make me a little challenge <span aria-hidden="true">→</span>';
  }
}

function beginChallenge() {
  if (!currentChallenge || !selectedStyle) return;
  state.active = {
    sessionId: currentSessionId,
    challengeTitle: currentChallenge.title,
    durationMinutes: currentChallenge.durationMinutes,
    style: selectedStyle,
    startedAt: Date.now(),
    endsAt: Date.now() + currentChallenge.durationMinutes * 60_000
  };
  persistState();
  resumeActive();
  scrollToSection("active-section");
}

function finishChallenge(feeling) {
  if (!state.active) return;
  clearInterval(timerInterval);
  const completedAt = new Date().toISOString();
  const session = state.sessions.find((item) => item.id === state.active.sessionId);
  if (!session) {
    console.error("Could not find the saved session for the active challenge.");
    showToast("This break couldn’t be matched to a saved plan. Your active timer is still saved.");
    return;
  }
  session.completedAt = completedAt;
  session.feeling = feeling || null;
  session.style = state.active.style;
  state.active = null;
  persistState();
  renderHistory();
}

function startCheckIn() {
  showSection("checkin-section");
  scrollToSection("checkin-section");
}

document.querySelector("#start-button").addEventListener("click", () => {
  scrollToSection("builder");
  document.querySelector('input[name="duration"]:checked').focus({ preventScroll: true });
});
document.querySelector("#preferences-form").addEventListener("submit", (event) => {
  event.preventDefault();
  createChallenge();
});
document.querySelector("#begin-button").addEventListener("click", beginChallenge);
document.querySelector("#new-challenge-button").addEventListener("click", () => {
  showSection("builder");
  scrollToSection("builder");
});
document.querySelector("#finish-button").addEventListener("click", startCheckIn);
document.querySelector("#skip-checkin").addEventListener("click", () => {
  finishChallenge(null);
  showSection("builder");
  scrollToSection("history-title");
  showToast("Break logged. Nice work getting outside.");
});
document.querySelectorAll(".feeling-button").forEach((button) => {
  button.addEventListener("click", () => {
    finishChallenge(button.dataset.feeling);
    showSection("builder");
    scrollToSection("history-title");
    showToast("Check-in saved on this device. Thanks for taking a break.");
  });
});
document.querySelector("#pause-button").addEventListener("click", (event) => {
  if (!state.active) return;
  if (event.currentTarget.dataset.paused === "true") {
    state.active.endsAt = Date.now() + state.active.pausedRemaining;
    delete state.active.pausedRemaining;
    persistState();
    event.currentTarget.dataset.paused = "false";
    event.currentTarget.textContent = "Pause timer";
    document.querySelector("#timer-caption").textContent = "The timer keeps its place if you lock your screen.";
    timerInterval = setInterval(updateTimer, 1_000);
    return;
  }
  state.active.pausedRemaining = Math.max(0, state.active.endsAt - Date.now());
  state.active.endsAt = null;
  persistState();
  clearInterval(timerInterval);
  updateTimer();
  document.querySelector("#timer-caption").textContent = "Timer paused. Resume whenever you’re ready.";
  event.currentTarget.dataset.paused = "true";
  event.currentTarget.textContent = "Resume timer";
});
document.querySelector("#clear-history").addEventListener("click", () => {
  if (!window.confirm("Clear completed activity from this device? Saved plans and a break in progress will be kept.")) return;
  const removedIds = new Set(state.sessions.filter((session) => session.completedAt).map((session) => session.id));
  state.sessions = state.sessions.filter((session) => !session.completedAt);
  if (removedIds.has(currentSessionId) && !state.active) {
    currentChallenge = null;
    currentSessionId = null;
    showSection("builder");
  }
  persistState();
  renderHistory();
  showToast("Your local activity was cleared.");
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js").catch((error) => {
    console.error("Could not register offline app shell:", error);
  });
}

renderHistory();
const latestSavedChallenge = [...state.sessions].reverse().find((session) => !session.completedAt && session.challenge);
if (state.active) resumeActive();
else if (latestSavedChallenge) renderChallenge(latestSavedChallenge.challenge, latestSavedChallenge.id);
