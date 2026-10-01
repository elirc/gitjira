// All mutable client state lives here, including the request-identity tokens.
//
// The tokens are this app's answer to out-of-order responses. A database row
// has a version that says which stored state a write may replace; a screen has
// a token that says which in-flight response may still update it. Each async
// load captures the current token before awaiting and compares it afterward;
// anything that invalidates the screen (switching project, closing a dialog,
// changing account) bumps the token so stale responses are discarded:
//
//   generation    — the workspace issue/activity view; bumped by loadProject
//                   and refresh so the newest load wins
//   sessionEpoch  — the signed-in account; bumped on sign-in/out so a slow
//                   workspace response for the old account is ignored
//   issueToken    — the issue dialog; bumped when the dialog closes so a
//                   response for issue A cannot populate a dialog reopened
//                   for issue B
//   memberToken   — the team dialog, same idea as issueToken
//
// The *Busy flags lock a dialog while a write is pending, so a delayed
// response cannot close or edit a dialog the user has since repurposed.

export const state = {
  user: null,
  users: [],
  projects: [],
  projectId: null,
  members: [],
  issues: [],
  events: [],
  view: "board",
  filters: { q: "", status: "", priority: "", assigneeId: "" },
  generation: 0,
  sessionEpoch: 0,
  authBusy: false,
  loadingProject: false,
  issueToken: 0,
  issueBusy: false,
  issueConflict: false,
  memberToken: 0,
  memberBusy: false,
  projectBusy: false,
  issue: null,
  comments: [],
  lastRefresh: null,
};

export const project = () => state.projects.find((item) => item.id === state.projectId);
export const canEdit = () => ["owner", "editor"].includes(project()?.role);
export const isOwner = () => project()?.role === "owner";
export const anyDialog = () => [...document.querySelectorAll("dialog")].some((d) => d.open);

// The debounced search timer is owned here so that every transition that makes
// a queued search meaningless (project switch, sign-in/out, filter reset) can
// cancel it. An uncancelled timer was the root of the "partial refresh
// invalidates a project load" race in journal/reviews/05-sol-ui-review.md.
let searchTimer;
export function queueSearch(run, delay = 220) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(run, delay);
}
export function cancelSearch() {
  clearTimeout(searchTimer);
}

export function resetFilters() {
  cancelSearch();
  state.filters = { q: "", status: "", priority: "", assigneeId: "" };
}
