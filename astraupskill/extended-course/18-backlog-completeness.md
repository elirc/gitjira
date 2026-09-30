# 18. A page of issues is not necessarily the whole backlog

[BacklogPage](../../apps/web/src/pages/BacklogPage.jsx) obtains issues through useIssues with an empty filter object, then groups the returned data.issues by sprintId. It calculates counts and story points from that array. [The hook](../../apps/web/src/lib/hooks.js) performs one query for the supplied filters; the inspected function does not itself follow nextCursor. This creates a useful cross-layer learning question: what does the page actually know about total project scope?

## Trace the data contract

The service list method has a default page size, returns a bounded issues array and exposes nextCursor. The hook returns that response. The backlog component uses issues but does not show cursor accumulation in the inspected component. Therefore counts derived from that array can represent the loaded page rather than every issue in a sprint or backlog.

Create a fixture with more issues than one page. Put an issue assigned to planned sprint S just beyond the first page while the first page contains none for S. The component's local sprintIssues length can be zero even though the database sprint is nonempty. Its start button uses that local count and may be disabled. This is a source-derived scenario to reproduce in a browser test before declaring a confirmed UI defect.

## Local guards versus server guards

The server's start transition loads the actual issue count for the sprint in its transaction. The browser's disabled state is an approximation based on loaded data. These can disagree without the server being wrong. A user may be prevented from attempting a valid action by incomplete UI data, or a stale UI may offer an action the server correctly rejects.

Design a capability response that includes authoritative sprint issue counts or a server-computed canStart explanation, if the product needs it. Alternatively, load all required pages with clear loading state. Compare the cost of fetching every issue merely to decide a button state with fetching a small aggregate. The right choice depends on scale and freshness requirements.

## Story-point totals

pointsOf sums storyPoints from the visible list, treating null as zero. This is a presentation choice. If the list is partial, the total is partial. If unestimated work is null, treating it as zero for arithmetic should not imply that the work requires no effort. A UI can show both estimated points and the number of unestimated issues.

Create a sprint with three estimated issues and two unestimated issues, with some outside the loaded page. Write labels that accurately describe the data available. “Loaded issues: 8 points, 2 unestimated” is different from “Sprint total: 8 points.” The exercise teaches honest aggregate communication, not a preference for a particular estimation method.

## Error and loading states

The page returns a loading message if data, sprints or project is absent. Inspect how query errors propagate before assuming every absence means loading. A failed query can leave data undefined while an error is available elsewhere. A useful UI distinguishes initial loading, failed fetch, empty results and partially loaded data.

The component displays assignment errors, while start, completion and creation have their own mutation objects. Review whether their errors are surfaced in the complete rendered flow. A disabled or failed action without visible explanation can look like a frozen page. This course asks for a targeted browser review; it does not claim that every surrounding layout or global handler has been inspected.

## Exercise

Build a browser fixture with a second page containing the only issue in one planned sprint. Predict local counts, button state and server behavior. Propose either an aggregate contract or explicit page accumulation. Add a refresh after another user completes a sprint. The UI should preserve the distinction between loaded data and authoritative lifecycle rules.

Submit a data-flow diagram, aggregate labels and three screen states. Full credit requires identifying where nextCursor stops being used and avoiding a claim that a loaded page is a complete project snapshot.

[Index](README.md) · [Review notes](answers/10-browser-and-schema.md)
