// Signing in, signing out, and loading the workspace for the current account.
// Account transitions are the most delicate moment in the app: the old
// workspace must never stay on screen once the server session has changed
// (the pre-fix failure is reproduced in journal/reviews/05-sol-ui-review.md).

import { api } from "./api.js";
import { $, $$, avatar, closeDialogs, escape, icon, toast } from "./dom.js";
import { cancelSearch, resetFilters, state } from "./state.js";
import { loadProject, renderNoProjects, renderShell } from "./workspace.js";

export function renderLogin(error = "") {
  $("#app").innerHTML =
    `<main class="login"><section class="login-art"><div class="brand"><span class="brand-symbol">g</span>gitjira<span style="color:#7fa398;font-weight:400">.</span></div><div class="login-copy"><div class="eyebrow"><span class="eyebrow-line"></span>A little clarity goes a long way</div><h1>Good work.<br> <span>Moving forward.</span></h1><p>A calm place for your team's ideas, everyday tasks, and next big thing.</p></div><div class="login-foot">Less noise. More momentum.</div></section><section class="login-main"><div class="login-form"><div class="eyebrow">Your workspace is ready</div><h2>Make yourself at home.</h2><p>Choose a demo teammate to explore the workspace.</p>${error ? `<div class="error-banner" role="alert">${escape(error)}</div>` : ""}<div class="login-users">${state.users.map((user) => `<button class="login-user" data-login="${user.id}">${avatar(user, true)}<span><span class="login-user-name">${escape(user.name)}</span><span class="login-user-role">${escape({ 1: "Launch · Owner", 2: "Launch · Editor", 3: "Launch · Viewer", 4: "Lab · Owner" }[user.id] || "Demo teammate")}</span></span>${icon("arrow")}</button>`).join("")}</div><p class="login-note"><strong>A local learning workspace.</strong> Demo accounts have no passwords. Changes are saved on this computer, and each teammate has their own project access.</p></div></section></main>`;
}

export async function signIn(userId) {
  if (state.authBusy) return;
  state.authBusy = true;
  // Invalidate every in-flight read for the previous account before awaiting
  // anything: a slow response for the old session must not paint this screen.
  state.sessionEpoch++;
  state.generation++;
  cancelSearch();
  $$("[data-login], [data-switch]").forEach((button) => {
    button.disabled = true;
  });
  try {
    state.user = (await api("/session", { method: "POST", body: { userId } })).user;
    closeDialogs();
    state.projectId = null;
    resetFilters();
    // Replace the old account's workspace immediately. If the workspace load
    // below fails, the catch shows a recovery screen for the NEW account —
    // never the previous account's data under the new server session.
    $("#app").innerHTML =
      '<main class="boot" role="status"><span class="brand-symbol">g</span><p>Opening your workspace…</p></main>';
    await loadWorkspace();
  } catch (error) {
    toast(error.message, true);
    if (!state.user) renderLogin(error.message);
    else renderWorkspaceError(error.message);
  } finally {
    state.authBusy = false;
    $$("[data-login], [data-switch]").forEach((button) => {
      button.disabled = false;
    });
  }
}

export function renderWorkspaceError(message) {
  $("#app").innerHTML =
    `<main class="boot"><span class="brand-symbol">g</span><h1>Let's reconnect your workspace.</h1><p>${escape(message)}</p><p class="field-note">Signed in as ${escape(state.user.name)}.</p><button class="button primary" data-action="retry-workspace">Try again</button><button class="button subtle" data-action="logout">Sign out</button></main>`;
}

export async function loadWorkspace() {
  // If the account changes while the project list is in flight, this response
  // belongs to a stale session and must not render.
  const epoch = state.sessionEpoch,
    data = await api("/projects");
  if (epoch !== state.sessionEpoch) return;
  state.projects = data.projects;
  const stored = Number(localStorage.getItem("gitjira-project"));
  state.projectId = state.projects.some((item) => item.id === state.projectId)
    ? state.projectId
    : state.projects.find((item) => item.id === stored)?.id || state.projects[0]?.id || null;
  renderShell();
  if (state.projectId) await loadProject();
  else renderNoProjects();
}

export async function logout() {
  if (state.authBusy) return;
  state.authBusy = true;
  state.sessionEpoch++;
  state.generation++;
  cancelSearch();
  try {
    await api("/session", { method: "DELETE" });
    state.user = null;
    state.projectId = null;
    state.loadingProject = false;
    closeDialogs();
    renderLogin();
  } finally {
    state.authBusy = false;
  }
}
