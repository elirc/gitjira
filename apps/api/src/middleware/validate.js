// LEARN: validation happens at the boundary, before anything else runs.
// A controller downstream of this middleware can trust req.body completely —
// no defensive re-checking scattered through the codebase. Fail fast, fail
// with field-level detail, fail identically every time.
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        details: result.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      },
    });
  }

  // LEARN: replace the body with the PARSED value — zod has already trimmed
  // and lowercased. Downstream code sees normalized data or nothing.
  req.body = result.data;
  next();
};
