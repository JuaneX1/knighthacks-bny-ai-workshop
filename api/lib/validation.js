import { HttpError } from './http.js';

const MAX_PROMPT_WORDS = 400;
const MAX_REGEX_PATTERNS = 10;
const MAX_REGEX_LENGTH = 200;
const MAX_MESSAGE_CHARS = 2000;

export function validateVaultInput(body) {
  const systemPrompt = String(body.systemPrompt || '');
  const jobDescription = String(body.jobDescription || '').slice(0, 200);
  const filterMode = ['none', 'regex', 'llm'].includes(body.filterMode) ? body.filterMode : 'none';
  const filterRegexList = Array.isArray(body.filterRegexList) ? body.filterRegexList.map(String) : [];

  const wordCount = systemPrompt.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > MAX_PROMPT_WORDS) {
    throw new HttpError(400, `System prompt must be ${MAX_PROMPT_WORDS} words or fewer (got ${wordCount})`);
  }

  if (filterMode === 'regex') {
    if (filterRegexList.length > MAX_REGEX_PATTERNS) {
      throw new HttpError(400, `At most ${MAX_REGEX_PATTERNS} regex patterns allowed`);
    }
    for (const pattern of filterRegexList) {
      if (pattern.length > MAX_REGEX_LENGTH) {
        throw new HttpError(400, `Regex patterns must be ${MAX_REGEX_LENGTH} characters or fewer`);
      }
      try {
        // eslint-disable-next-line no-new
        new RegExp(pattern);
      } catch {
        throw new HttpError(400, `Invalid regex pattern: ${pattern}`);
      }
    }
  }

  return { systemPrompt, jobDescription, filterMode, filterRegexList };
}

export function validateAttackMessage(body) {
  const message = String(body.message || '');
  if (!message.trim()) throw new HttpError(400, 'message is required');
  if (message.length > MAX_MESSAGE_CHARS) {
    throw new HttpError(400, `Message must be ${MAX_MESSAGE_CHARS} characters or fewer`);
  }
  return message;
}
