// LEARN: Express 4 predates async/await — a rejected promise in a handler
// never reaches the error middleware; the request just hangs. This wrapper
// is the entire fix: catch the rejection, hand it to next(err), and the
// centralized error handler is reachable again. Express 5 does this
// natively; until then, every async route goes through here.
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
