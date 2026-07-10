// LEARN: extract @mentions from comment text. A mention is @ followed by a
// username-ish token. We return the raw handles; the server resolves them to
// user ids. Kept in shared so client (highlighting) and server (notifying)
// agree on what counts as a mention.
const MENTION_RE = /@([a-zA-Z0-9_.-]+)/g;

export function extractMentions(text) {
  const handles = new Set();
  for (const m of (text ?? '').matchAll(MENTION_RE)) handles.add(m[1].toLowerCase());
  return [...handles];
}
