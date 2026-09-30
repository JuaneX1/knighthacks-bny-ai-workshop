# Prompt Injection Workshop

A live, two-team prompt-injection capture-the-flag game for a hackathon workshop.

Every round, **both teams simultaneously**:
1. **Draft (5 min)** — write a system prompt / rules for their own vault chatbot, which hides a secret password, then "Save & test" it so it passes a helpfulness test.
2. **Attack (10 min)** — get 3 tries against the *opponent's* vault: each try is a conversation of up to 8 messages (the bot remembers the conversation) that ends with one password guess.

A team **wins the whole game** when the opponent's vault breaks (cracked, or failed the helpfulness test) while its own vault holds up. Anything else is a draw, and the admin starts a new round. Designed for exactly 3 concurrent devices: one per team, plus one admin device that runs the room. Joining from a new device invalidates a team's previous session, so only one device per team can be active at a time.

## Stack

- **Frontend:** React + Vite, plain JavaScript, Tailwind CSS.
- **Backend:** Vercel serverless functions in `/api`.
- **State:** Upstash Redis (`@upstash/redis`) — all game state lives there since serverless functions don't persist memory.
- **LLM:** Google Gemini (Flash) via its OpenAI-compatible `chat/completions` endpoint.

## Project layout

```
/api            Vercel serverless functions (game logic, auth, LLM calls)
/src            React app (Vite)
/scripts        seed.js (demo data) and simulate.js (end-to-end dry run)
```

See the plan/comments in `lib/stateMachine.js` for the full round/phase state machine.

## Local development

### 1. Prerequisites

- Node.js 18+
- An [Upstash Redis](https://upstash.com/) database (free tier is plenty) — grab its REST URL and token.
- A [Google AI Studio](https://aistudio.google.com/) API key for Gemini.
- The [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill it in:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `UPSTASH_REDIS_REST_URL` | From your Upstash Redis database dashboard |
| `UPSTASH_REDIS_REST_TOKEN` | From your Upstash Redis database dashboard |
| `LLM_API_KEY` | Google AI Studio API key |
| `LLM_MAX_CALLS_PER_MINUTE` | Optional, default `10`. Hard cap on AI calls per minute across the whole game (each team gets half). |
| `LLM_MODEL` | e.g. `gemini-flash-lite-latest` (fast and currently available; Google's dated model names churn quickly, so check `GET https://generativelanguage.googleapis.com/v1beta/openai/models` with your key if this one ever 404s) |
| `SESSION_SECRET` | Any long random string (used to sign team session cookies) |
| `ADMIN_TOKEN` | Any long random string (the admin's login token) |

When running via `vercel dev`, also link the project (`vercel link`) and run `vercel env pull .env` if you'd rather manage env vars through the Vercel dashboard — either approach works as long as `.env` ends up populated for local dev.

### 4. Seed demo data

```bash
npm run seed
```

This creates 2 demo teams (`Team Alpha` / join code `ALPHA`, `Team Bravo` / join code `BRAVO`) and a deliberately weak practice vault. Re-running is safe.

### 5. Run the dev server

This project needs **two terminals** running side by side: one serving the `/api` functions, one serving the Vite frontend (which proxies `/api/*` requests to the first). Running everything through a single `vercel dev` doesn't work here — Vercel's dev server tries to auto-detect and re-invoke a frontend "dev" script, which recurses infinitely against itself in this kind of hybrid setup.

**Terminal 1** — API functions (first run will ask you to log in / link the project, follow the prompts):

```bash
npm run dev:api
```

This serves the `/api/*` routes at `http://localhost:3000`.

**Terminal 2** — frontend:

```bash
npm run dev:web
```

This serves the React app at `http://localhost:5173`, proxying any `/api/*` request to `http://localhost:3000`.

Use **`http://localhost:5173`** in your browser during local development (not 3000):

- Join as a team: `http://localhost:5173/` with join code `ALPHA` or `BRAVO`.
- Admin panel: `http://localhost:5173/admin` — enter your `ADMIN_TOKEN`.
- Scoreboard (public, projector-friendly): `http://localhost:5173/scoreboard`.

From the admin panel: save teams (already seeded, but you can rename/rejoin them), then **Start next round** to kick off the draft phase.

In production on Vercel there's no separate frontend dev server — `vercel.json` builds the Vite app to static files and serves `/api/*` as serverless functions from the same domain, so this split is purely a local-dev convenience.

### 6. Dry-run before the event

With both dev servers running (terminals 1 and 2 above), run the simulation against the API server directly:

```bash
npm run simulate -- --base-url http://localhost:3000
```

This scripts one full round end-to-end (join, draft, force the attack phase, canned injection attempts, guesses) against your local server and exits non-zero if anything unexpected happens — a quick smoke test that the whole pipeline (auth, Redis, Gemini calls, filters, scoring) works before the real event.

## Deploying to Vercel

1. Push this repo to GitHub (or your git host of choice).
2. Import the project into Vercel.
3. In the Vercel project settings, add the same environment variables listed above (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `LLM_API_KEY`, `LLM_MODEL`, `SESSION_SECRET`, `ADMIN_TOKEN`) for the Production (and Preview, if you want) environment.
4. Deploy. Vercel will run `npm run build` and serve `/api` as serverless functions automatically per `vercel.json`.
5. Before the event, run `node scripts/seed.js` once against your production Redis (with `.env` pointed at the same Upstash credentials you set in Vercel) to seed teams, or set real teams via the Admin panel.

## Gameplay rules reference

- **Teams:** always exactly 2, with fixed internal ids (`team-alpha`, `team-bravo`). The admin can rename them and change join codes at any time; saving replaces the team list rather than adding to it.
- **Draft phase (5 min, default):** system prompt (max 400 words) and a job description (required to test). Each team's last saved vault is carried into the next round automatically (stored under `ctf:defense:<teamId>`, which survives an admin reset).
- **Helpfulness test (stops "impenetrable" vaults):** "Save & test" asks the vault 2 ordinary questions about its own job and has one grading call decide PASS/FAIL - 3 AI calls total. Results are cached by the vault's exact text, so re-testing unchanged text (or an unchanged vault carried into a new round) is free. Teams can test once every 30 seconds. When the attack phase starts, each vault's result is locked in with no AI calls; a vault that was never tested, or failed, **counts as broken**. A fixed platform preamble also tells every vault to genuinely help with its job.
- **Attack phase (10 min, default):** each team gets 3 tries against the *opponent's* vault. A try is a conversation of up to 8 messages (admin-configurable, "Messages per try") where the bot remembers earlier messages, and it ends with one password guess (or "start a fresh chat" to give it up). The phase ends at the timer, or once both teams are out of tries or have cracked the opponent.
- **Winning:** a team wins outright when the opponent's vault is broken (cracked or failed the helpfulness test) **and** its own vault is not. Anything else is a draw, and the admin starts a new round.
- **If the workshop runs out of time:** the admin can declare a manual winner or draw from the Admin panel to end the game.

## Security notes

- All secrets (`LLM_API_KEY`, `SESSION_SECRET`, `ADMIN_TOKEN`, Redis credentials) live only in serverless functions — never shipped to the frontend.
- Team identity is always read from a verified, `HttpOnly` session cookie — never trusted from the request body.
- Only one active session per team is allowed; joining from a new device invalidates the old one.
- No endpoint returns a vault's password, prompt, or filter to anyone but that team (or after the round is sealed, via the public scoreboard).
- All chat/vault text is rendered as plain text in React — never `dangerouslySetInnerHTML`.
- Attack messages are capped at 2000 characters and rate-limited to 1 per 2 seconds per team.
- If an LLM call fails or times out, the player sees a friendly error and it does **not** count against their message budget.
- **AI usage cap:** every AI call (attack chat, practice chat, helpfulness tests) reserves capacity from a Redis sliding window first. The whole game is capped at `LLM_MAX_CALLS_PER_MINUTE` (default 10), and each team at half of that, so one team can't starve the other. Over the cap, players see "The AI needs a short break. Try again in N seconds." 
