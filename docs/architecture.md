# Architecture

The panel is a thin CEP client for the local OpenCode service. It has no build
step and no runtime dependencies beyond Node.js, which CEP already ships.

```
┌───────────────────────────── Premiere Pro ─────────────────────────────┐
│                                                                        │
│  CEP panel (Chromium 99)                 ExtendScript host             │
│  ┌───────────────────────────┐          ┌───────────────────────────┐  │
│  │ index.html / style.css    │          │ host.jsx                  │  │
│  │ app.js   (state + UI)     │          │ OC_getProject()           │  │
│  │ oc.js    (Node bridge)    │          │  project, sequences, tree │  │
│  └─────────────┬─────────────┘          └─────────────┬─────────────┘  │
│                │ evalScript (JSON string)             │                │
│                └───────────────────────────────────────┘                │
└────────────────┼───────────────────────────────────────────────────────┘
                 │ HTTP on 127.0.0.1 (Basic auth)
        ┌────────▼─────────┐
        │ OpenCode service │  SSE /api/event + REST
        └────────┬─────────┘
                 │
        ┌────────▼─────────┐
        │ Model providers  │
        └──────────────────┘
```

## Components

### `oc.js` — Node bridge

Runs in the panel's Node context (`--enable-nodejs --mixed-context`) and exposes
`window.oc`. Using Node's `http` module avoids CORS entirely; the panel origin is
`file://`.

- Resolves the service URL and password from
  `~/.local/state/opencode/service.json`.
- Ensures the service is running (`opencode service start`) when needed.
- Adds `Authorization: Basic base64("opencode:" + password)` to every call.
- On `401`, re-reads `service.json` (the password can rotate) and retries once.
- Keeps a single SSE connection to `/api/event` and reconnects with backoff.
- Wraps the REST endpoints used by the UI (sessions, messages, prompts,
  commands, models, permissions, forms, diffs, file system helpers).

### `app.js` — UI

- Holds one `state` object: current session, normalized messages, live message,
  forms, permissions, models, project info.
- Normalizes server messages (`user`, `assistant`, `idle`, `shell`, `system`,
  `compaction`) into render-friendly parts (`text`, `reasoning`, `tool`).
- Handles SSE events by patching state, then scheduling a single
  `requestAnimationFrame` render.
- Because `/api/event` is live-only (no replay), reconnects call a resync that
  reloads messages, forms, permissions and session metadata.
- Derives busy state from the newest message (`time.completed` on the assistant
  message, or a user message not yet followed by an assistant message).

### `host.jsx` — ExtendScript

ExtendScript is ES3: no `JSON` object. `host.jsx` builds JSON by hand with an
escaper and returns strings to `app.js` through `evalScript`. It reads:

- `app.project.name`, `app.project.path`
- `app.project.activeSequence`
- `app.project.sequences` with frame rates
- `app.project.rootItem` recursively (bins, clips, sequences), capped and
  depth-limited so huge projects do not block the UI thread.

## Data flow

1. **Prompt.** `app.js` optimistically appends the user message, calls
   `POST /api/session/{id}/prompt`, then waits for SSE events.
2. **Stream.** `session.step.started`, `session.text.*`,
   `session.reasoning.*` and `session.tool.*` events build the live message.
   Tool events carry `input`, `content`, `metadata` and `error`.
3. **Question.** `form.created` (with `data.form`) renders a question card.
   Submit calls `POST /api/session/{id}/form/{formID}/reply` with
   `{ answer: { key: value } }`; cancel calls `DELETE`.
4. **Permission.** `permission.asked` (the request itself in `data`) renders a
   card. Allow once / Always / Deny calls
   `POST /api/session/{id}/permission/{requestID}/reply` with
   `once | always | reject`.
5. **End.** `session.idle` or `session.execution.*` clears busy and refreshes
   the transcript and session list.

The stream is filtered by `data.sessionID` so events from other sessions do not
leak into the open chat.

## Endpoints used

| Method | Path |
| --- | --- |
| GET | `/api/info` |
| GET | `/api/model?location[directory]=...` |
| GET | `/api/command?location[directory]=...` |
| GET | `/api/session` |
| POST | `/api/session` |
| GET/DELETE | `/api/session/{id}` |
| GET | `/api/session/{id}/message?limit=...` |
| POST | `/api/session/{id}/prompt` |
| POST | `/api/session/{id}/command` |
| POST | `/api/session/{id}/interrupt` |
| POST | `/api/session/{id}/model` |
| GET | `/api/session/{id}/permission` |
| POST | `/api/session/{id}/permission/{requestID}/reply` |
| GET | `/api/session/{id}/form` |
| POST | `/api/session/{id}/form/{formID}/reply` |
| GET | `/api/session/{id}/diff` |
| GET | `/api/event` (SSE) |

## Why a custom panel

OpenCode ships a web UI, but CEP embeds Chromium 99. Dropping that UI in
unchanged means polyfills for `:has()`, `dvh`, `color-mix()` and container
queries, plus a build step. A small dependency-free panel was simpler, loads
faster, and can talk to ExtendScript to read the Premiere project — which the
web UI cannot do.

## Security

- The service is bound to `127.0.0.1`; the panel never exposes it elsewhere.
- The password stays in memory and is never written to `localStorage`.
- `install.ps1` only touches the current user's CEP registry keys and the
  current user's CEP extensions folder.
