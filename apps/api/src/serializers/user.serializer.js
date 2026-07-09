// LEARN: serialization is explicit — an allowlist, never a spread of the
// model. `{ ...user }` leaks whatever column gets added next year; this
// function can only ever leak what someone deliberately typed here. Review
// finding on PR #17 (password hashes were in every auth response); the
// pattern is the fix, the patch is incidental.
export function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  };
}
