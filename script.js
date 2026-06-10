const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const navLinks = document.querySelectorAll(".site-nav a");
const timeline = document.querySelector("[data-timeline]");
const leaderboardBody = document.querySelector("[data-leaderboard-body]");

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const expanded = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!expanded));
    siteNav.classList.toggle("open");
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    if (!siteNav || !navToggle) {
      return;
    }

    siteNav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

if (timeline) {
  const fill = timeline.querySelector("[data-timeline-fill]");
  const nowMarker = timeline.querySelector("[data-timeline-now]");
  const steps = Array.from(timeline.querySelectorAll(".timeline-step"));
  const stepDates = steps.map((step) => new Date(`${step.dataset.date}T00:00:00`));
  const start = new Date(Math.min(...stepDates));
  const end = new Date(Math.max(...stepDates));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalRange = Math.max(end - start, 1);
  const elapsed = Math.min(Math.max(today - start, 0), totalRange);
  const progress = (elapsed / totalRange) * 100;

  if (fill) {
    fill.style.width = `${progress}%`;
  }

  if (nowMarker) {
    nowMarker.style.left = `clamp(0.75rem, ${progress}%, calc(100% - 0.75rem))`;
  }

  let currentIndex = steps.findIndex((step) => {
    const stepDate = new Date(`${step.dataset.date}T00:00:00`);
    return today <= stepDate;
  });

  if (currentIndex === -1) {
    currentIndex = steps.length - 1;
  }

  steps.forEach((step, index) => {
    const stepDate = new Date(`${step.dataset.date}T00:00:00`);
    const isComplete = today > stepDate;
    const isCurrent = index === currentIndex;

    step.classList.toggle("is-complete", isComplete);
    step.classList.toggle("is-current", isCurrent);
  });
}

if (leaderboardBody) {
  const leaderboardStatus = document.querySelector("[data-leaderboard-status]");
  const leaderboardUpdated = document.querySelector("[data-leaderboard-updated]");
  const leaderboardColumns = [
    { key: "macro_f1", precision: 2 },
    { key: "macro_precision", precision: 2 },
    { key: "macro_recall", precision: 2 },
    { key: "accuracy", precision: 2 },
    { key: "quadratic_weighted_kappa", precision: 2 },
  ];

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => {
      const replacements = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };

      return replacements[character];
    });

  const formatScore = (value, precision) => {
    if (value === null || value === undefined || value === "") {
      return "n/a";
    }

    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
      return numericValue.toFixed(precision);
    }

    return escapeHtml(value);
  };

  const formatDate = (value) => {
    if (!value) {
      return "n/a";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "n/a";
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (value) => {
    if (!value) {
      return "unknown time";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "unknown time";
    }

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const renderLink = (label, url) => {
    if (!url) {
      return escapeHtml(label);
    }

    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
  };

  const renderRank = (rank) => {
    const numericRank = Number(rank);
    const medal =
      numericRank === 1
        ? { icon: "&#129351;", className: "leaderboard-medal-gold" }
        : numericRank === 2
          ? { icon: "&#129352;", className: "leaderboard-medal-silver" }
          : null;

    if (!medal) {
      return escapeHtml(rank);
    }

    return `
      <span class="leaderboard-rank-wrap">
        <span class="leaderboard-medal ${medal.className}" aria-hidden="true">${medal.icon}</span>
        <span class="leaderboard-rank-text">${escapeHtml(rank)}</span>
      </span>
    `;
  };

  const renderLeaderboard = async () => {
    try {
      const response = await fetch("assets/leaderboard.json", { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Leaderboard request failed with ${response.status}`);
      }

      const leaderboard = await response.json();
      const entries = Array.isArray(leaderboard.entries) ? leaderboard.entries : [];

      if (!entries.length) {
        leaderboardBody.innerHTML = `
          <tr>
            <td colspan="8" class="leaderboard-empty">
              No public CodaBench submissions have been added to the leaderboard yet.
            </td>
          </tr>
        `;
      } else {
        leaderboardBody.innerHTML = entries
          .map((entry) => {
            const scoreCells = leaderboardColumns
              .map(
                (column) =>
                  `<td class="leaderboard-score">${formatScore(
                    entry.scores?.[column.key],
                    column.precision,
                  )}</td>`,
              )
              .join("");

            return `
              <tr>
                <td class="leaderboard-rank">${renderRank(entry.rank)}</td>
                <td>${renderLink(entry.participant, entry.participant_url)}</td>
                ${scoreCells}
                <td>${formatDate(entry.submitted_at)}</td>
              </tr>
            `;
          })
          .join("");
      }

      if (leaderboardStatus) {
        const totalEntries = leaderboard.total_entries ?? entries.length;
        leaderboardStatus.textContent = `${totalEntries} public leaderboard submissions`;
      }

      if (leaderboardUpdated) {
        leaderboardUpdated.textContent = `Last mirrored from CodaBench: ${formatDateTime(
          leaderboard.fetched_at,
        )}.`;
      }
    } catch (error) {
      leaderboardBody.innerHTML = `
        <tr>
          <td colspan="8" class="leaderboard-empty">
            The mirrored leaderboard could not be loaded. Please open CodaBench for the live results.
          </td>
        </tr>
      `;

      if (leaderboardStatus) {
        leaderboardStatus.textContent = "Leaderboard mirror unavailable";
      }

      if (leaderboardUpdated) {
        leaderboardUpdated.textContent = "";
      }

      console.error(error);
    }
  };

  renderLeaderboard();
}
