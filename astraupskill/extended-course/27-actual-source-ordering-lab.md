# 27. Check the real ordering function without starting the app

The [fractional contract harness](labs/fractional_contract.mjs) imports the project's actual pure keyBetween function and uses Node's built-in assertions. It does not start the API, connect to a database, use Redis or modify application files. This complements the earlier Python specification model: one clarifies desired sprint states, while this harness executes a bounded piece of production source directly.

## Understand the generator

The harness begins with an empty ordered array and a fixed integer seed. At each step it chooses one gap between existing keys, calls keyBetween with the gap's bounds and inserts the returned key. It asserts that the key contains only the expected digit alphabet and lies strictly between non-null bounds. Repeating this process exercises increasingly varied shared prefixes and intervals.

The fixed seed makes the sequence reproducible. If an assertion fails, the insertion index and bounds can be recorded as a compact counterexample. A different seed explores another sequence, but repeatedly changing seeds until a test passes would be meaningless. Preserve failing inputs and investigate the contract they challenge.

## Run and record

From the course directory, run `node labs/fractional_contract.mjs`. The output reports assertion count, inserted keys, maximum key length, seed and scope. Record the actual result in your lab notes. The count is evidence that the generated sequence satisfied these properties, not a claim that every possible string input was checked.

The harness also checks uniqueness of the generated sequence, rejection of reversed or equal bounds and deterministic output for identical inputs. That last property explains why two concurrent callers using the same gap can choose the same key. It is expected algorithm behavior, not a concurrency solution. The harness intentionally does not assert that independently generated concurrent positions are unique.

In the authoring verification run, seed 731 produced 2,000 inserted keys, a maximum key length of four, and 6,004 passing assertions. Treat that output as one recorded run of the checked-in harness. If you change the seed or insertion strategy, save the new result separately so a reviewer can compare the exercised domains rather than assuming the counts describe identical coverage.

## Extend one dimension at a time

Add a narrow-interval insertion pattern that repeatedly inserts before the same upper bound. Measure maximum key length and compare it with the mixed-gap sequence. This teaches growth behavior without requiring a performance claim about the entire board. Keep the generated keys in memory; no database writes are necessary.

Then add malformed-input cases in a separate section. Decide the expected contract before testing arbitrary characters or empty bounds. The current function has limited explicit validation, so a characterization result may reveal accepted inputs outside the generated domain. Do not mix those findings into a statement that the valid generator failed unless the domain assumptions actually overlap.

## Database comparison remains separate

The harness uses JavaScript string comparison. A database column's collation can order strings differently depending on configuration. A relational contract test should insert a representative generated set and compare database order with the expected JavaScript order. That test needs a disposable database and an explicit collation observation. The Node harness alone does not establish it.

Likewise, the browser can compute positions using stale neighbors. A pure function cannot know that another user moved those neighbors. A multi-client test must examine the command protocol and tie policy. This is why test reports should name the layer rather than say “ordering is fully verified.”

## Mutation exercise

In a disposable copy, change the strict bound rejection or the midpoint digit calculation. Run the generated sequence and identify the first failing property. Explain whether the fault violates alphabet membership, lower ordering, upper ordering or uniqueness. A useful failure points directly to the contract rather than merely producing a different arbitrary string.

Submit the unmodified run output, one captured mutant counterexample and a plan for the database collation test. A strong answer explains both what actual-source execution adds and what remains outside its scope. The distinction is central to honest verification throughout this course.

[Index](README.md) · [Review notes](answers/13-final-workshop.md)
