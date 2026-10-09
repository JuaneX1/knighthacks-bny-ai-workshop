import { HttpError } from './http.js';

const MAX_PROMPT_WORDS = 400;
// Words are counted by whitespace, so without a character cap the word limit could be dodged by
// joining words with underscores or zero-width spaces. 400 ordinary words is about 2,500 characters.
const MAX_PROMPT_CHARS = 3000;
// Long enough for prompt stuffing / many-shot examples, short enough to keep AI costs sane.
export const MAX_MESSAGE_CHARS = 10000;

export function validateVaultInput(body) {
  const systemPrompt = String(body.systemPrompt || '');
  const jobDescription = String(body.jobDescription || '').slice(0, 200);

  if (systemPrompt.length > MAX_PROMPT_CHARS) {
    throw new HttpError(
      400,
      `System prompt must be ${MAX_PROMPT_CHARS.toLocaleString()} characters or fewer (got ${systemPrompt.length.toLocaleString()})`,
    );
  }

  const wordCount = systemPrompt.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > MAX_PROMPT_WORDS) {
    throw new HttpError(400, `System prompt must be ${MAX_PROMPT_WORDS} words or fewer (got ${wordCount})`);
  }

  return { systemPrompt, jobDescription };
}

export function validateAttackMessage(body) {
  const message = String(body.message || '');
  if (!message.trim()) throw new HttpError(400, 'message is required');
  if (message.length > MAX_MESSAGE_CHARS) {
    throw new HttpError(400, `Message must be ${MAX_MESSAGE_CHARS} characters or fewer`);
  }
  return message;
}
