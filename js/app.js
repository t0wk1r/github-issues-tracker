const API_BASE = "https://phi-lab-server.vercel.app/api/v1/lab";

const state = {
  allIssues: [],
  visibleIssues: [],
  currentTab: "all",
  searchText: ""
};

document.addEventListener("DOMContentLoaded", () => {
  if (!window.Auth.isLoggedIn()) {
    window.location.href = "./index.html";
    return;
  }

  cacheDom();
  bindEvents();
  updateActiveTabUI();
  loadAllIssues();
});

let dom = {};

function cacheDom() {
  dom.pageTitle = document.getElementById("pageTitle");
  dom.searchForm = document.getElementById("searchForm");
  dom.searchInput = document.getElementById("searchInput");
  dom.logoutBtn = document.getElementById("logoutBtn");
  dom.loader = document.getElementById("loader");
  dom.issuesGrid = document.getElementById("issuesGrid");
  dom.emptyState = document.getElementById("emptyState");
  dom.statusMessage = document.getElementById("statusMessage");
  dom.issueCountText = document.getElementById("issueCountText");
  dom.openCount = document.getElementById("openCount");
  dom.closedCount = document.getElementById("closedCount");
  dom.tabButtons = document.querySelectorAll(".tab-btn");

  dom.issueModal = document.getElementById("issueModal");
  dom.modalOverlay = document.getElementById("modalOverlay");
  dom.closeModalBtn = document.getElementById("closeModalBtn");
  dom.modalTitle = document.getElementById("modalTitle");
  dom.modalMeta = document.getElementById("modalMeta");
  dom.modalBody = document.getElementById("modalBody");
}

function bindEvents() {
  dom.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.currentTab = button.dataset.tab;
      updateActiveTabUI();
      applyFiltersAndRender();
    });
  });

  dom.searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = dom.searchInput.value.trim();

    if (!query) {
      state.searchText = "";
      await loadAllIssues();
      return;
    }

    state.searchText = query;
    await searchIssues(query);
  });

  dom.logoutBtn.addEventListener("click", () => {
    window.Auth.logout();
    window.location.href = "./index.html";
  });

  dom.closeModalBtn.addEventListener("click", closeModal);
  dom.modalOverlay.addEventListener("click", closeModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });
}

async function loadAllIssues() {
  setLoading(true);
  hideStatusMessage();

  try {
    const response = await fetch(`${API_BASE}/issues`);
    const result = await response.json();

    if (!response.ok || result.status !== "success") {
      throw new Error("Failed to load issues.");
    }

    state.allIssues = Array.isArray(result.data) ? result.data : [];
    applyFiltersAndRender();
  } catch (error) {
    state.allIssues = [];
    renderIssues([]);
    showStatusMessage("Failed to load issues. Please try again.", "error");
  } finally {
    setLoading(false);
  }
}

async function searchIssues(query) {
  setLoading(true);
  hideStatusMessage();

  try {
    const response = await fetch(
      `${API_BASE}/issues/search?q=${encodeURIComponent(query)}`
    );
    const result = await response.json();

    if (!response.ok || result.status !== "success") {
      throw new Error("Search failed.");
    }

    state.allIssues = Array.isArray(result.data) ? result.data : [];
    applyFiltersAndRender();

    if (state.allIssues.length > 0) {
      showStatusMessage(`Showing search results for "${query}"`, "info");
    } else {
      showStatusMessage(`No results found for "${query}"`, "info");
    }
  } catch (error) {
    state.allIssues = [];
    renderIssues([]);
    showStatusMessage("Search failed. Please try again.", "error");
  } finally {
    setLoading(false);
  }
}

function applyFiltersAndRender() {
  let filtered = [...state.allIssues];

  if (state.currentTab !== "all") {
    filtered = filtered.filter((issue) => issue.status === state.currentTab);
  }

  state.visibleIssues = filtered;

  updateHeaderTitle();
  updateCounts();
  renderIssues(filtered);
}

function updateHeaderTitle() {
  const titleMap = {
    all: "All Issues",
    open: "Open Issues",
    closed: "Closed Issues"
  };

  dom.pageTitle.textContent = titleMap[state.currentTab];
}

function updateCounts() {
  const openCount = state.allIssues.filter((issue) => issue.status === "open").length;
  const closedCount = state.allIssues.filter((issue) => issue.status === "closed").length;

  dom.openCount.textContent = openCount;
  dom.closedCount.textContent = closedCount;
  dom.issueCountText.textContent = `${state.visibleIssues.length} Issues`;
}

function updateActiveTabUI() {
  dom.tabButtons.forEach((button) => {
    const isActive = button.dataset.tab === state.currentTab;

    if (isActive) {
      button.className =
        "tab-btn rounded-xl border border-brand-600 bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition";
    } else {
      button.className =
        "tab-btn rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";
    }
  });
}

function renderIssues(issues) {
  dom.issuesGrid.innerHTML = "";

  if (!issues.length) {
    dom.emptyState.classList.remove("hidden");
    dom.issuesGrid.classList.add("hidden");
    return;
  }

  dom.emptyState.classList.add("hidden");
  dom.issuesGrid.classList.remove("hidden");

  const cards = issues.map((issue) => {
    return `
      <article
        data-id="${issue.id}"
        class="issue-card cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-lg ${issue.status === "open" ? "border-t-4 border-t-emerald-500" : "border-t-4 border-t-purple-500"}"
      >
        <div class="mb-4 flex items-start justify-between gap-3">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${issue.status === "open" ? "bg-emerald-50 text-emerald-600" : "bg-purple-50 text-purple-600"}">
            ${issue.status === "open" ? statusOpenIcon() : statusClosedIcon()}
          </span>

          <span class="rounded-full border px-2.5 py-1 text-xs font-semibold ${getPriorityClasses(issue.priority)}">
            ${capitalize(issue.priority)}
          </span>
        </div>

        <h3 class="text-lg font-bold leading-snug text-slate-800">
          ${escapeHtml(issue.title)}
        </h3>

        <p class="mt-3 min-h-[72px] text-sm leading-6 text-slate-500">
          ${escapeHtml(truncateText(cleanDescription(issue.description), 120))}
        </p>

        <div class="mt-4 flex flex-wrap gap-2">
          ${(issue.labels || []).map(label => `
            <span class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
              ${escapeHtml(label)}
            </span>
          `).join("")}
        </div>

        <div class="mt-5 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 text-xs text-slate-500">
          <div>
            <p class="font-semibold text-slate-700">#${issue.id} by ${escapeHtml(issue.author || "Unknown")}</p>
            <p class="mt-1">Assignee: ${escapeHtml(issue.assignee || "Unassigned")}</p>
          </div>
          <div class="text-right">
            <p>${formatDate(issue.createdAt)}</p>
            <p class="mt-1">Updated: ${formatDate(issue.updatedAt)}</p>
          </div>
        </div>
      </article>
    `;
  }).join("");

  dom.issuesGrid.innerHTML = cards;

  document.querySelectorAll(".issue-card").forEach((card) => {
    card.addEventListener("click", () => {
      const issueId = card.dataset.id;
      openIssueModal(issueId);
    });
  });
}

async function openIssueModal(id) {
  dom.issueModal.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");

  dom.modalTitle.textContent = "Loading issue...";
  dom.modalMeta.innerHTML = "";
  dom.modalBody.innerHTML = `
    <div class="flex justify-center py-10">
      <div class="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"></div>
    </div>
  `;

  try {
    const response = await fetch(`${API_BASE}/issue/${id}`);
    const result = await response.json();

    if (!response.ok || result.status !== "success") {
      throw new Error("Failed to load issue details.");
    }

    const issue = result.data;

    dom.modalTitle.textContent = issue.title || "Untitled Issue";

    dom.modalMeta.innerHTML = `
      <span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        issue.status === "closed"
          ? "bg-purple-100 text-purple-700"
          : "bg-emerald-100 text-emerald-700"
      }">
        ${capitalize(issue.status || "open")}
      </span>
      <span class="text-slate-300">•</span>
      <span>Opened by <span class="font-semibold text-slate-700">${escapeHtml(issue.author || "Unknown")}</span></span>
      <span class="text-slate-300">•</span>
      <span>${formatDate(issue.createdAt)}</span>
    `;

    dom.modalBody.innerHTML = `
      <div class="space-y-5">
        <!-- Labels -->
        <div class="flex flex-wrap gap-2">
          ${
            issue.labels && issue.labels.length
              ? issue.labels.map(label => `
                <span class="rounded-[4px] bg-amber-200 px-2 py-[3px] text-[10px] font-bold uppercase text-amber-900">
                  ${escapeHtml(label)}
                </span>
              `).join("")
              : `<span class="text-sm text-slate-400">No labels</span>`
          }
        </div>

        <!-- Description -->
        <div>
          <p class="text-[15px] leading-7 text-slate-600">
            ${escapeHtml(issue.description || "No description available.")}
          </p>
        </div>

        <!-- Info Box -->
        <div class="rounded-[10px] bg-slate-50 px-4 py-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-[12px] text-slate-400">Assignee:</p>
              <p class="mt-1 text-[15px] font-semibold text-slate-700">
                ${escapeHtml(issue.assignee || "Unassigned")}
              </p>
            </div>

            <div class="text-right">
              <p class="text-[12px] text-slate-400">Priority:</p>
              <span class="mt-1 inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase ${
                getModalPriorityClasses(issue.priority)
              }">
                ${escapeHtml(issue.priority || "low")}
              </span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end pt-1">
          <button
            type="button"
            onclick="closeModal()"
            class="rounded-[8px] bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Close
          </button>
        </div>
      </div>
    `;
  } catch (error) {
    dom.modalTitle.textContent = "Error";
    dom.modalMeta.innerHTML = "";
    dom.modalBody.innerHTML = `
      <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
        Failed to load issue details.
      </div>
      <div class="mt-4 flex justify-end">
        <button
          type="button"
          onclick="closeModal()"
          class="rounded-[8px] bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Close
        </button>
      </div>
    `;
  }
}

function getModalPriorityClasses(priority) {
  const p = (priority || "").toLowerCase();

  if (p === "high") return "bg-red-500 text-white";
  if (p === "medium") return "bg-yellow-300 text-slate-800";
  return "bg-slate-300 text-slate-700";
}

function closeModal() {
  dom.issueModal.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}
window.closeModal = closeModal;

function setLoading(isLoading) {
  if (isLoading) {
    dom.loader.classList.remove("hidden");
    dom.issuesGrid.classList.add("hidden");
    dom.emptyState.classList.add("hidden");
  } else {
    dom.loader.classList.add("hidden");
  }
}

function showStatusMessage(message, type = "info") {
  const typeClasses = {
    info: "border-blue-200 bg-blue-50 text-blue-700",
    error: "border-red-200 bg-red-50 text-red-700"
  };

  dom.statusMessage.className = `mb-5 rounded-2xl border px-4 py-3 text-sm ${typeClasses[type]}`;
  dom.statusMessage.textContent = message;
  dom.statusMessage.classList.remove("hidden");
}

function hideStatusMessage() {
  dom.statusMessage.classList.add("hidden");
}

function getPriorityClasses(priority) {
  const map = {
    high: "border-red-200 bg-red-50 text-red-700",
    medium: "border-yellow-200 bg-yellow-50 text-yellow-700",
    low: "border-slate-200 bg-slate-50 text-slate-600"
  };

  return map[priority] || map.low;
}

function capitalize(text = "") {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US");
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

function cleanDescription(text = "") {
  return text.replace(/\s+/g, " ").trim();
}

function escapeHtml(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function statusOpenIcon() {
  return `
    <img src="../assets/Open-Status.png" />
  `;
}

function statusClosedIcon() {
  return `
    <img src="../assets/Closed- Status .png" />
  `;
}