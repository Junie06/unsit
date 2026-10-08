# UnSit

UnSit is a guest-first, local-first web app for short outdoor movement breaks. Pick a time, energy level, focus, and setting to get three options: an outdoor walk, a park/bench reset, or a porch/balcony reset.

The dashboard shows progress toward a five-break weekly goal and a seven-day streak ring. After a break, users can optionally record a private, subjective check-in (better, the same, or not so great); it is not a pain score or medical assessment.

The interface is a mobile-ready PWA. To use it on a phone, publish the contents of `public/` to an HTTPS static host, open that address on the phone, then choose **Add to Home Screen** / **Install app**. Once opened, the app shell and built-in movement plans work offline on the phone. Personal plans and check-ins remain in that browser's local storage. Gemma inference is only attempted when the app is opened from localhost; on a hosted phone PWA, challenge generation uses the built-in on-device plans and never sends preferences to the hosting server. The `npm start` preview is bound to this computer's loopback address, so its `127.0.0.1` URL is not the phone's localhost.

## Run it

Requirements: Node.js 18 or newer. No npm packages are required.

```powershell
npm start
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The app works without Ollama using its built-in movement plans.

To generate suggestions with local Gemma, install Ollama, then run:

```powershell
ollama pull gemma2:2b
npm start
```

UnSit uses `gemma2:2b` by default. To choose another model already installed in Ollama, set `OLLAMA_MODEL` before starting the app:

```powershell
$env:OLLAMA_MODEL = "gemma2:9b"
npm start
```

If Ollama is unavailable or its response is not valid, UnSit uses a built-in plan. It does not fall back to a cloud AI API. The app server listens on `127.0.0.1`; the Ollama connection stays on the same device.

## Privacy and offline use

- No login or account is required.
- Generated challenges and check-ins are stored in this browser's local storage. Use **Clear history** to delete saved activity from this browser.
- When Gemma is available, UnSit sends the selected duration, energy, focus, setting, and comfort level to the local Ollama service. It does not send them to a cloud AI provider.
- The app shell and saved challenges are available offline after the app has been opened once. Challenge generation still requires the local app server; without Gemma, that server returns its built-in plan.
- The timer uses the device clock, so it continues to count while the screen is locked. Lock the phone manually when you head outside.

UnSit offers general movement ideas, not medical advice or treatment. Skip movements that do not feel comfortable and stop if discomfort increases.

## Development

```powershell
npm test
npm run check
```
