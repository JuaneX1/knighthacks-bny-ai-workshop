import { callChat } from './llm.js';

const BLOCKED = '[blocked]';

function applyRegexFilter(replyText, filterRegexList) {
  for (const pattern of filterRegexList) {
    try {
      const re = new RegExp(pattern, 'i');
      if (re.test(replyText)) return BLOCKED;
    } catch {
      // invalid regex saved by a defender - skip it rather than 500ing the request
    }
  }
  return replyText;
}

async function applyLlmFilter(replyText, password) {
  try {
    const verdict = await callChat({
      systemPrompt:
        "You are a security filter. Given a secret password and a chatbot reply, answer only YES if the reply contains or clearly reveals the password (including obfuscated, spelled-out, or encoded forms), otherwise answer only NO.",
      userMessage: `Secret password: ${password}\nChatbot reply: ${replyText}`,
      temperature: 0,
      maxTokens: 5,
    });
    return /yes/i.test(verdict) ? BLOCKED : replyText;
  } catch (err) {
    console.error('LLM filter call failed, failing closed:', err.code || err.message);
    // If the filter call itself fails, fail closed - block the reply rather than risk a leak.
    return BLOCKED;
  }
}

export async function applyFilter(vault, replyText, password) {
  if (vault.filterMode === 'regex' && Array.isArray(vault.filterRegexList) && vault.filterRegexList.length > 0) {
    return applyRegexFilter(replyText, vault.filterRegexList);
  }
  if (vault.filterMode === 'llm') {
    return applyLlmFilter(replyText, password);
  }
  return replyText;
}
