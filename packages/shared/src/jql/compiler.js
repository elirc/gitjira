import { NODE } from './parser.js';
import { JqlSyntaxError } from './tokenizer.js';

// LEARN: the compiler is step THREE — it walks the AST and produces the target
// representation. Here the target is a Prisma `where` object. This is exactly
// how real compilers work: the AST is a neutral middle form, and a "backend"
// turns it into something concrete (machine code, SQL, or — here — a query
// object). Swap this file and the same parser could target raw SQL or Mongo.

// WHY: an allowlist, not "trust the field name". A query language that lets a
// user filter on ANY column is an information-disclosure bug waiting to happen
// (imagine `passwordHash != ""`). Only these fields are queryable, and each
// maps to how it's filtered.
const FIELDS = {
  type: { column: 'type', kind: 'enum', enum: ['EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK'] },
  priority: {
    column: 'priority',
    kind: 'enum',
    enum: ['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST'],
  },
  status: { column: 'columnCategory', kind: 'status' }, // resolved via column relation
  assignee: { column: 'assigneeId', kind: 'user' },
  reporter: { column: 'reporterId', kind: 'user' },
  label: { column: 'labels', kind: 'array' },
  text: { column: '__fts__', kind: 'text' }, // free-text → full-text search
};

// Compile an AST into a Prisma `where` fragment.
// `ctx` carries request-scoped resolution: { userId } so `me` works.
export function compileJql(ast, ctx = {}) {
  if (ast === null) return {};
  return compileNode(ast, ctx);
}

function compileNode(node, ctx) {
  switch (node.type) {
    case NODE.AND:
      return { AND: [compileNode(node.left, ctx), compileNode(node.right, ctx)] };
    case NODE.OR:
      return { OR: [compileNode(node.left, ctx), compileNode(node.right, ctx)] };
    case NODE.CMP:
      return compileComparison(node, ctx);
    default:
      throw new JqlSyntaxError(`Unknown node type: ${node.type}`);
  }
}

function compileComparison(node, ctx) {
  const spec = FIELDS[node.field];
  if (!spec) {
    // GOTCHA: this error message lists the allowed fields — good errors teach
    // the user the grammar instead of just saying "no".
    throw new JqlSyntaxError(
      `Unknown field "${node.field}". Allowed: ${Object.keys(FIELDS).join(', ')}`
    );
  }

  // `me` resolves to the current user for user-typed fields.
  let value = node.value;
  if (spec.kind === 'user' && value === 'me') {
    if (!ctx.userId) throw new JqlSyntaxError('"me" is only valid for a logged-in user');
    value = ctx.userId;
  }

  const negate = node.op === '!=';

  switch (spec.kind) {
    case 'enum': {
      const upper = String(value).toUpperCase();
      if (!spec.enum.includes(upper)) {
        throw new JqlSyntaxError(
          `"${value}" is not a valid ${node.field} (${spec.enum.join(', ')})`
        );
      }
      return { [spec.column]: negate ? { not: upper } : upper };
    }
    case 'user':
      return { [spec.column]: negate ? { not: value } : value };
    case 'array':
      // label = urgent  ->  labels has "urgent"
      return { labels: negate ? { hasEvery: [], NOT: { has: value } } : { has: value } };
    case 'status':
      // status = done -> the issue's column has that category
      return { column: { is: { category: String(value).toUpperCase() } } };
    case 'text':
      // free text → the full-text search relation, handled by the caller which
      // knows how to build the tsquery. We signal it with a sentinel.
      return { __text__: value };
    default:
      throw new JqlSyntaxError(`Unsupported field kind: ${spec.kind}`);
  }
}

export const QUERYABLE_FIELDS = Object.keys(FIELDS);
