// @ts-check
// LEARN: one error shape for the whole API: { error: { code, message, details } }.
// CODES are the contract — clients switch on them and they never change.
// MESSAGES are for humans and can be reworded freely. Mixing those two
// concerns up (clients parsing message strings) is how error handling
// calcifies into load-bearing typos.
export const ERROR_CODES = {
  VALIDATION_FAILED: { status: 400 },
  UNAUTHENTICATED: { status: 401 },
  FORBIDDEN: { status: 403 },
  NOT_FOUND: { status: 404 },
  CONFLICT: { status: 409 },
  INTERNAL: { status: 500 },
};

/** @typedef {keyof typeof ERROR_CODES} ErrorCode */

export class ApiError extends Error {
  /**
   * @param {ErrorCode} code
   * @param {string} message
   * @param {unknown} [details]
   */
  constructor(code, message, details) {
    super(message);
    if (!ERROR_CODES[code]) throw new Error(`Unknown error code: ${code}`);
    this.code = code;
    this.statusCode = ERROR_CODES[code].status;
    this.details = details;
  }
}

/** @param {string} [what] */
export const notFound = (what = 'Resource') => new ApiError('NOT_FOUND', `${what} not found`);
/** @param {string} [message] */
export const forbidden = (message = 'You do not have permission to do that') =>
  new ApiError('FORBIDDEN', message);
/** @param {string} message */
export const conflict = (message) => new ApiError('CONFLICT', message);
/** @param {string} [message] */
export const unauthenticated = (message = 'Authentication required') =>
  new ApiError('UNAUTHENTICATED', message);
