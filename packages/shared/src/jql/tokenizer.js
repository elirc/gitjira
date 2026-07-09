// LEARN: a tokenizer (a.k.a. lexer) is step ONE of understanding any language —
// it turns a flat string into a list of meaningful chunks called "tokens".
// "type = bug AND assignee = me" becomes:
//   [FIELD "type"] [OP "="] [VALUE "bug"] [AND] [FIELD "assignee"] [OP "="] [VALUE "me"]
// The parser (next file) never touches raw characters — it works with these
// tokens, which is what makes the parser readable. Separating "recognize the
// words" from "understand the grammar" is the oldest trick in language work.

export const TOKEN = {
  WORD: 'WORD', // a bare word — the parser decides if it's a field or a value
  OP: 'OP',
  VALUE: 'VALUE', // a quoted value
  AND: 'AND',
  OR: 'OR',
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  EOF: 'EOF',
};

// Operators, longest-first so `!=` and `>=` win over `=` and `>` when we match.
// GOTCHA: order matters here — if `=` came before `!=`, "!=" would tokenize as
// [OP "!"]? no — as nothing valid, because we'd match "=" only after "!". Try
// reordering these and watch the `!=` test fail.
const OPERATORS = ['!=', '>=', '<=', '~', '=', '>', '<'];

const isSpace = (c) => c === ' ' || c === '\t' || c === '\n';
const isWordChar = (c) => /[A-Za-z0-9_\-.]/.test(c);

export class JqlSyntaxError extends Error {
  constructor(message, position) {
    super(message);
    this.name = 'JqlSyntaxError';
    this.position = position;
  }
}

export function tokenize(input) {
  const tokens = [];
  let i = 0;

  const keywordType = (word) => {
    const upper = word.toUpperCase();
    if (upper === 'AND') return TOKEN.AND;
    if (upper === 'OR') return TOKEN.OR;
    return null;
  };

  while (i < input.length) {
    const c = input[i];

    if (isSpace(c)) {
      i++;
      continue;
    }

    if (c === '(') {
      tokens.push({ type: TOKEN.LPAREN, value: '(', pos: i });
      i++;
      continue;
    }
    if (c === ')') {
      tokens.push({ type: TOKEN.RPAREN, value: ')', pos: i });
      i++;
      continue;
    }

    // Quoted value: "New York" stays one token, spaces and all.
    if (c === '"' || c === "'") {
      const quote = c;
      const start = i;
      i++; // skip opening quote
      let value = '';
      while (i < input.length && input[i] !== quote) {
        value += input[i];
        i++;
      }
      if (i >= input.length) throw new JqlSyntaxError('Unterminated quoted value', start);
      i++; // skip closing quote
      tokens.push({ type: TOKEN.VALUE, value, pos: start });
      continue;
    }

    // Operator?
    const op = OPERATORS.find((o) => input.startsWith(o, i));
    if (op) {
      tokens.push({ type: TOKEN.OP, value: op, pos: i });
      i += op.length;
      continue;
    }

    // A bare word: a field name, a value, or a keyword (AND/OR).
    if (isWordChar(c)) {
      const start = i;
      let word = '';
      while (i < input.length && isWordChar(input[i])) {
        word += input[i];
        i++;
      }
      const kw = keywordType(word);
      if (kw) {
        tokens.push({ type: kw, value: word, pos: start });
      } else {
        // WHY: we can't yet tell a field from a value — "bug" could be either.
        // The PARSER decides based on position (a name before `=` is a field,
        // after it is a value). The tokenizer's job is only "this is a word".
        tokens.push({ type: TOKEN.WORD, value: word, pos: start });
      }
      continue;
    }

    throw new JqlSyntaxError(`Unexpected character "${c}"`, i);
  }

  tokens.push({ type: TOKEN.EOF, value: null, pos: i });
  return tokens;
}
