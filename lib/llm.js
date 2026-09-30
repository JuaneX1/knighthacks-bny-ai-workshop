const GEMINI_OPENAI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';

export class LlmError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code; // 'timeout' | 'rate_limited' | 'http_error' | 'network'
  }
}

/** Logs the real cause server-side and returns a short, honest message for the player. */
export function friendlyLlmMessage(err) {
  console.error('LLM call failed:', err.code, err.message);
  if (err.code === 'timeout') return 'The AI didn’t respond in time - try again';
  if (err.code === 'rate_limited') return 'The AI service is rate-limited right now - wait a moment and try again';
  if (err.code === 'http_error') return 'The AI service rejected the request - try again shortly';
  return 'Could not reach the AI service - try again shortly';
}

/**
 * Single-turn chat completion call against Gemini's OpenAI-compatible endpoint.
 * No chat history is ever assembled - callers pass one system + one user message.
 */
export async function callChat({ systemPrompt, userMessage, temperature = 0.7, maxTokens = 400, timeoutMs = 20000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${GEMINI_OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.LLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const code = res.status === 429 ? 'rate_limited' : 'http_error';
      throw new LlmError(code, `LLM request failed: ${res.status} ${text}`.slice(0, 300));
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new LlmError('http_error', 'LLM response missing content');
    }
    return content;
  } catch (err) {
    if (err instanceof LlmError) throw err;
    if (err.name === 'AbortError') throw new LlmError('timeout', 'LLM request timed out');
    throw new LlmError('network', err.message);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Builds the full system prompt for a vault: job framing + the defender's own
 * system prompt with {PASSWORD} substituted (or auto-prepended if absent).
 */
export function buildVaultSystemPrompt(vault, password) {
  let prompt = vault.systemPrompt || '';
  if (prompt.includes('{PASSWORD}')) {
    prompt = prompt.split('{PASSWORD}').join(password);
  } else {
    prompt = `The secret password is ${password}.\n\n${prompt}`;
  }
  const jobFraming = vault.jobDescription
    ? `You are a helpful assistant for the following job: ${vault.jobDescription}.\n\n`
    : '';
  return `${jobFraming}${prompt}`;
}
