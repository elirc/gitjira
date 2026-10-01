// The three dialogs and every write the browser can make. Two rules govern
// this file (ARCHITECTURE.md §4):
//
//  1. A save is pessimistic — success is reported only after the server
//     commits, and a 409 conflict preserves the user's draft. The app never
//     silently retries a stale write with a fresh version.
//  2. A dialog's async work is owned by a token (issueToken / memberToken)
//     captured before awaiting; while a write is pending the dialog is locked
//     (controls disabled, Escape blocked) so a delayed response cannot close
//     or modify a dialog the user has since reopened for something else.

import { api } from "./api.js";
import {
  $,
  $$,
  avatar,
  date,
  escape,
  fullDate,
  icon,
  inlineError,
  options,
  priorities,
  statuses,
  toast,
} from "./dom.js";
import { canEdit, isOwner, project, resetFilters, state } from "./state.js";
import { projectNav, refresh, renderProject } from "./workspace.js";
import { loadWorkspace } from "./session.js";

function memberOptions(selected, placeholder = "Unassigned") {
  return options(
    Object.fromEntries(state.members.map((member) => [member.id, member.name])),
    selected,
    placeholder,
  );
}

export async function openIssue(id, status = "todo") {
  // A new token invalidates any response still in flight for the dialog's
  // previous occupant; the dialog's close handler bumps it too.
  const token = ++state.issueToken;
  const dialog = $("#issue-dialog");
  state.issue = null;
  state.comments = [];
  state.issueConflict = false;
  dialog.className = "";
  dialog.innerHTML = `<div class="dialog-header"><h2 id="issue-dialog-title">Opening issue…</h2><button class="icon-button" data-close="issue-dialog" aria-label="Close issue">${icon("close")}</button></div><div class="loading-region">One moment…</div>`;
  dialog.showModal();
  try {
    if (id) {
      const data = await api(`/issues/${id}`);
      if (!dialog.open || token !== state.issueToken) return;
      state.issue = data.issue;
      state.comments = data.comments;
    }
    renderIssueDialog(status);
  } catch (error) {
    if (!dialog.open || token !== state.issueToken) return;
    dialog.innerHTML = `<div class="dialog-header"><h2 id="issue-dialog-title">Issue unavailable</h2><button class="icon-button" data-close="issue-dialog" aria-label="Close issue">${icon("close")}</button></div><div class="dialog-body"><div class="error-banner" role="alert">${escape(error.message)}</div></div>`;
  }
}

function renderIssueDialog(defaultStatus = "todo") {
  const issue = state.issue,
    disabled = !canEdit() ? "disabled" : "";
  $("#issue-dialog").innerHTML =
    `<form id="issue-form"><div class="dialog-header"><div><div class="eyebrow">${escape(issue?.key || `${project().key} · New issue`)}</div><h2 id="issue-dialog-title">${issue ? "The details make the difference." : "Make your next move."}</h2></div><button type="button" class="icon-button" data-close="issue-dialog" aria-label="Close issue">${icon("close")}</button></div><div class="dialog-body"><div id="issue-error" role="alert"></div><div id="issue-conflict" hidden></div><div class="field"><label for="issue-title">Title</label><input id="issue-title" name="title" placeholder="What needs to happen?" maxlength="180" required value="${escape(issue?.title || "")}" ${disabled}></div><div class="field"><label for="issue-description">Description</label><textarea id="issue-description" name="description" placeholder="Add context, a plan, or a few helpful details…" maxlength="10000" rows="4" ${disabled}>${escape(issue?.description || "")}</textarea></div><div class="field-row"><div class="field"><label for="issue-status">Status</label><select id="issue-status" name="status" ${disabled}>${options(statuses, issue?.status || defaultStatus)}</select></div><div class="field"><label for="issue-priority">Priority</label><select id="issue-priority" name="priority" ${disabled}>${options(priorities, issue?.priority || "medium")}</select></div><div class="field"><label for="issue-assignee">Assignee</label><select id="issue-assignee" name="assigneeId" ${disabled}>${memberOptions(issue?.assigneeId)}</select></div></div>${issue ? `<p class="issue-meta">Created by ${escape(issue.creatorName)} · ${escape(fullDate(issue.createdAt))}<br>Last updated ${escape(fullDate(issue.updatedAt))} · Version ${issue.version}</p><section class="comments-section"><h3>A little conversation <span id="comment-count">(${state.comments.length})</span></h3><div id="comments-list">${commentsMarkup()}</div>${canEdit() ? `<div class="comment-compose"><label class="sr-only" for="comment-body">Write a comment</label><textarea id="comment-body" placeholder="Share an update or ask a question…" maxlength="4000" aria-label="Write a comment"></textarea><button type="button" class="button small" data-action="post-comment">${icon("arrow")}Post</button></div><div id="comment-error" role="alert"></div>` : ""}</section>` : '<p class="field-note">Give it a clear title. You can refine the rest as you go.</p>'}</div><div class="dialog-footer">${issue && canEdit() ? `<button type="button" class="button subtle small" data-action="archive-issue">${icon("archive")}Archive</button>` : !canEdit() ? `<span class="read-only-note">${icon("lock")}You have viewer access</span>` : ""}<div class="dialog-actions"><button type="button" class="button" data-close="issue-dialog">${canEdit() ? "Cancel" : "Close"}</button>${canEdit() ? `<button type="submit" class="button primary" id="issue-save">${issue ? "Save changes" : "Create issue"}</button>` : ""}</div></div></form>`;
  if (!issue) $("#issue-title").focus();
}

function commentsMarkup() {
  return state.comments.length
    ? state.comments
        .map(
          (comment) =>
            `<article class="comment">${avatar({ name: comment.authorName, initials: comment.authorInitials })}<div class="comment-copy"><div class="comment-author">${escape(comment.authorName)}<time class="comment-time" datetime="${escape(comment.createdAt)}" title="${escape(fullDate(comment.createdAt))}">${escape(date(comment.createdAt))}</time></div><p>${escape(comment.body)}</p></div></article>`,
        )
        .join("")
    : '<p class="comments-empty">No comments yet. Start the conversation.</p>';
}

// The 409 path. The draft fields stay exactly as the user typed them; saving
// stays disabled until the user explicitly loads the current server version.
function showConflict(error) {
  state.issueConflict = true;
  const node = $("#issue-conflict");
  node.hidden = false;
  node.innerHTML = `<div class="conflict-box" role="alert"><strong>This issue changed while you were editing.</strong><p>Your draft is still here and has not been saved. Loading the latest version replaces your current fields; copy anything you want to keep first.</p><button type="button" class="button small" data-action="reload-issue">Load latest version</button></div>`;
  $("#issue-save").disabled = true;
  $('[data-action="archive-issue"]').disabled = true;
  node.scrollIntoView({ block: "nearest" });
}

export async function saveIssue(form) {
  const button = $("#issue-save");
  if (button.disabled || state.issueBusy || state.issueConflict) return;
  const data = Object.fromEntries(new FormData(form));
  data.assigneeId = data.assigneeId ? Number(data.assigneeId) : null;
  if (!data.title.trim()) {
    inlineError("issue-error", "Add a title before saving this issue.");
    $("#issue-title").focus();
    return;
  }
  const editing = state.issue,
    token = state.issueToken;
  setIssueBusy(true);
  button.textContent = "Saving…";
  inlineError("issue-error", "");
  let conflict = false;
  try {
    // An edit sends the version the user read. The server's UPDATE only
    // matches that version (src/app.js PATCH handler), so a stale draft gets
    // a 409 with the current issue instead of overwriting newer work.
    await api(editing ? `/issues/${editing.id}` : `/projects/${state.projectId}/issues`, {
      method: editing ? "PATCH" : "POST",
      body: { ...data, ...(editing ? { version: editing.version } : {}) },
    });
    setIssueBusy(false);
    $("#issue-dialog").close();
    toast(
      editing ? "Changes saved. A little more clarity." : "Issue created. Let’s move it forward.",
    );
    await refresh();
  } catch (error) {
    if (error.status === 409 && editing) {
      conflict = true;
      showConflict(error);
    } else inlineError("issue-error", error.message);
  } finally {
    if (token === state.issueToken) setIssueBusy(false);
    if ($("#issue-save") === button) {
      button.textContent = editing ? "Save changes" : "Create issue";
      if (conflict) button.disabled = true;
    }
  }
}

function setIssueBusy(busy) {
  state.issueBusy = busy;
  $$("input,textarea,select,button", $("#issue-dialog")).forEach((control) => {
    control.disabled = busy;
  });
  if (!busy && state.issueConflict) {
    if ($("#issue-save")) $("#issue-save").disabled = true;
    const archive = $('[data-action="archive-issue"]');
    if (archive) archive.disabled = true;
  }
}

export async function reloadIssue() {
  if (state.issueBusy) return;
  const button = $('[data-action="reload-issue"]');
  button.disabled = true;
  setIssueBusy(true);
  try {
    const data = await api(`/issues/${state.issue.id}`);
    const commentDraft = $("#comment-body")?.value || "";
    state.issue = data.issue;
    state.comments = data.comments;
    state.issueConflict = false;
    renderIssueDialog();
    if ($("#comment-body")) $("#comment-body").value = commentDraft;
    toast("Latest version loaded. Review your changes before saving.");
  } catch (error) {
    inlineError("issue-error", error.message);
    button.disabled = false;
  } finally {
    setIssueBusy(false);
  }
}

export async function archiveIssue() {
  if (state.issueBusy || state.issueConflict) return;
  if (
    !confirm(`Archive ${state.issue.key}? It will be removed from the board. Its history is kept.`)
  )
    return;
  const button = $('[data-action="archive-issue"]'),
    token = state.issueToken;
  setIssueBusy(true);
  let conflict = false;
  try {
    // Archive is also versioned: a stale archive cannot hide newer work.
    await api(`/issues/${state.issue.id}`, {
      method: "DELETE",
      body: { version: state.issue.version },
    });
    setIssueBusy(false);
    $("#issue-dialog").close();
    toast("Issue archived. A little less clutter.");
    await refresh();
  } catch (error) {
    if (error.status === 409) {
      conflict = true;
      showConflict(error);
    } else inlineError("issue-error", error.message);
  } finally {
    if (token === state.issueToken) setIssueBusy(false);
    if (conflict) button.disabled = true;
  }
}

export async function postComment() {
  if (state.issueBusy) return;
  const body = $("#comment-body").value.trim();
  if (!body) {
    $("#comment-body").focus();
    return;
  }
  setIssueBusy(true);
  inlineError("comment-error", "");
  try {
    const result = await api(`/issues/${state.issue.id}/comments`, {
      method: "POST",
      body: { body },
    });
    // Comments append independently of issue fields, so posting one leaves any
    // unsaved field draft in the form untouched.
    state.comments.push(result.comment);
    $("#comments-list").innerHTML = commentsMarkup();
    $("#comment-count").textContent = `(${state.comments.length})`;
    $("#comment-body").value = "";
    toast("Comment added.");
  } catch (error) {
    inlineError("comment-error", error.message);
  } finally {
    setIssueBusy(false);
  }
}

export function openProject() {
  const dialog = $("#project-dialog");
  dialog.className = "small-dialog";
  dialog.innerHTML = `<form id="project-form"><div class="dialog-header"><div><div class="eyebrow">A new beginning</div><h2 id="project-dialog-title">Give your work a home.</h2></div><button type="button" class="icon-button" data-close="project-dialog" aria-label="Close project dialog">${icon("close")}</button></div><div class="dialog-body"><div id="project-error" role="alert"></div><div class="field"><label for="project-name">Project name</label><input id="project-name" name="name" required maxlength="80" placeholder="Something worth building"></div><div class="field"><label for="project-key">Project key</label><input id="project-key" name="key" required minlength="2" maxlength="8" pattern="[A-Z][A-Z0-9]{1,7}" placeholder="LAUNCH" style="text-transform:uppercase"><p class="field-note">2–8 uppercase letters or numbers, starting with a letter.</p></div><div class="field"><label for="project-description">A short description <span style="font-weight:400">(optional)</span></label><textarea id="project-description" name="description" maxlength="1000" rows="3" placeholder="What are we working toward?"></textarea></div></div><div class="dialog-footer"><div class="dialog-actions"><button class="button" type="button" data-close="project-dialog">Cancel</button><button class="button primary" type="submit">Create project</button></div></div></form>`;
  dialog.showModal();
  $("#project-name").focus();
}

export async function saveProject(form) {
  const button = $('[type="submit"]', form);
  if (button.disabled || state.projectBusy) return;
  const body = Object.fromEntries(new FormData(form));
  state.projectBusy = true;
  $$("input,textarea,button", form).forEach((control) => {
    control.disabled = true;
  });
  inlineError("project-error", "");
  try {
    const result = await api("/projects", { method: "POST", body });
    state.projectId = result.project.id;
    resetFilters();
    $("#project-dialog").close();
    await loadWorkspace();
    toast("Your new project is ready.");
  } catch (error) {
    inlineError("project-error", error.message);
  } finally {
    state.projectBusy = false;
    $$("input,textarea,button", form).forEach((control) => {
      control.disabled = false;
    });
  }
}

export async function openMembers() {
  const token = ++state.memberToken,
    projectId = state.projectId;
  const dialog = $("#members-dialog");
  dialog.className = "";
  dialog.innerHTML = `<div class="dialog-header"><h2 id="members-dialog-title">Your project team</h2><button class="icon-button" data-close="members-dialog" aria-label="Close team">${icon("close")}</button></div><div class="loading-region">Finding your teammates…</div>`;
  dialog.showModal();
  try {
    const data = await api(`/projects/${projectId}/members`);
    // The captured projectId guards the case the token alone cannot: the
    // dialog reopened for a different project before this response arrived.
    if (!dialog.open || token !== state.memberToken || projectId !== state.projectId) return;
    state.members = data.members;
    renderMembers();
  } catch (error) {
    if (!dialog.open || token !== state.memberToken || projectId !== state.projectId) return;
    dialog.innerHTML = `<div class="dialog-header"><h2 id="members-dialog-title">Team unavailable</h2><button class="icon-button" data-close="members-dialog" aria-label="Close team">${icon("close")}</button></div><div class="dialog-body"><div class="error-banner" role="alert">${escape(error.message)}</div></div>`;
  }
}

function renderMembers(message = "") {
  const editable = isOwner(),
    available = state.users.filter(
      (user) => !state.members.some((member) => member.id === user.id),
    );
  $("#members-dialog").innerHTML =
    `<div class="dialog-header"><div><div class="eyebrow">${escape(project().key)} · Better together</div><h2 id="members-dialog-title">Your project team</h2></div><button class="icon-button" data-close="members-dialog" aria-label="Close team">${icon("close")}</button></div><div class="dialog-body"><div id="members-error" role="alert">${message ? `<div class="error-banner">${escape(message)}</div>` : ""}</div><p class="field-note">Owners manage access. Editors work on issues and comments. Viewers can read the project.</p>${state.members.map((member) => `<div class="member-row"><div class="member-person">${avatar(member, true)}<span>${escape(member.name)}${member.id === state.user.id ? " (you)" : ""}</span></div><select class="filter-select" data-role-for="${member.id}" aria-label="Role for ${escape(member.name)}" ${editable ? "" : "disabled"}>${options({ owner: "Owner", editor: "Editor", viewer: "Viewer" }, member.role)}</select>${editable ? `<button class="button small" data-save-member="${member.id}">Save role</button><button class="icon-button member-remove" data-remove-member="${member.id}" aria-label="Remove ${escape(member.name)}">${icon("close")}</button>` : ""}</div>`).join("")}${editable && available.length ? `<form id="member-form" class="member-add"><h3>Bring a teammate in</h3><div class="member-add-fields"><select class="filter-select" name="userId" aria-label="Teammate to add" required>${options(Object.fromEntries(available.map((user) => [user.id, user.name])))}</select><select class="filter-select" name="role" aria-label="New teammate role">${options({ editor: "Editor", viewer: "Viewer", owner: "Owner" }, "editor")}</select><button class="button small primary" type="submit">${icon("plus")}Add teammate</button></div></form>` : ""}</div><div class="dialog-footer"><p class="field-note">${editable ? "Every project needs at least one owner." : "Ask a project owner to change team access."}</p><button class="button" data-close="members-dialog">Done</button></div>`;
}

export async function mutateMember(userId, role, remove = false) {
  if (state.memberBusy) return;
  if (
    remove &&
    !confirm(
      `Remove ${state.members.find((member) => member.id === userId)?.name || "this teammate"} from this project?`,
    )
  )
    return;
  const buttons = $$("button,select", $("#members-dialog"));
  state.memberBusy = true;
  buttons.forEach((button) => {
    button.disabled = true;
  });
  try {
    state.members = (
      await api(`/projects/${state.projectId}/members/${userId}`, {
        method: remove ? "DELETE" : "PUT",
        ...(remove ? {} : { body: { role } }),
      })
    ).members;
    state.projects = (await api("/projects")).projects;
    // Removing yourself (or losing access) is handled like losing the
    // project entirely: leave the dialog and reload the workspace.
    if (!state.projects.some((item) => item.id === state.projectId)) {
      $("#members-dialog").close();
      state.projectId = null;
      resetFilters();
      await loadWorkspace();
    } else {
      renderMembers();
      renderProject();
      $("#project-nav").innerHTML = projectNav();
      await refresh();
    }
    toast(remove ? "Teammate removed from this project." : "Team access updated.");
  } catch (error) {
    inlineError("members-error", error.message);
    buttons.forEach((button) => {
      button.disabled = false;
    });
  } finally {
    state.memberBusy = false;
  }
}
