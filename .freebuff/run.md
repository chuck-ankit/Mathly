# Mathly — run doc

Vite + React + TypeScript single-page app (`npm run dev` serves it at http://localhost:5173/).

## Reproduce the artifacts

- Install dependencies: `npm install` (uses npm; `package-lock.json` is the lockfile). Node 18+ required; Node 24 was used here.
- No `.env` files exist in this project — nothing to copy from the main checkout.
- (Verification only) Run the unit tests: `npx vitest run` — 113 tests across 7 files.
- (Verification only) Typecheck: `npx tsc -b --noEmit`.

## Run the server

- Start detached (Windows), logging stdout/stderr to separate files:

  ```
  powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -RedirectStandardOutput '<log>' -RedirectStandardError '<log>.err' -WindowStyle Hidden -PassThru).Id"
  ```

- Note: the `Start-Process` command may appear to hang the caller even though the server starts fine — if it times out, check the log and the port before retrying (a retry just hits `Port 5173 is in use`).
- Wait for `VITE ... ready` in the log, then confirm `curl http://localhost:5173/` answers 200.
- Default port is 5173 (`vite.config.ts` has no override). If it's taken, Vite auto-picks the next free port — read the actual port from the log before registering a preview.
- Stop: `powershell -NoProfile -Command "Stop-Process -Id <pid>"` (kill the `node` process; npm.cmd is just the launcher).
