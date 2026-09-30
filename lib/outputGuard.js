const MASKED_REPLY = '[response withheld]';

/** Strips everything but letters/digits and lowercases, so "Copper-Lantern", "copper lantern",
 * and "c o p p e r l a n t e r n" all normalize the same way. */
function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Always-on, zero-token output guard: masks the reply if the literal password appears in it,
 * however it's spaced/punctuated/cased. This is infrastructure, not part of the prompt, so it
 * can't be argued away by a jailbreak - it only catches the model actually saying the password,
 * never hints, paraphrases, or encodings, so the defending team's prompt still does the real work.
 */
export function guardReply(replyText, password) {
  if (!password) return replyText;
  const normalizedReply = normalize(replyText);
  const normalizedPassword = normalize(password);
  if (normalizedPassword && normalizedReply.includes(normalizedPassword)) {
    return MASKED_REPLY;
  }
  return replyText;
}
