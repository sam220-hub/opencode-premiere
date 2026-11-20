# Security

## Reporting

Please report suspected vulnerabilities privately using GitHub's private
vulnerability reporting on this repository, or by contacting the maintainer
directly. Do not open a public issue for security problems.

## How the panel talks to OpenCode

- The panel runs inside CEP (Chromium) with Node.js enabled and talks to the
  OpenCode background service on `127.0.0.1` only.
- Requests use HTTP Basic auth: user `opencode`, password read from
  `~/.local/state/opencode/service.json`.
- Nothing is sent to a remote server by the panel itself. Agent traffic goes
  wherever your configured OpenCode provider sends it, exactly like the CLI.
- The panel never stores the service password in `localStorage`. Preferences
  (folder override, model, last session) do live there.

## Scope

The panel is a thin client. Vulnerabilities in OpenCode, Node.js, CEP or the
model providers are out of scope for this repository, but reports that show
the panel leaking local data or credentials are in scope.
