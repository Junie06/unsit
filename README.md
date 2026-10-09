# UnSit

UnSit is a guest-first, local-first web app for short outdoor movement breaks. Pick a time, energy level, focus, and setting to get three options: an outdoor walk, a park/bench reset, or a porch/balcony reset.

The dashboard shows progress toward a five-break weekly goal and a seven-day streak ring. After a break, users can optionally record a private, subjective check-in (better, the same, or not so great); it is not a pain score or medical assessment.

The interface is a mobile-ready PWA. On a secure origin, users can opt into running Gemma 3 1B directly in a WebGPU-capable browser; inference stays on the device. The first use downloads about 600 MB of model data, so the app keeps its built-in plans available as a no-download fallback. Personal plans and check-ins stay in that browser's local storage. The Node/Ollama endpoint is only used on localhost when browser Gemma is unchecked. The `npm start` preview is bound to this computer's loopback address, so its `127.0.0.1` URL is not the phone's localhost.

## Run it

Requirements: Node.js 18 or newer. No npm packages are required.

```powershell
npm start
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The app works without Ollama using its built-in movement plans.

When supported, select **Generate with Gemma on this device** to run Gemma 3 1B in a background worker. The model loads only after the user requests a challenge. Its first download is large (about 600 MB); the browser caches model data for later sessions. A secure context (`localhost` or HTTPS) and WebGPU are required. If the browser, device, connection, or model cannot support inference, UnSit reports that and uses the built-in plan instead. The interface remains usable without WebGPU.

## Privacy and offline use

- No login or account is required.
- Generated challenges and check-ins are stored in this browser's local storage. Use **Clear history** to delete saved activity from this browser.
- Browser Gemma runs inference on-device; selected preferences are not sent to the model host. The browser downloads the model weights on first use.
- On localhost, unchecking browser Gemma uses the Ollama service running on the same computer. No cloud AI fallback is used.
- The app shell and saved plans are available offline after the app has been opened once. Browser Gemma needs its model and runtime available; if it cannot start (including offline before the initial download), the built-in plan remains available.
- The timer uses the device clock, so it continues to count while the screen is locked. Lock the phone manually when you head outside.

UnSit offers general movement ideas, not medical advice or treatment. Skip movements that do not feel comfortable and stop if discomfort increases.

## Development

```powershell
npm test
npm run check
```
