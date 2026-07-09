import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { tokenize } from '../src/jql/tokenizer.js';
import { parseJql, NODE } from '../src/jql/parser.js';
import { compileJql } from '../src/jql/compiler.js';

// LEARN: table-driven tests. One array of {input, expected} rows, one loop.
// Adding a case is adding a row — the test body never changes. This is the
// natural shape for testing a function with many small input/output pairs.
describe('tokenizer', () => {
  const cases = [
    ['type = bug', ['WORD', 'OP', 'WORD', 'EOF']],
    ['a != b', ['WORD', 'OP', 'WORD', 'EOF']],
    ['x >= 5', ['WORD', 'OP', 'WORD', 'EOF']],
    ['a = b AND c = d', ['WORD', 'OP', 'WORD', 'AND', 'WORD', 'OP', 'WORD', 'EOF']],
    ['(a = b)', ['LPAREN', 'WORD', 'OP', 'WORD', 'RPAREN', 'EOF']],
    ['title = "New York"', ['WORD', 'OP', 'VALUE', 'EOF']],
  ];
  it.each(cases)('tokenizes %s', (input, expected) => {
    expect(tokenize(input).map((t) => t.type)).toEqual(expected);
  });

  it('keeps != as one token, not two (operator ordering)', () => {
    expect(tokenize('a != b')[1].value).toBe('!=');
  });
});

describe('parser', () => {
  it('builds a comparison node', () => {
    expect(parseJql('type = bug')).toMatchObject({
      type: NODE.CMP,
      field: 'type',
      op: '=',
      value: 'bug',
    });
  });

  it('parses AND', () => {
    const ast = parseJql('type = bug AND assignee = me');
    expect(ast.type).toBe(NODE.AND);
  });

  it('parenthesized groups override structure', () => {
    const ast = parseJql('(type = bug OR type = task) AND assignee = me');
    expect(ast.type).toBe(NODE.AND);
    expect(ast.left.type).toBe(NODE.OR);
  });

  it('rejects trailing garbage', () => {
    expect(() => parseJql('type = bug extra')).toThrow();
  });
});

describe('compiler', () => {
  it('resolves me to the current user', () => {
    const where = compileJql(parseJql('assignee = me'), { userId: 'u1' });
    expect(where).toEqual({ assigneeId: 'u1' });
  });

  it('validates enum values against the allowlist', () => {
    expect(() => compileJql(parseJql('type = notarealtype'))).toThrow();
  });

  it('rejects unknown fields (no filtering on arbitrary columns)', () => {
    expect(() => compileJql(parseJql('passwordHash = x'))).toThrow();
  });

  it('compiles AND to a Prisma AND array', () => {
    const where = compileJql(parseJql('type = bug AND priority = high'));
    expect(where).toHaveProperty('AND');
  });
});

// LEARN: fuzz test. fast-check throws thousands of random strings at the
// tokenizer+parser and asserts one thing: it never throws anything OTHER than
// our own JqlSyntaxError. A parser that crashes with a raw TypeError on weird
// input is a parser that will 500 in production. This guards the whole class.
describe('fuzzing — never crashes ungracefully', () => {
  it('random input either parses or throws JqlSyntaxError, never anything else', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        try {
          parseJql(s);
        } catch (e) {
          return e.name === 'JqlSyntaxError';
        }
        return true;
      }),
      { numRuns: 1000 }
    );
  });
});

// LEARN: this test pins TREE SHAPE, not just "does it parse". Precedence bugs
// parse fine — they build the wrong tree. Review finding on PR #57.
describe('parser — operator precedence', () => {
  it('binds AND tighter than OR: "a AND b OR c" is "(a AND b) OR c"', () => {
    const ast = parseJql('type = bug AND priority = high OR type = story');
    // top node must be OR, with the AND on its left
    expect(ast.type).toBe(NODE.OR);
    expect(ast.left.type).toBe(NODE.AND);
    expect(ast.right.type).toBe(NODE.CMP);
  });
});
