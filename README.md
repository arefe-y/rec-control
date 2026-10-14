# OBS Control App

A SvelteKit app for controlling OBS Studio from the browser: start and stop recordings, switch scenes, and see the current scene, recording file and timecode. The UI and the API run in one SvelteKit app, which talks to OBS over the OBS WebSocket protocol (v5).

**Stack:** SvelteKit 2, TypeScript, Tailwind CSS, obs-websocket-js, Node.js 20+

## Features

- Start and stop recording
- Switch scenes from a dropdown loaded from OBS
- Show the current recording file name, the live scene and the recording timecode
- Live status: refreshes every 2 seconds, so the timecode and scenes created in OBS appear automatically
- Scene list and status kept in a Svelte store
- Error messages in the UI when OBS is unreachable or an action fails; errors are logged on the server

## Setup

**1. Enable the OBS WebSocket server** 

**2. Configure the app:**

```bash
cp .env.example .env
```

```env
OBS_HOST=127.0.0.1
OBS_PORT=4455
OBS_PASSWORD=your-obs-websocket-password
```

**3. Install and run:**

```bash
npm install
npm run dev
```

Open http://localhost:5173. Keep OBS running.

To run the production build instead:

```bash
npm run build
npm run preview
```

Open http://localhost:4173.

## Project structure

```
src/
├── lib/
│   ├── server/obs.ts            OBS connection and logic (server only)
│   ├── stores/obs.ts            Svelte store with the UI state
│   └── types/obs.ts             Types shared by the API and the UI
└── routes/
    ├── +layout.svelte           Loads Tailwind styles
    ├── +page.svelte             Dashboard UI
    └── api/obs/
        ├── status/+server.ts    GET  /api/obs/status
        └── action/+server.ts    POST /api/obs/action
```

The API routes stay thin: they validate the request, call a function in `$lib/server/obs.ts` and return JSON. SvelteKit never sends code from `$lib/server` to the browser, so the OBS password stays on the server.

## API

**`GET /api/obs/status`** returns the current state:

```json
{
  "currentScene": "gameplay",
  "scenes": ["gameplay", "scene", "camera"],
  "isRecording": true,
  "recordTimecode": "00:00:00.456"
}
```

**`POST /api/obs/action`** takes one of:

```text
{ "action": "start-recording" }
{ "action": "stop-recording" }
{ "action": "switch-scene", "sceneName": "gameplay" }
```

It returns `{ "message": "...", "recordFilename": "..." }`. Errors return `400` for an invalid request or `500` if OBS fails or can't be reached, with an `error` message.

## Decisions and assumptions

- **Polling for live updates.** The UI requests the status every 2 seconds. It's simple and recovers on its own if OBS or the server restarts. Pushing OBS events to the browser over a persistent connection (for example with Server-Sent Events) would be the next step.
- **One OBS connection per request.** Each API call connects to OBS, does its work and disconnects, which keeps the server stateless.
- **Recording file name.** OBS doesn't include the file path in its record status, so the app takes it from the "recording started" event and from the stop response.
- **Instant feedback.** After start or stop, the UI updates right away, then confirms with a fresh status. Older status responses that arrive late are ignored.
- **Local use.** There is no login; the app is meant to run on the same machine as OBS or a trusted network.

## Known limitations

- If the page is reloaded during a recording, or recording was started directly in OBS, the file name is shown only after the recording stops.
- An action error is cleared by the next successful status refresh, about 2 seconds later.