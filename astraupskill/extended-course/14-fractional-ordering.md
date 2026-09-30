# 14. A position key is ordered data, not a floating-point number

[keyBetween](../../packages/shared/src/fractional-index.js) creates base-62 string keys intended to sort lexicographically between bounds. The board can move a card by updating one position string rather than renumbering every later card. The implementation uses common prefixes and recursive midpoint selection. Its assumptions deserve explicit tests, especially because comments describing “always room” can sound broader than the accepted input domain.

## Follow a simple midpoint

The digit alphabet contains numbers, uppercase letters and lowercase letters in a defined order. With no lower or upper bound, the function returns the middle digit. With two bounds, it rejects a greater-than-or-equal lower bound and recursively finds space. When first digits have room between them, it chooses a midpoint digit. When they are adjacent, it extends the lower prefix into more digits.

Work several examples using digit indices rather than decimal fractions. The strings are compared lexicographically under the intended ordering, so ordinary numeric parsing would be wrong. A key such as A followed by another character is not a base-ten decimal quantity. The database collation and client sort must agree with the algorithm's comparison assumptions.

## Valid generated keys versus arbitrary strings

Investigate which strings the algorithm can generate and which strings the public function accepts without explicit validation. Unknown characters produce an index of minus one through val. Empty strings and trailing minimum digits can create edge cases different from ordinary generated keys. A property test over arbitrary Unicode strings is not automatically a valid test of the intended generated-key domain.

Define the domain first. You can test closure by starting from open bounds, repeatedly inserting generated keys and checking ordering. Separately, test malformed external position values at the API boundary. The server receives a client-computed position in moveIssue, so route validation and ownership of ordering decisions matter. A string schema alone may not establish that a key is valid or between the intended neighbors.

## Concurrent moves

Two clients can calculate a key between the same neighbors at the same time. The deterministic function can return the same key for both. Fractional indexing reduces write amplification; it does not by itself create unique concurrent positions or resolve conflicting intent. Decide whether ties are allowed and what secondary ordering makes them deterministic.

A proposed move command could send neighbor identifiers and let the server compute a position under a transaction, or include an expected board version, or use a tie-break identity. Each choice changes latency and conflict behavior. The current service persists the supplied position after checking target-column ownership. Characterize that contract before proposing a stronger one.

## Rebalancing and key growth

Repeated insertion into a narrow interval can lengthen keys. Measure key lengths under a controlled insertion pattern. Do not assume one-row updates imply constant key size forever. A future rebalance strategy would change many positions and therefore needs a coordination rule with concurrent moves and cached clients.

Design a rebalance as a proposed maintenance operation in a disposable model. Preserve relative order, assign new spaced keys and increment an ordering epoch. A stale client using old neighbors or keys should receive a defined response. Explain how the operation avoids mixing old and new key spaces in one visible board state.

## Exercise

Create a generated-key property test, an invalid-input table, a same-gap concurrent insertion and a key-growth experiment. For each, state the exact claim. The generated-key test proves ordering for that generator sequence; it does not validate database collation or client concurrency. A relational test and a multi-client schedule address those separate boundaries.

Submit a proposed tie policy and one rejected alternative. Full credit requires recognizing that efficient positioning and concurrency control are different concerns. The board should remain understandable to users even when two people move cards at nearly the same time.

[Index](README.md) · [Review notes](answers/07-events-and-order.md)
