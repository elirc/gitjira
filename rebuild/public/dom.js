// DOM and formatting helpers. Nothing in this file talks to the server or
// mutates application state; it only builds markup strings and small UI effects.

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// Every piece of user-provided text passes through here before being placed in
// innerHTML. The server stores text verbatim; the browser must never interpret
// it as markup (CONTRACT.md: "No user-generated HTML inserted unsafely").
export const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );

export const statuses = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};
export const priorities = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };

const paths = {
  board: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m6-16v16"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  activity: '<path d="m3 12 4-1 3-7 4 16 3-9 4 1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  users:
    '<path d="M15 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-3.9M15 3.1a4 4 0 0 1 0 7.8"/><circle cx="9" cy="7" r="4"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  chevron: '<path d="m8 10 4 4 4-4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
  progress: '<path d="M12 3a9 9 0 1 1-9 9M3 7V3h4M12 7v5l4 2"/>',
  flag: '<path d="M5 21V4c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 3M5 15a8 8 0 0 0 13 3"/>',
  logout: '<path d="M9 5H4v14h5m5-14 7 7-7 7m-6-7h13"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  comment: '<path d="M21 11a8 8 0 0 1-8 8H5l-4 3 2-7a8 8 0 1 1 18-4Z"/>',
  archive: '<path d="M4 8v13h16V8M3 3h18v5H3V3Zm6 9h6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
};

export const icon = (name) =>
  `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.layers}</svg>`;

export const initials = (name) =>
  String(name || "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

export const avatar = (person, large = false) =>
  `<span class="avatar ${large ? "large" : ""} ${!person ? "unassigned" : ""}" title="${escape(person?.name || "Unassigned")}">${escape(person?.initials || initials(person?.name))}</span>`;

export const date = (value) =>
  new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));

export const fullDate = (value) =>
  new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

let toastTimer;
export function toast(message, error = false) {
  clearTimeout(toastTimer);
  const node = $("#toast");
  node.textContent = message;
  node.className = `toast${error ? " error" : ""}`;
  node.hidden = false;
  toastTimer = setTimeout(() => {
    node.hidden = true;
  }, 4500);
}

export function options(items, selected, placeholder) {
  return `${placeholder !== undefined ? `<option value="">${escape(placeholder)}</option>` : ""}${Object.entries(
    items,
  )
    .map(
      ([value, label]) =>
        `<option value="${escape(value)}" ${String(selected) === String(value) ? "selected" : ""}>${escape(label)}</option>`,
    )
    .join("")}`;
}

export function priorityLabel(priority) {
  return `<span class="priority ${escape(priority)}"><span class="priority-bars" aria-hidden="true">${priority === "urgent" ? "↑↑" : priority === "high" ? "↑" : priority === "low" ? "↓" : "−"}</span>${escape(priorities[priority])}</span>`;
}

export function statusLabel(status) {
  return `<span class="status-label"><span class="status-dot ${escape(status)}"></span>${escape(statuses[status])}</span>`;
}

export function closeDialogs() {
  $$("dialog").forEach((dialog) => dialog.close());
}

export function inlineError(id, message) {
  const node = $(`#${id}`);
  if (node) node.innerHTML = message ? `<div class="error-banner">${escape(message)}</div>` : "";
}
