// Entry point: global event delegation, dialog lifecycle guards, the
// 25-second poll, and boot. All behavior lives in the modules this imports:
//
//   api.js       — the one fetch wrapper (same-origin JSON + write header)
//   state.js     — application state and the request-identity tokens
//   dom.js       — markup helpers and text escaping
//   session.js   — sign-in/out and workspace loading
//   workspace.js — board/list/activity rendering and read-only refresh
//   dialogs.js   — issue/project/team dialogs and every write

import { $, $$, escape, toast } from "./dom.js";
import { anyDialog, resetFilters, queueSearch, state } from "./state.js";
import { api } from "./api.js";
import { loadWorkspace, logout, renderLogin, signIn } from "./session.js";
import { loadProject, refresh, renderView } from "./workspace.js";
import {
  archiveIssue,
  mutateMember,
  openIssue,
  openMembers,
  openProject,
  postComment,
  reloadIssue,
  saveIssue,
  saveProject,
} from "./dialogs.js";

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  try {
    if (button.dataset.close) {
      $(`#${button.dataset.close}`).close();
      return;
    }
    if (button.dataset.login || button.dataset.switch) {
      await signIn(Number(button.dataset.login || button.dataset.switch));
      return;
    }
    if (button.dataset.project) {
      if (Number(button.dataset.project) !== state.projectId) {
        state.projectId = Number(button.dataset.project);
        resetFilters();
        $(".sidebar").classList.remove("open");
        await loadProject();
      }
      return;
    }
    if (button.dataset.view) {
      state.view = button.dataset.view;
      $(".sidebar").classList.remove("open");
      renderView();
      return;
    }
    if (button.dataset.issue) {
      await openIssue(Number(button.dataset.issue));
      return;
    }
    if (button.dataset.newStatus) {
      await openIssue(null, button.dataset.newStatus);
      return;
    }
    if (button.dataset.saveMember) {
      await mutateMember(
        Number(button.dataset.saveMember),
        $(`[data-role-for="${button.dataset.saveMember}"]`).value,
      );
      return;
    }
    if (button.dataset.removeMember) {
      await mutateMember(Number(button.dataset.removeMember), null, true);
      return;
    }
    switch (button.dataset.action) {
      case "new-project":
        openProject();
        break;
      case "new-issue":
        await openIssue(null);
        break;
      case "members":
        await openMembers();
        break;
      case "post-comment":
        await postComment();
        break;
      case "archive-issue":
        await archiveIssue();
        break;
      case "reload-issue":
        await reloadIssue();
        break;
      case "refresh":
        button.disabled = true;
        await refresh();
        button.disabled = false;
        break;
      case "retry-project":
        await loadProject();
        break;
      case "retry-workspace":
        button.disabled = true;
        await loadWorkspace();
        break;
      case "clear-filters":
        resetFilters();
        $("#search").value = "";
        $$(".filter-select", $("#toolbar")).forEach((select) => {
          select.value = "";
        });
        await refresh();
        break;
      case "menu": {
        const open = $(".sidebar").classList.toggle("open");
        button.setAttribute("aria-expanded", String(open));
        break;
      }
      case "logout":
        if (state.authBusy) break;
        button.disabled = true;
        await logout();
        break;
    }
  } catch (error) {
    toast(error.message, true);
    button.disabled = false;
  }
});

document.addEventListener("submit", async (event) => {
  if (!["issue-form", "project-form", "member-form"].includes(event.target.id)) return;
  event.preventDefault();
  if (event.target.id === "issue-form") await saveIssue(event.target);
  if (event.target.id === "project-form") await saveProject(event.target);
  if (event.target.id === "member-form") {
    const data = new FormData(event.target);
    await mutateMember(Number(data.get("userId")), data.get("role"));
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "project-key") event.target.value = event.target.value.toUpperCase();
  if (event.target.id === "search") {
    state.filters.q = event.target.value;
    // Debounced; the timer lives in state.js so project/account transitions
    // can cancel a queued search that would refresh the wrong screen.
    queueSearch(() => refresh());
  }
});

document.addEventListener("change", (event) => {
  const filter = {
    "filter-status": "status",
    "filter-priority": "priority",
    "filter-assignee": "assigneeId",
  }[event.target.id];
  if (filter) {
    state.filters[filter] = event.target.value;
    refresh();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    $(".sidebar")?.classList.remove("open");
    $("details.user-menu")?.removeAttribute("open");
    $('[data-action="menu"]')?.setAttribute("aria-expanded", "false");
  }
});

document.addEventListener("click", (event) => {
  const menu = $("details.user-menu");
  if (menu?.open && !menu.contains(event.target)) menu.open = false;
});

// Dialog lifecycle guards. "cancel" fires on Escape: while a write is pending
// the dialog must stay open so the eventual response cannot land in a dialog
// the user has since reopened for something else. "close" bumps the identity
// token, which invalidates any read still in flight for the old occupant.
$("#issue-dialog").addEventListener("cancel", (event) => {
  if (state.issueBusy) event.preventDefault();
});
$("#issue-dialog").addEventListener("close", () => {
  state.issueToken++;
});
$("#members-dialog").addEventListener("cancel", (event) => {
  if (state.memberBusy) event.preventDefault();
});
$("#members-dialog").addEventListener("close", () => {
  state.memberToken++;
});
$("#project-dialog").addEventListener("cancel", (event) => {
  if (state.projectBusy) event.preventDefault();
});

// Polling is a reader, never a writer. It stays quiet while a dialog is open,
// the tab is hidden, or the user is mid-search, and its data is discarded by
// the generation check in refresh() if a newer load has started.
setInterval(() => {
  if (
    state.user &&
    state.projectId &&
    !anyDialog() &&
    !document.hidden &&
    document.activeElement?.id !== "search"
  )
    refresh({ quiet: true });
}, 25000);

async function boot() {
  try {
    state.users = (await api("/demo-users")).users;
    try {
      state.user = (await api("/session")).user;
    } catch (error) {
      if (error.status !== 401) throw error;
    }
    if (state.user) await loadWorkspace();
    else renderLogin();
  } catch (error) {
    $("#app").innerHTML =
      `<main class="boot"><span class="brand-symbol">g</span><h1>Couldn't open the workspace.</h1><p>${escape(error.message)}</p><button class="button primary" id="boot-retry">Try again</button></main>`;
    $("#boot-retry").addEventListener("click", boot, { once: true });
  }
}
boot();
