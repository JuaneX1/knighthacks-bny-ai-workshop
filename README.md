# Prompt Wars

A prompt-injection capture-the-flag game we built for the KnightHacks x BNY workshop. Each team writes a chatbot that guards a secret password, then spends the next round trying to talk the other team's bot into giving up theirs.

You can run it as a duel (2 teams playing repeated rounds) or a tournament (4 teams: both semifinals run at the same time, then a final).

Every round has two phases, and both teams in a match play them at the same time:

1. Draft, 5 minutes. Write the rules (the system prompt) for your bot, then hit "Save & test". The bot has to pass a helpfulness test, so a bot that refuses everything doesn't count.
2. Attack, 10 minutes. Chat with the other team's bot. Each try is a conversation of up to 8 messages, and the bot remembers what you said earlier in it. A try ends with one password guess. You get as many tries as the clock allows.

You win a match if the other team's bot breaks (you cracked it, or it failed the helpfulness test) and yours doesn't. Anything else is a draw.

The setup we use is one device per team, one admin device to run the room, and a projector showing the scoreboard. If a team joins from a second device, the first one gets logged out.

## Stack

The frontend is React and Vite in plain JavaScript, styled with Tailwind. The backend is a set of Vercel serverless functions in `/api`. Serverless functions don't keep memory between requests, so all game state lives in Upstash Redis. The bots run on Google Gemini Flash through its OpenAI-compatible `chat/completions` endpoint.

## Project layout

```
/api            Vercel serverless functions (game logic, auth, LLM calls)
/lib            Shared server code: state machine, Redis keys, rate limits, LLM client
/src            React app (Vite)
/scripts        local API server, seed.js (demo data), simulate.js (end-to-end dry run)
/public/slides  The workshop slide deck
```

The comments in `lib/stateMachine.js` walk through how rounds and phases move from one to the next.

## Running it locally

You need:

- Node.js 18 or newer
- An [Upstash Redis](https://upstash.com/) database. The free tier is enough. You'll need its REST URL and token.
- A [Google AI Studio](https://aistudio.google.com/) API key for Gemini

Install dependencies and copy the env template:

```bash
npm install
cp .env.example .env
```

Then fill in `.env`:

| Variable | What to put there |
|---|---|
| `UPSTASH_REDIS_REST_URL` | From your Upstash database dashboard |
| `UPSTASH_REDIS_REST_TOKEN` | From your Upstash database dashboard |
| `LLM_API_KEY` | Your Google AI Studio key |
| `LLM_MAX_CALLS_PER_MINUTE` | Optional, defaults to `10`. Despite the name, this caps AI calls per 15-second window for the whole game, split evenly between playing teams. Use `20` for a 4-team tournament. |
| `LLM_MODEL` | For example `gemini-flash-lite-latest`. Google renames models often, so if this one starts returning 404s, list what your key can use with `GET https://generativelanguage.googleapis.com/v1beta/openai/models`. |
| `SESSION_SECRET` | Any long random string. It signs the team session cookies. |
| `ADMIN_TOKEN` | Any long random string. This is the admin login. |

If you'd rather keep env vars in the Vercel dashboard, install the Vercel CLI (`npm i -g vercel`), run `vercel link` and then `vercel env pull .env`. Either way works as long as `.env` ends up filled in.

Seed the demo teams:

```bash
npm run seed
```

That creates four teams with join codes `SPARK`, `THRIVE`, `OWNIT` and `CURIOUS`. A duel uses the first two. Running it again is safe.

Local dev needs two terminals. The first runs the API:

```bash
npm run dev:api
```

This is a small Express server (`scripts/local-api-server.js`) that serves the `/api` functions on `http://localhost:3000`. We don't use `vercel dev` for this because it tries to detect and run the frontend's dev script itself, and in this setup that recurses forever.

The second terminal runs the frontend:

```bash
npm run dev:web
```

Vite serves the app on `http://localhost:5173` and forwards `/api/*` to port 3000. Use port 5173 in the browser:

- `http://localhost:5173/` to join as a team
- `http://localhost:5173/admin` for the admin panel (log in with your `ADMIN_TOKEN`)
- `http://localhost:5173/scoreboard` for the projector view

In the admin panel, pick Duel or Tournament, save the teams (they're already seeded, but you can rename them or change codes), and start the first round.

In production none of this split exists. `vercel.json` builds the Vite app to static files and serves `/api/*` from the same domain.

### Dry run before the event

With both servers running, point the simulator at the API:

```bash
npm run simulate -- --base-url http://localhost:3000
```

It plays one full duel round (join, draft, force the attack phase, send some canned injection attempts, guess) and exits non-zero if anything looks off. After an admin reset, add `--tournament` to play both semifinals, settle a drawn semi and play the final. It's a quick way to check that auth, Redis, Gemini and scoring all work before people show up.

## Workshop slides

The deck is a single file, `public/slides/index.html`, served at `/slides/index.html` alongside the app. Arrow keys or a clicker's PageUp/PageDown move through it.

To edit slide text, run `npm run dev:web`, open `http://localhost:5173/slides/index.html` and press Shift+E (or add `?edit` to the URL). Click any text to change it, then hit Save to file. The dev server writes your edits straight into `public/slides/index.html`, so you commit it like any other change. If the dev server isn't running, for example on the deployed site, Download gives you the same file to drop in by hand. Layout and animation changes still mean editing the HTML yourself.

## Deploying to Vercel

1. Push the repo to GitHub and import it into Vercel.
2. In the project settings, add the same env vars as above (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `LLM_API_KEY`, `LLM_MODEL`, `SESSION_SECRET`, `ADMIN_TOKEN`) for Production, and for Preview if you want previews to work.
3. Deploy. Vercel runs `npm run build` and serves `/api` as functions, as configured in `vercel.json`.
4. Before the event, either run `node scripts/seed.js` once with `.env` pointed at the production Redis, or set up the real teams in the admin panel.

## Game rules in detail

Teams. There are four fixed slots with ids `team-spark`, `team-thrive`, `team-own-it` and `team-curious`. A duel uses the first two and a tournament uses all four. The admin can rename teams and change join codes at any time. Saving the team list replaces it rather than adding to it.

Modes. The admin picks Duel or Tournament from the lobby. If a game has already been played, reset first.

- In a duel, the same two teams play rounds until one wins a match outright.
- In a tournament, round 1 is both semifinals at once (team 1 vs 2, team 3 vs 4) on the same timer, and round 2 is the final. There's no third-place match, so knocked-out teams watch. If a semifinal is drawn, the admin picks who goes through. If the final is drawn, the admin declares the winner from End game.

Draft phase (5 minutes by default). Teams write a system prompt, capped at 400 words and 3,000 characters. The character cap is there so nobody gets around the word limit by joining words with underscores. They also write a job description, which the helpfulness test needs. Whatever a team saved last carries over into the next round, stored under `ctf:defense:<teamId>`. An admin reset clears it, so a new game starts with blank bots.

Helpfulness test. Without this, the winning strategy would be a bot that refuses to say anything. "Save & test" asks the bot two ordinary questions about its job, and a third AI call grades the answers PASS or FAIL. Results are cached by the bot's exact text, so testing unchanged text again, or a bot carried over from last round, costs nothing. A team can test once every 30 seconds. When the attack phase starts, each bot's last result is locked in with no new AI calls, and a bot that never passed counts as broken. Every bot also gets a fixed preamble telling it to actually help with its job.

Attack phase (10 minutes by default). Tries are unlimited. Each try is a conversation of up to 8 messages (the admin can change this under "Messages per try"), and it ends with a guess or with "start a fresh chat", which gives the try up. The phase ends when the admin ends it, or by itself once every playing team has cracked its opponent. The timers are only a guide: when one hits zero, play continues until the admin moves on.

Winning. A team wins the match when the opponent's bot is broken (cracked, or failed the helpfulness test) and its own bot isn't. Anything else is a draw. In a duel the admin starts another round. In a tournament the admin decides.

If the workshop runs long, the admin can declare a winner or a draw from the admin panel and end the game.

## Security notes

- Every secret (`LLM_API_KEY`, `SESSION_SECRET`, `ADMIN_TOKEN` and the Redis credentials) stays in the serverless functions. None of it reaches the browser.
- The server reads team identity from a signed `HttpOnly` session cookie. It never trusts a team id sent in a request body.
- Each team has one active session. Joining from a new device ends the old one.
- No endpoint shows a bot's password or prompt to anyone except its own team, until the round is sealed and the scoreboard reveals it.
- Chat and prompt text is rendered as plain text in React, never through `dangerouslySetInnerHTML`.
- Attack messages can be up to 10,000 characters, which leaves room for prompt stuffing and many-shot examples. Each team can send one every 2 seconds.
- The game doesn't filter the bot's output during the attack phase. If a defender's prompt lets the bot say the password, the attacker sees it. Keeping the password safe is entirely the defending team's job. The draft-phase practice chat behaves the same way but uses a decoy password, so defenders see exactly what an attacker would.
- If an LLM call fails or times out, the player gets a friendly error and the message doesn't count against their budget.
- Every AI call (attack chat, practice chat, helpfulness tests) reserves a slot in a Redis sliding window first. The whole game gets `LLM_MAX_CALLS_PER_MINUTE` calls per 15-second window (10 by default), and each playing team gets an equal share with a minimum of 3, so one team can't starve the others. Over the cap, players see "The AI needs a short break. Try again in N seconds."

## Usage budget

Most Redis traffic comes from polling, not from playing. Team pages poll `/api/status` every 3 seconds, which costs about 5 Redis commands each time (2 for knocked-out teams). The projector and admin poll `/api/scoreboard` every 5 seconds at 3 commands, however many rounds have been played. Waiting screens check the scoreboard every 15 seconds.

| | Polling, roughly | Most AI calls in one attack phase |
|---|---|---|
| Duel | ~300 commands/min | 400 at the default cap |
| Tournament semifinals | ~550 commands/min | 800 with the cap at 20 |
| Tournament final | ~350 commands/min | 800 with the cap at 20 |

Since tries are unlimited, the rate cap sets the AI ceiling: 10 calls per 15 seconds over a 10-minute attack phase comes to 400. Real games use far less, because teams spend most of their time reading replies and thinking. Draft-phase tests come on top of that. Each attack message adds about 12 Redis commands. Storage stays small: a worst-case round where every message is 10,000 characters takes about 2 MB.
