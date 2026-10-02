/** Strips everything but letters/digits and lowercases, so "Copper-Lantern", "copper lantern",
 * and "c o p p e r l a n t e r n" all normalize the same way. */
function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * True if the literal password appears in the reply, however it's spaced/punctuated/cased.
 * Informational only - the game does not block or rewrite replies based on this. Each vault's
 * own system prompt is the only thing standing between an attacker and the password; teams build
 * their own defenses instead of relying on a platform-level guard.
 */
export function revealsPassword(replyText, password) {
  const normalizedPassword = normalize(password || '');
  return Boolean(normalizedPassword) && normalize(replyText).includes(normalizedPassword);
}
