// The signed-in workspace: sidebar shell, project loading, the board/list/
// activity views, and the read-only refresh. Nothing here writes data; board
// refresh must never become an accidental writer (ARCHITECTURE.md §4).

import { api } from "./api.js";
import {
  $,
  $$,
  avatar,
  date,
  escape,
  fullDate,
  icon,
  options,
  priorityLabel,
  statusLabel,
  statuses,
  priorities,
  toast,
} from "./dom.js";
import { canEdit, cancelSearch, project, state } from "./state.js";

export function renderShell() {
  $("#app").innerHTML =
    `<div class="app-layout"><aside class="sidebar" aria-label="Workspace navigation"><div class="brand"><span class="brand-symbol">g</span>gitjira<span style="color:#88aa9f;font-weight:400">.</span></div><div class="sidebar-label">Workspace</div><button class="nav-button ${state.view === "board" ? "active" : ""}" data-view="board">${icon("board")}Project board</button><button class="nav-button ${state.view === "list" ? "active" : ""}" data-view="list">${icon("list")}All issues</button><button class="nav-button ${state.view === "activity" ? "active" : ""}" data-view="activity">${icon("activity")}Activity</button><div class="sidebar-label">Your projects</div><div id="project-nav">${projectNav()}</div><button class="nav-button" data-action="new-project">${icon("plus")}Create project</button><div class="sidebar-bottom"><div class="local-note"><strong><span class="green-dot"></span> A little room to focus.</strong>One task at a time.<br>You're making progress.</div></div></aside><div class="main"><header class="topbar"><div class="breadcrumbs"><button class="icon-button mobile-menu" data-action="menu" aria-label="Toggle navigation" aria-expanded="false">${icon("menu")}</button><span>Workspace</span><span aria-hidden="true">/</span><strong id="breadcrumb-project">${escape(project()?.name || "Your projects")}</strong></div><div class="topbar-right"><span class="demo-tag">Local demo</span><details class="user-menu"><summary aria-label="Account menu">${avatar(state.user, true)}<span class="user-name">${escape(state.user.name)}</span>${icon("chevron")}</summary><div class="menu-panel"><div class="menu-label">Switch demo teammate</div>${state.users.map((user) => `<button data-switch="${user.id}" ${user.id === state.user.id ? "disabled" : ""}>${avatar(user)}${escape(user.name)}${user.id === state.user.id ? icon("check") : ""}</button>`).join("")}<div class="menu-divider"></div><button data-action="logout">${icon("logout")}Sign out</button></div></details></div></header><main class="content" id="workspace-content"><div class="loading-region" role="status">Gathering your team's work…</div></main></div></div>`;
}

export function projectNav() {
  return state.projects
    .map(
      (item) =>
        `<button class="nav-button ${item.id === state.projectId ? "active" : ""}" data-project="${item.id}"><span class="project-dot"></span><span class="project-nav-label">${escape(item.name)}</span><span class="count">${escape(item.key)}</span></button>`,
    )
    .join("");
}

export function renderNoProjects() {
  $("#workspace-content").innerHTML =
    `<div class="empty-state">${icon("layers")}<h2>A fresh start.</h2><p>Create your first project to give your work a home.</p><button class="button primary" data-action="new-project">${icon("plus")}Create project</button></div>`;
}

// Full project load: members + issues + activity. It owns the workspace until
// it finishes — `loadingProject` keeps refresh() from racing it, and the
// captured generation discards this load if a newer one starts meanwhile.
export async function loadProject() {
  cancelSearch();
  state.loadingProject = true;
  const generation = ++state.generation,
    projectId = state.projectId;
  localStorage.setItem("gitjira-project", String(projectId));
  $("#project-nav").innerHTML = projectNav();
  $("#breadcrumb-project").textContent = project()?.name || "Project";
  $("#workspace-content").innerHTML =
    '<div class="loading-region" role="status">Gathering your team’s work…</div>';
  try {
    const [memberData, issueData, activityData] = await Promise.all([
      api(`/projects/${projectId}/members`),
      api(`/projects/${projectId}/issues`),
      api(`/projects/${projectId}/activity`),
    ]);
    if (generation !== state.generation) return;
    state.members = memberData.members;
    state.issues = issueData.issues;
    state.events = activityData.events;
    state.lastRefresh = new Date();
    renderProject();
  } catch (error) {
    if (generation === state.generation)
      $("#workspace-content").innerHTML =
        `<div class="error-banner" role="alert">${escape(error.message)} <button class="button small" data-action="retry-project">Try again</button></div>`;
  } finally {
    if (generation === state.generation) state.loadingProject = false;
  }
}

export function renderProject() {
  const selected = project();
  $("#workspace-content").innerHTML =
    `<section class="project-header"><div><div class="eyebrow"><span class="eyebrow-line"></span>${escape(selected.key)} workspace</div><h1>${escape(selected.name)}</h1><p class="description">${escape(selected.description || "A shared space to turn ideas into progress.")}</p></div><div class="header-actions"><button class="button subtle" data-action="members">${icon("users")}Team <span class="count">${state.members.length}</span></button>${canEdit() ? `<button class="button primary" data-action="new-issue">${icon("plus")}New issue</button>` : `<span class="read-only-note">${icon("lock")}Viewer access</span>`}</div></section><div class="stats" id="stats"></div><div class="view-row"><nav class="view-tabs" aria-label="Project views">${["board", "list", "activity"].map((view) => `<button class="view-tab ${state.view === view ? "active" : ""}" data-view="${view}" aria-current="${state.view === view ? "page" : "false"}">${icon(view)}${{ board: "Board", list: "List", activity: "Activity" }[view]}</button>`).join("")}</nav><div class="view-meta"><span class="green-dot"></span><span class="refresh-label" id="refresh-status">Up to date</span><button class="icon-button" data-action="refresh" aria-label="Refresh project">${icon("refresh")}</button></div></div><div class="toolbar" id="toolbar" ${state.view === "activity" ? "hidden" : ""}><label class="search-wrap">${icon("search")}<input id="search" type="search" aria-label="Search issues" placeholder="Search issues…" maxlength="200" value="${escape(state.filters.q)}"></label><select class="filter-select" id="filter-status" aria-label="Filter by status">${options(statuses, state.filters.status, "All statuses")}</select><select class="filter-select" id="filter-priority" aria-label="Filter by priority">${options(priorities, state.filters.priority, "All priorities")}</select><select class="filter-select" id="filter-assignee" aria-label="Filter by assignee">${options({ unassigned: "Unassigned", ...Object.fromEntries(state.members.map((member) => [member.id, member.name])) }, state.filters.assigneeId, "All assignees")}</select><button class="clear-filter" data-action="clear-filters" ${Object.values(state.filters).some(Boolean) ? "" : "hidden"}>Clear</button></div><div id="refresh-error" aria-live="polite"></div><div id="view-content"></div><footer class="board-footer"><span>${icon("lock")}Shared with ${state.members.length} teammate${state.members.length === 1 ? "" : "s"} · Your changes are saved locally</span><span>Small steps. Good things.</span></footer>`;
  renderView();
}

function renderStats() {
  const issues = state.issues;
  const stats = [
    ["Matching issues", issues.length, "layers"],
    ["In progress", issues.filter((issue) => issue.status === "in_progress").length, "progress"],
    [
      "High priority",
      issues.filter((issue) => ["high", "urgent"].includes(issue.priority)).length,
      "flag",
    ],
    ["Completed", issues.filter((issue) => issue.status === "done").length, "check"],
  ];
  $("#stats").innerHTML = stats
    .map(
      ([title, value, glyph]) =>
        `<div class="stat"><div><div class="stat-title">${title === "Matching issues" && !Object.values(state.filters).some(Boolean) ? "Total issues" : title}</div><div class="stat-value">${value.toString().padStart(2, "0")}</div></div><span class="stat-icon">${icon(glyph)}</span></div>`,
    )
    .join("");
}

function issueCard(issue) {
  const assignee = issue.assigneeId
    ? { name: issue.assigneeName, initials: issue.assigneeInitials }
    : null;
  return `<button class="issue-card" data-issue="${issue.id}" aria-label="${escape(`${issue.key}: ${issue.title}`)}"><span class="card-top"><span class="issue-key">${escape(issue.key)}</span>${priorityLabel(issue.priority)}</span><span class="card-title">${escape(issue.title)}</span><span class="card-bottom"><span class="card-date" title="Updated ${escape(fullDate(issue.updatedAt))}">${icon("clock")}${escape(date(issue.updatedAt))}</span><span class="card-assignee"><span class="card-assignee-name">${escape(assignee?.name.split(" ")[0] || "Unassigned")}</span>${avatar(assignee)}</span></span></button>`;
}

export function renderView() {
  if (!$("#view-content")) return;
  renderStats();
  $$("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
    if (button.classList.contains("view-tab"))
      button.setAttribute("aria-current", button.dataset.view === state.view ? "page" : "false");
  });
  $("#toolbar").hidden = state.view === "activity";
  $('[data-action="clear-filters"]').hidden = !Object.values(state.filters).some(Boolean);
  const node = $("#view-content");
  if (state.view === "activity") {
    node.innerHTML = state.events.length
      ? `<div class="activity-list">${state.events.map((event) => `<article class="activity-item"><span class="activity-icon">${icon(event.action === "commented" ? "comment" : event.action === "archived" ? "archive" : event.action.startsWith("member") ? "users" : event.action === "created" ? "plus" : "activity")}</span><div class="activity-copy"><strong>${escape(event.actorName)}</strong> <span>${escape(event.action.replaceAll("_", " "))}</span>${event.issueKey ? ` <span class="issue-key">${escape(event.issueKey)}</span>` : ""}<p>${escape(event.detail)}</p></div><time class="activity-time" datetime="${escape(event.createdAt)}" title="${escape(fullDate(event.createdAt))}">${escape(date(event.createdAt))}</time></article>`).join("")}</div>`
      : '<div class="empty-state"><h2>A story waiting to happen.</h2><p>Your team’s changes will appear here.</p></div>';
  } else if (state.view === "list") {
    node.innerHTML = state.issues.length
      ? `<div class="issue-table-wrap"><table class="issue-table"><thead><tr><th scope="col">Issue</th><th scope="col">Title</th><th scope="col">Status</th><th scope="col">Priority</th><th scope="col">Assignee</th></tr></thead><tbody>${state.issues.map((issue) => `<tr><td><span class="issue-key">${escape(issue.key)}</span></td><td class="title-cell"><button class="table-issue" data-issue="${issue.id}">${escape(issue.title)}</button></td><td>${statusLabel(issue.status)}</td><td>${priorityLabel(issue.priority)}</td><td><span class="person-inline">${avatar(issue.assigneeId ? { name: issue.assigneeName, initials: issue.assigneeInitials } : null)}${escape(issue.assigneeName || "Unassigned")}</span></td></tr>`).join("")}</tbody></table></div>`
      : `<div class="empty-state">${icon("search")}<h2>No issues here yet.</h2><p>${Object.values(state.filters).some(Boolean) ? "Try changing your filters or search." : "Create an issue to start moving things forward."}</p></div>`;
  } else {
    node.innerHTML = `<div class="board">${Object.entries(statuses)
      .map(([value, label]) => {
        const issues = state.issues.filter((issue) => issue.status === value);
        return `<section class="column" aria-label="${label}"><header class="column-heading"><span class="status-dot ${value}"></span>${label}<span class="column-count">${issues.length}</span>${canEdit() ? `<button class="icon-button" data-new-status="${value}" aria-label="Add issue to ${label}">${icon("plus")}</button>` : ""}</header><div class="column-cards">${issues.length ? issues.map(issueCard).join("") : `<div class="column-empty">${Object.values(state.filters).some(Boolean) ? "No matching issues" : value === "done" ? "Good things take time." : "A little breathing room."}</div>`}</div>${canEdit() ? `<button class="add-card" data-new-status="${value}">${icon("plus")}Add issue</button>` : ""}</section>`;
      })
      .join("")}</div>`;
  }
}

// Partial refresh: issues + activity only, honoring the current filters.
// It yields to a full project load (which installs members too) and to
// account transitions; a refresh that started earlier than the newest load
// finds its generation stale and silently discards its data.
export async function refresh({ quiet = false } = {}) {
  if (!state.projectId || state.loadingProject || state.authBusy) return;
  const generation = ++state.generation,
    projectId = state.projectId;
  const query = new URLSearchParams(
    Object.entries(state.filters).filter(([, value]) => value !== ""),
  );
  if ($("#refresh-status")) $("#refresh-status").textContent = "Refreshing…";
  try {
    const [issueData, activityData] = await Promise.all([
      api(`/projects/${projectId}/issues?${query}`),
      api(`/projects/${projectId}/activity`),
    ]);
    if (generation !== state.generation) return;
    state.issues = issueData.issues;
    state.events = activityData.events;
    state.lastRefresh = new Date();
    renderView();
    if ($("#refresh-status")) $("#refresh-status").textContent = "Up to date";
    if ($("#refresh-error")) $("#refresh-error").innerHTML = "";
  } catch (error) {
    if (generation !== state.generation) return;
    if ($("#refresh-status")) $("#refresh-status").textContent = "Refresh paused";
    if ($("#refresh-error"))
      $("#refresh-error").innerHTML =
        `<div class="error-banner" role="alert">Could not refresh. Showing the last loaded data. ${escape(error.message)} <button class="button small" data-action="refresh">Retry</button></div>`;
    if (!quiet) toast(error.message, true);
  }
}
