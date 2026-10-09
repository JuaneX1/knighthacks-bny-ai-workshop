# Prompt Injection Workshop - KnightHacks

A live prompt-injection capture-the-flag game for a hackathon workshop. Play it as a **duel** (2 teams, repeated rounds) or a **tournament** (4 teams, knockout: two semifinals at the same time, then a final).

Every round, **each team in a match simultaneously**:
1. **Draft (5 min)** — write a system prompt / rules for their own vault chatbot, which hides a secret password, then "Save & test" it so it passes a helpfulness test.
2. **Attack (10 min)** — get unlimited tries against the *opponent's* vault: each try is a conversation of up to 8 messages (the bot remembers the conversation) that ends with one password guess.

A team **wins a match** when the opponent's vault breaks (cracked, or failed the helpfulness test) while its own vault holds up. Anything else is a draw. Designed for one device per team, plus one admin device that runs the room and an optional projector showing the scoreboard. Joining from a new device invalidates a team's previous session, so only one device per team can be active at a time.

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
| `LLM_MAX_CALLS_PER_MINUTE` | Optional, default `10`. Hard cap on AI calls per 15-second window across the whole game (each playing team gets an equal share). Set `20` for a 4-team tournament. |
| `LLM_MODEL` | e.g. `gemini-flash-lite-latest` (fast and currently available; Google's dated model names churn quickly, so check `GET https://generativelanguage.googleapis.com/v1beta/openai/models` with your key if this one ever 404s) |
| `SESSION_SECRET` | Any long random string (used to sign team session cookies) |
| `ADMIN_TOKEN` | Any long random string (the admin's login token) |

When running via `vercel dev`, also link the project (`vercel link`) and run `vercel env pull .env` if you'd rather manage env vars through the Vercel dashboard — either approach works as long as `.env` ends up populated for local dev.

### 4. Seed demo data

```bash
npm run seed
```

This creates 4 demo teams: `Team SPARK` (`SPARK`), `Team THRIVE` (`THRIVE`), `Team OWN IT` (`OWNIT`) and `Team CURIOUS` (`CURIOUS`). A duel uses the first two. Re-running is safe.

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

- Join as a team: `http://localhost:5173/` with join code `SPARK`, `THRIVE`, `OWNIT` or `CURIOUS`.
- Admin panel: `http://localhost:5173/admin` — enter your `ADMIN_TOKEN`.
- Scoreboard (public, projector-friendly): `http://localhost:5173/scoreboard`.

From the admin panel: pick the mode (Duel or Tournament), save teams (already seeded, but you can rename/rejoin them), then start the first round to kick off the draft phase.

In production on Vercel there's no separate frontend dev server — `vercel.json` builds the Vite app to static files and serves `/api/*` as serverless functions from the same domain, so this split is purely a local-dev convenience.

### 6. Dry-run before the event

With both dev servers running (terminals 1 and 2 above), run the simulation against the API server directly:

```bash
npm run simulate -- --base-url http://localhost:3000
```

This scripts one full duel round end-to-end (join, draft, force the attack phase, canned injection attempts, guesses) against your local server and exits non-zero if anything unexpected happens. Add `--tournament` (after an admin reset) to run the semifinals, settle any drawn semi, and play the final — a quick smoke test that the whole pipeline (auth, Redis, Gemini calls, filters, scoring) works before the real event.

## Workshop slides

The slide deck is one self-contained file, `public/slides/index.html`, served at `/slides/index.html` on the same site as the app. Arrow keys (or a clicker's PageUp/PageDown) move through it.

To edit the text, run `npm run dev:web`, open `http://localhost:5173/slides/index.html`, and press **Shift+E** (or add `?edit` to the URL). Click any text to change it, then **Save to file**: the dev server writes the change straight into `public/slides/index.html`, so commit it like any other file. **Download** gives you the same file if the dev server isn't running (for example on the deployed site). Layout and animation changes still happen in the HTML by hand.

## Deploying to Vercel

1. Push this repo to GitHub (or your git host of choice).
2. Import the project into Vercel.
3. In the Vercel project settings, add the same environment variables listed above (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `LLM_API_KEY`, `LLM_MODEL`, `SESSION_SECRET`, `ADMIN_TOKEN`) for the Production (and Preview, if you want) environment.
4. Deploy. Vercel will run `npm run build` and serve `/api` as serverless functions automatically per `vercel.json`.
5. Before the event, run `node scripts/seed.js` once against your production Redis (with `.env` pointed at the same Upstash credentials you set in Vercel) to seed teams, or set real teams via the Admin panel.

## Gameplay rules reference

- **Teams:** 4 fixed slots with internal ids `team-spark`, `team-thrive`, `team-own-it`, `team-curious`. A duel uses the first 2, a tournament all 4. The admin can rename them and change join codes at any time; saving replaces the team list rather than adding to it.
- **Modes:** the admin switches between Duel and Tournament from the lobby (reset first if a game was played).
  - **Duel:** the same 2 teams play rounds until one wins a match outright.
  - **Tournament (knockout):** round 1 is both semifinals at once (Team 1 vs 2, Team 3 vs 4) on shared timers; round 2 is the final between the semifinal winners. No third-place match - knocked-out teams watch. A drawn semifinal waits for the admin to pick who advances; a drawn final waits for the admin to declare the winner under End game.
- **Draft phase (5 min, default):** system prompt (max 400 words and 3,000 characters, so joining words with `_` can't dodge the word limit) and a job description (required to test). Each team's last saved vault is carried into the next round automatically (stored under `ctf:defense:<teamId>`). An admin reset clears these, so each new game starts with blank bots.
- **Helpfulness test (stops "impenetrable" vaults):** "Save & test" asks the vault 2 ordinary questions about its own job and has one grading call decide PASS/FAIL - 3 AI calls total. Results are cached by the vault's exact text, so re-testing unchanged text (or an unchanged vault carried into a new round) is free. Teams can test once every 30 seconds. When the attack phase starts, each vault's result is locked in with no AI calls; a vault that was never tested, or failed, **counts as broken**. A fixed platform preamble also tells every vault to genuinely help with its job.
- **Attack phase (10 min, default):** each team gets unlimited tries against its *opponent's* vault. A try is a conversation of up to 8 messages (admin-configurable, "Messages per try") where the bot remembers earlier messages, and it ends with one password guess (or "start a fresh chat" to give it up). The phase ends when the admin ends it, or on its own once every playing team has cracked its opponent. Phase timers are only a guide: play continues after one runs out until the admin moves on.
- **Winning a match:** a team wins when the opponent's vault is broken (cracked or failed the helpfulness test) **and** its own vault is not. Anything else is a draw: in a duel the admin starts a new round, in a tournament the admin decides.
- **If the workshop runs out of time:** the admin can declare a manual winner or draw from the Admin panel to end the game.

## Security notes

- All secrets (`LLM_API_KEY`, `SESSION_SECRET`, `ADMIN_TOKEN`, Redis credentials) live only in serverless functions — never shipped to the frontend.
- Team identity is always read from a verified, `HttpOnly` session cookie — never trusted from the request body.
- Only one active session per team is allowed; joining from a new device invalidates the old one.
- No endpoint returns a vault's password, prompt, or filter to anyone but that team (or after the round is sealed, via the public scoreboard).
- All chat/vault text is rendered as plain text in React — never `dangerouslySetInnerHTML`.
- Attack messages are capped at 10,000 characters (room for prompt stuffing and many-shot examples) and rate-limited to 1 per 2 seconds per team.
- There is no platform-level output filter during the attack phase - if a defender's prompt lets the bot say the password, the attacker sees it. Protecting the password is entirely the defending team's job, not a safety net the game provides. The draft-phase practice chat works the same way, but with a dummy password, so defenders see exactly what an attacker would.
- If an LLM call fails or times out, the player sees a friendly error and it does **not** count against their message budget.
- **AI usage cap:** every AI call (attack chat, practice chat, helpfulness tests) reserves capacity from a Redis sliding window first. The whole game is capped at `LLM_MAX_CALLS_PER_MINUTE` calls per 15-second window (default 10), and each playing team at an equal share of that (minimum 3), so no team can starve the others. Over the cap, players see "The AI needs a short break. Try again in N seconds."

## Usage budget

Most Redis traffic comes from polling, not gameplay. Team pages poll `/api/status` every 3s (about 5 Redis commands each, 2 for knocked-out teams); the projector and admin poll `/api/scoreboard` every 5s (3 commands, regardless of how many rounds were played); waiting screens check the scoreboard every 15s.

| | Polling, approx. | AI calls, max per round |
|---|---|---|
| Duel | ~300 commands/min | 48 attack calls + draft-phase tests |
| Tournament semifinals | ~550 commands/min | 96 attack calls + draft-phase tests |
| Tournament final | ~350 commands/min | 48 attack calls + draft-phase tests |

Each attack message adds roughly 12 commands on top. A full tournament is about 250 AI calls. Storage stays small: a worst-case round (every message 10,000 characters) is about 2MB.
