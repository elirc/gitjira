# Foundations: Cache identity, mutation effects, and precise regression tests

## A key is an address

Read `query-keys.js`. Write the exact arrays returned for `issues('GJ')`, `issues('GJ', {status:'open'})`, and `issue('GJ', 12)`. Explain why both list and detail keys share an `issues` prefix but have different fourth elements. A prefix operation and an exact operation have different reach.

In `hooks.js`, find one mutation and all its invalidation calls. Make an effects table: record updated, detail view affected, filtered lists affected, counts potentially affected, other project unaffected. Decide what is proven by source versus what needs an observer/component test.

## Prediction exercise

There are four cached entries: GJ open list, GJ closed list, GJ issue 12, and OTHER open list. Issue 12 moves from open to closed. Which entries must stop being trusted? Can refetching only the currently visible list leave another view wrong when the user returns to it?

Now compare two filters containing the same fields in different object-property order. Why is string-prefix matching on serialized keys an unreliable substitute for the query library's matching rules? In the isolated lab, compare only the explicit key segments the contract names.

## Small JavaScript typing drill

This repository uses `.js` modules and JSDoc/shared schemas. Write JSDoc for a key predicate and two wrong inputs it should reject. Explain which errors editor checking can catch and which still require runtime validation. Do not convert the repository to TypeScript to complete this exercise.

## Read the failure boundary

In `api.js`, inspect the 204 response path and the shared refresh promise. Explain why a mutation result and a failed follow-up refetch are different outcomes. A refreshed cache is not the same thing as a successful server write.

## Before you code

Write one prediction you are least sure of and name the smallest observation that would settle it. Distinguish a fact you read in source from behavior you actually ran. Use the source map in [README](README.md) to check the exact files.
