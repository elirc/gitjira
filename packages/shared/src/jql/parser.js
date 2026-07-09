import { tokenize, TOKEN, JqlSyntaxError } from './tokenizer.js';

// LEARN: a recursive-descent parser turns a flat token list into a TREE (an
// "Abstract Syntax Tree" / AST) that captures structure. `a = 1 AND b = 2`
// becomes:
//   { type: 'and', left: {comparison a=1}, right: {comparison b=2} }
// "Recursive descent" means: one function per grammar rule, and rules call each
// other (and themselves) — the shape of the code mirrors the shape of the
// grammar. It reads like the grammar it implements, which is why it's the
// go-to technique for hand-written parsers.
//
// The grammar (EBNF) we implement:
//   query      = orExpr
//   orExpr     = andExpr ( "OR" andExpr )*
//   andExpr    = primary ( "AND" primary )*
//   primary    = "(" orExpr ")" | comparison
//   comparison = FIELD OP VALUE
//
// GOTCHA: notice orExpr calls andExpr, not the other way round. That ordering
// is what encodes precedence — the operator parsed LOWER in the call stack
// binds TIGHTER. Get it backwards and `a OR b AND c` groups wrong. (This
// exact ordering is the subject of a review finding on this PR — read on.)

export const NODE = { AND: 'and', OR: 'or', CMP: 'comparison' };

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.i = 0;
  }

  peek() {
    return this.tokens[this.i];
  }
  next() {
    return this.tokens[this.i++];
  }
  expect(type) {
    const t = this.next();
    if (t.type !== type) {
      throw new JqlSyntaxError(`Expected ${type} but got "${t.value ?? t.type}"`, t.pos);
    }
    return t;
  }

  parse() {
    const node = this.orExpr();
    this.expect(TOKEN.EOF); // no trailing garbage allowed
    return node;
  }

  orExpr() {
    let left = this.andExpr();
    while (this.peek().type === TOKEN.OR) {
      this.next();
      const right = this.andExpr();
      left = { type: NODE.OR, left, right };
    }
    return left;
  }

  // 🎯 PLANTED: this looks like andExpr but it recurses into orExpr, giving
  // AND and OR the SAME precedence (whatever appears first wins). The correct
  // version recurses into `primary`. The bug is caught in review with a
  // disambiguation test.
  andExpr() {
    let left = this.primary();
    while (this.peek().type === TOKEN.AND) {
      this.next();
      const right = this.orExpr();
      left = { type: NODE.AND, left, right };
    }
    return left;
  }

  primary() {
    if (this.peek().type === TOKEN.LPAREN) {
      this.next();
      const node = this.orExpr();
      this.expect(TOKEN.RPAREN);
      return node;
    }
    return this.comparison();
  }

  comparison() {
    const field = this.next();
    if (field.type !== TOKEN.WORD) {
      throw new JqlSyntaxError(
        `Expected a field name but got "${field.value ?? field.type}"`,
        field.pos
      );
    }
    const op = this.expect(TOKEN.OP);
    const valueToken = this.next();
    if (valueToken.type !== TOKEN.WORD && valueToken.type !== TOKEN.VALUE) {
      throw new JqlSyntaxError(`Expected a value after "${op.value}"`, valueToken.pos);
    }
    return {
      type: NODE.CMP,
      field: field.value.toLowerCase(),
      op: op.value,
      value: valueToken.value,
    };
  }
}

// Public entry point: text → AST. Throws JqlSyntaxError on malformed input.
export function parseJql(input) {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return null; // empty query = no filter
  return new Parser(tokenize(trimmed)).parse();
}
