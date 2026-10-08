import 'dotenv/config';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const TEAMS = [
  { teamId: 'team-spark', name: 'Team SPARK', joinCode: 'SPARK' },
  { teamId: 'team-thrive', name: 'Team THRIVE', joinCode: 'THRIVE' },
  { teamId: 'team-own-it', name: 'Team OWN IT', joinCode: 'OWNIT' },
  { teamId: 'team-curious', name: 'Team CURIOUS', joinCode: 'CURIOUS' },
];

async function main() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.error('Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN in environment.');
    process.exit(1);
  }

  const existingGame = await redis.hgetall('ctf:game');
  if (existingGame && existingGame.state && !['lobby', undefined].includes(existingGame.state)) {
    console.warn(
      `Warning: ctf:game.state is currently "${existingGame.state}" (a game may be in progress). Re-seeding teams anyway, but NOT touching game state.`,
    );
  }

  // Replace (never append to) the team list, dropping any stale join codes.
  const staleCodeKeys = await redis.keys('ctf:joincode:*');
  await redis.del('ctf:teams', ...staleCodeKeys);
  for (const t of TEAMS) {
    await redis.hset('ctf:teams', { [t.teamId]: JSON.stringify({ name: t.name, joinCode: t.joinCode }) });
    await redis.set(`ctf:joincode:${t.joinCode.toLowerCase()}`, t.teamId);
    console.log(`Seeded ${t.name} (join code: ${t.joinCode})`);
  }

  if (!existingGame || !existingGame.state) {
    await redis.hset('ctf:game', { state: 'lobby', roundNumber: '0' });
    console.log('Initialized ctf:game to lobby.');
  }

  console.log('\nSeed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
