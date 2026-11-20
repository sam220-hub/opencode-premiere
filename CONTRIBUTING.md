# Contributing

Thanks for helping improve the OpenCode panel for Premiere Pro. This is a small,
dependency-free CEP extension, so contributing is mostly editing plain
JavaScript and reloading the panel.

## Ways to help

- Report bugs with your Premiere version, OpenCode version and panel logs.
- Test on Premiere versions you have (2022 through 2027) and on macOS.
- Improve the UI, accessibility or the host script.
- Add support for other CEP hosts (After Effects, Audition, Photoshop) by
  widening `HostList` in `CSXS/manifest.xml`.
- Improve docs and screenshots.

## Development setup

1. Install the panel in development mode:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\install.ps1
   ```

   This enables CEP `PlayerDebugMode`, then creates
   `%APPDATA%\Adobe\CEP\extensions\com.opencode.panel` as a junction to your
   clone. Edits are picked up on panel reload, no reinstall needed.

2. Restart Premiere once, then open `Window > Extensions > OpenCode`.

3. After changing `app.js`, `style.css`, `index.html` or `oc.js`, close and
   reopen the panel (or use the debugger's reload) to load the new code.
   Changes to `host.jsx` (ExtendScript) require reopening the panel too.

### Debugging

CEP exposes the panel in a normal Chromium debugger. Create a file named
`.debug` next to `index.html`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ExtensionList>
  <Extension Id="com.opencode.panel">
    <HostList>
      <Host Name="PPRO" Port="8088" />
    </HostList>
  </Extension>
</ExtensionList>
```

Restart the panel, then open <http://localhost:8088> in Chrome/Edge to inspect
the DOM, console and network. CEP logs also land in
`%TEMP%\cep_logs\CEP*.log`.

`The `.debug` file is only for local debugging and is ignored by git; do not
commit it.

ExtendScript errors from `host.jsx` appear in the panel's debugger console; the
ExtendScript Toolkit is no longer required.

## Code layout

| File | Purpose |
| --- | --- |
| `index.html` | Panel markup (no framework, no build step). |
| `style.css` | Theme and layout. CEP runs Chromium 99: avoid `:has()`, container queries, `dvh`, `color-mix()`. |
| `app.js` | UI state, SSE event handling, rendering, forms, permissions, sheets. |
| `oc.js` | Node/HTTP bridge to the OpenCode service (Node `http`, no CORS). |
| `host.jsx` | ExtendScript (ES3) that reads the Premiere project and panel tree. |
| `CSXS/manifest.xml` | CEP manifest: host range, Node flags, version. |
| `install.ps1` / `uninstall.ps1` | Local sideload helpers. |
| `build.ps1` | Packages `dist/OpenCode-Premiere-<version>.zip`. |

`app.js` keeps a small amount of global state (`state`), renders from that
state, and treats SSE events as the only source of live updates. When the
stream reconnects, it resyncs messages, forms and permissions from the REST
API because the event stream has no replay.

## Style

- Keep `app.js`, `oc.js` and `host.jsx` dependency-free.
- Match the existing style: `var`, named functions, two-space indentation.
- `host.jsx` must stay ES3 — no `JSON.stringify`, `Array.map`, `let`, arrow
  functions or trailing commas.
- Never log or persist the service password.
- Do not add network calls to third-party hosts from the panel.

## Before opening a pull request

1. `node --check app.js` and `node --check oc.js` (copy `host.jsx` to `.js`
   first for the syntax check, or run CI).
2. `CSXS/manifest.xml` still parses as XML.
3. Bump the version in `CSXS/manifest.xml` and add a `CHANGELOG.md` entry for
   user-visible changes.
4. Manually smoke test in Premiere:
   - panel loads and connects (status shows `ready`);
   - a normal prompt streams a reply;
   - a question form renders and submits;
   - a permission card allows and denies;
   - project details shows the real project and tree;
   - Send/Stop swap correctly while a turn runs.

Small, focused pull requests are easiest to review. Screenshots or a short
screen recording help a lot for UI changes.
