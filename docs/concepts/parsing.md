# Concept: how to parse a small language

_A one-page primer you can read without the codebase. It explains the idea behind the
JQL-lite feature in Sprint 06._

Most engineers treat "parsing" as black magic reserved for compiler authors. It isn't.
Turning `type = bug AND assignee = me` into something a program can act on is a three-step
pipeline, and each step is small.

## The pipeline: text → tokens → tree → output

```
"type = bug AND assignee = me"
        │  tokenizer (lexer)
        ▼
[WORD type] [OP =] [WORD bug] [AND] [WORD assignee] [OP =] [WORD me] [EOF]
        │  parser
        ▼
        AND
       /   \
   type=bug   assignee=me
        │  compiler
        ▼
{ AND: [ {type: "BUG"}, {assigneeId: "<me>"} ] }   ← a Prisma where clause
```

### 1. Tokenizer (a.k.a. lexer)

Scans the characters left to right and groups them into **tokens** — the "words" of the
language. It answers _"what are the pieces?"_ but not _"what do they mean together?"_. It
handles the fiddly character-level stuff (quotes, multi-character operators like `!=`,
whitespace) so the parser never has to.

### 2. Parser

Consumes tokens and builds a **tree** (an Abstract Syntax Tree). The tree captures
_structure_ — what groups with what. `a AND b OR c` is ambiguous as text; the tree makes
it unambiguous.

We use **recursive descent**: one function per grammar rule, rules calling each other. The
code ends up shaped like the grammar:

```
orExpr  = andExpr ( "OR"  andExpr )*
andExpr = primary ( "AND" primary )*
primary = "(" orExpr ")" | comparison
```

**Precedence falls out of the call order.** `orExpr` calls `andExpr`, so AND (parsed
deeper) binds tighter than OR — exactly like `*` binds tighter than `+` in arithmetic. Flip
which function calls which and you flip the precedence. (Getting this wrong is a classic
bug — and it's the one the Sprint 06 PR review catches.)

### 3. Compiler / evaluator

Walks the tree and produces the **output** you actually want. The tree is a neutral middle
form, so the same parser can target different backends: here we emit a database query
object, but you could emit SQL, or evaluate the tree directly.

## Why separate the steps?

- Each step is independently testable (tokenizer tests, parser tests, compiler tests).
- Each is small and single-purpose — the tokenizer never thinks about grammar; the parser
  never touches raw characters.
- You can change the target (step 3) without touching how you understand the input.

## Two habits that keep parsers safe

- **Allowlist the fields.** A query language that filters on _any_ column leaks data. Only
  expose fields you intend to be queryable.
- **Fuzz it.** Throw thousands of random strings at it and assert it only ever throws _your_
  error type, never a raw crash. A parser that 500s on weird input is a parser attackers
  enjoy.

## Go deeper

- Recursive descent & precedence: Crafting Interpreters (Nystrom), the "Parsing Expressions"
  chapter — free online.
- The same three steps scale from this 120-line toy up to real compilers.
