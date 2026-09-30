# Runnable worked notebook: Remove prerequisites one available issue at a time

This notebook adds three solved examples around the existing `orderIssues` teaching reference. It preserves the earlier unfinished starter. Reading or running these solved examples is study, not an independent completion of that exercise.

## Contract and owner

Input is a validated array of unique {id,dependsOn} records with string IDs and arrays of dependency IDs. Duplicate dependency tokens count once. Return all IDs in prerequisite-first order. Among currently available nodes, choose the code-unit smallest ID. A missing dependency throws RangeError("Missing dependency"); a cycle throws RangeError("Cycle"). Empty input returns empty. Never mutate inputs. This toy graph contract is not an assertion that the application currently implements dependency scheduling.

The [original coding exercise](../interview-03/coding/README.md) contains the complete practice workflow. The [reference source](../interview-03/_interviewer/reference.mjs) is deliberately separate from the starter. The new runner imports that reference and checks the literal expected values printed below; it does not call the live application.

## A slow walk through the main example

A has no prerequisites and is emitted first. Removing A makes B and C available. The code-unit tie rule chooses B before C. D still needs C after B completes, so it cannot be emitted yet. After C, D becomes available. The complete result is A,B,C,D; the dependency relation and tie rule both contribute to that sequence.

**The distinction to retain:** The available set must be recomputed as dependencies are satisfied; sorting IDs once is not a dependency plan.

Before looking at code, draw the state after each meaningful step. If the operation maintains an index or a set, write what enters it and what its key means. If it makes a transition decision, write the branch order and the first branch that accepts or rejects the input. These two ways of tracing make hidden assumptions more visible than jumping straight from input to final output.

Do not change the expected result merely to match an implementation. When there is a disagreement, return to the written contract. Decide whether the input violates a stated precondition, the expectation misreads a policy, or the implementation fails the rule. Each possibility leads to different corrective work.

## Example 1: Diamond dependency graph

Arguments, in parameter order:

```json
[
  [
    {
      "id": "B",
      "dependsOn": ["A"]
    },
    {
      "id": "C",
      "dependsOn": ["A"]
    },
    {
      "id": "A",
      "dependsOn": []
    },
    {
      "id": "D",
      "dependsOn": ["B", "C"]
    }
  ]
]
```

Expected returned value:

```json
["A", "B", "C", "D"]
```

Read the arguments before the result. Identify the entity identity, meaningful order, and boundary values. Then compare every result field, including preserved values and empty collections. A partial assertion can miss the exact distinction the example was chosen to expose.

## Example 2: Newly available node can precede an older ready node

Arguments, in parameter order:

```json
[
  [
    {
      "id": "Z",
      "dependsOn": []
    },
    {
      "id": "B",
      "dependsOn": []
    },
    {
      "id": "A",
      "dependsOn": ["B"]
    }
  ]
]
```

Expected returned value:

```json
["B", "A", "Z"]
```

Read the arguments before the result. Identify the entity identity, meaningful order, and boundary values. Then compare every result field, including preserved values and empty collections. A partial assertion can miss the exact distinction the example was chosen to expose.

## Example 3: Duplicate dependency tokens count once

Arguments, in parameter order:

```json
[
  [
    {
      "id": "B",
      "dependsOn": ["A", "A"]
    },
    {
      "id": "A",
      "dependsOn": []
    }
  ]
]
```

Expected returned value:

```json
["A", "B"]
```

Read the arguments before the result. Identify the entity identity, meaningful order, and boundary values. Then compare every result field, including preserved values and empty collections. A partial assertion can miss the exact distinction the example was chosen to expose.

## Run the worked examples

From this guided block's `examples` directory:

```powershell
node --test check.mjs
```

Three named checks compare complete returned values and confirm that the supplied argument values remain unchanged. The runner freezes input structures recursively, so accidental mutation is also exposed in these fixtures. It uses Node's built-in test and assertion modules and needs no install, server, database, account, or network call.

The reference function is imported from the preceding interview block. If you move this folder independently, preserve that relative relationship or update the import deliberately. The source link and import target are included in the local navigation checks. This runner does not alter or mark your earlier starter as solved.

## Read the implementation after the trace

This deliberately simple Kahn-style implementation repeatedly selects a currently dependency-free node and removes it from remaining dependency sets. If no node is ready while nodes remain, there is a cycle. It favors clarity over optimal runtime: repeated scans/deletions and ready-list sorts give a conservative O(V squared log V + E) bound with O(V+E) working space. An adjacency list, indegrees, and a min-heap can improve the selection strategy; preserve the specified tie behavior when comparing alternatives.

Now connect the explanation to actual lines in the reference. Mark input validation or assumed preconditions, identity construction, the main decision, output construction, and preservation of caller-owned state. Not every helper has every category. If a category is absent because the contract delegates it to the caller, write that rather than imagining hidden validation.

Compare the first example with each variation. Identify the changed dimension before looking at the new result. The empty or boundary case is not an afterthought: it reveals what the function means when ordinary work is absent or when a threshold is exactly reached. A deterministic tie or scope check can be decisive even when most fields look identical.

## From solved reading to independent practice

Close the reference and reconstruct the main decision in a separate practice file. Keep your first attempt, including its mistakes. Add a fourth fixture that rejects a plausible wrong implementation. Write the expected result before execution and explain why it follows from the contract.

If your code differs from the reference, compare behavior rather than spelling. Another loop, data structure, or decomposition can be valid. State its time and space costs and its effect on clarity. Do not add a framework or dependency merely to make the exercise look more advanced.

## Connect the model back to GitJira

The project boundary to inspect is shared schemas, API session handling, and cache/query ownership. The model can explain a policy while omitting authorization, persistence, browser interaction, or concurrent execution. Locate the real caller and name the missing guarantee before proposing an application change.

An accurate learning journal can say that the three solved examples ran and matched their expected values. It cannot turn that result into a claim that the application was built, deployed, browser-tested, or verified against an external provider. Record your own source trace and integration evidence separately when you perform them.

## Explain it without the code

Use this speaking sequence: the user wants __; the input identifies __; the function preserves __; the surprising branch is __; the result is __; the real application still needs __. Then have a listener change one input. If you can predict the changed result and identify the decisive step, you have evidence of understanding beyond recognizing the reference.
