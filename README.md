# Prompt Injection Workshop

A live, two-team prompt-injection capture-the-flag game for a hackathon workshop.

Every round, **both teams simultaneously**:
1. **Draft (5 min)** — write a system prompt / rules for their own vault chatbot, which hides a secret password.
2. **Attack (5 min)** — get 3 attempts against the *opponent's* vault: each attempt is one chat prompt plus an optional one password guess.

A team **wins the whole game** the instant it cracks the opponent's password while its own vault survives uncracked. Anything else is a draw, and the admin starts a new round. Designed for exactly 3 concurrent devices: one per team, plus one admin device that runs the room. Joining from a new device invalidates a team's previous session, so only one device per team can be active at a time.

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

See the plan/comments in `api/lib/stateMachine.js` for the full round/phase state machine.

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

- **Draft phase (5 min, default):** system prompt (max 400 words), job description (free text — teams choose their own theme), optional output filter (regex list or a second LLM call that blocks replies revealing the password).
- **Utility check (automatic, at the end of draft):** the server generates 5 questions fitting the team's own job description, answers them through the vault, and grades each as on-topic/helpful. Passing requires 4/5. Defenders see pass/fail + score, never the questions.
- **Attack phase (5 min, default):** each team gets 3 attempts against the *opponent's* vault. One attempt = one single-turn chat message (no conversation history) plus an optional one password guess tied to that attempt. The phase ends at the timer, or once both teams have used all 3 attempts — whichever comes first.
- **Winning:** a team wins outright the moment it has cracked the opponent's password **and** its own vault survived (uncracked + utility check passed). Anything else is a draw, and the admin starts a new round.
- **If the workshop runs out of time:** the admin can declare a manual winner or draw from the Admin panel to end the game.

## Security notes

- All secrets (`LLM_API_KEY`, `SESSION_SECRET`, `ADMIN_TOKEN`, Redis credentials) live only in serverless functions — never shipped to the frontend.
- Team identity is always read from a verified, `HttpOnly` session cookie — never trusted from the request body.
- Only one active session per team is allowed; joining from a new device invalidates the old one.
- No endpoint returns a vault's password, prompt, or filter to anyone but that team (or after the round is sealed, via the public scoreboard).
- All chat/vault text is rendered as plain text in React — never `dangerouslySetInnerHTML`.
- Attack messages are capped at 2000 characters and rate-limited to 1 per 2 seconds per team.
- If an LLM call fails or times out, the player sees a friendly error and it does **not** count against their attempt budget.
