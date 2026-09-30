# Sealed reasoning guide

Attempt both labs and write the investigation hypotheses before reading. These answers concern only this expansion, not the existing Opus incidents.

## Partial updates

Build the new object from the existing issue, then apply only explicitly present allowed properties. Title must remain a nonempty trimmed string. Assignee null clears; a nonempty string assigns. Points zero is a real value, null clears, and absence preserves. Do not use truthiness or creation defaults to decide whether a property was supplied.

The lab rejects unknown keys before applying anything. The application schema may strip, reject, or preserve unknown fields differently; that is a contract comparison, not proof that one global policy is always right. A title-only request must preserve both assignee and points under this lab.

## Single-flight gate

Store a promise before the loader's scheduled microtask runs. Same-key callers see it; different keys create independent work. Wrap loader execution with Promise.resolve().then so a synchronous throw becomes a rejection. A finally callback deletes the entry after either outcome, allowing a later attempt.

Returning the stored promise directly preserves identity. Declaring the returned function async would introduce an outer promise even though work could still be deduplicated; the model intentionally makes identity part of its testable contract.

The gate does not cancel work when consumers go away, limit the number of distinct keys, authenticate callers, or make repeated writes safe. Those omissions matter when considering a production client. They should be listed rather than hidden behind a passing concurrency test.

## Compare mechanisms, not spelling

For each difference from the reference, classify it as another valid implementation, a violated contract, or an assumption absent from the exercise. Show a concrete input for the second category. If you cannot produce one, do not call a stylistic preference a correctness defect.

Return to the application source before adopting a model. The reference deliberately omits infrastructure guarantees that would require browser, database, or provider evidence. It is an executable explanation, not a production patch.
