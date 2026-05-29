const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const navLinks = document.querySelectorAll(".site-nav a");
const timeline = document.querySelector("[data-timeline]");

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
  const start = new Date(`${timeline.dataset.start}T00:00:00`);
  const end = new Date(`${timeline.dataset.end}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalRange = Math.max(end - start, 1);
  const elapsed = Math.min(Math.max(today - start, 0), totalRange);
  const progress = (elapsed / totalRange) * 100;

  if (fill) {
    fill.style.width = `${progress}%`;
  }

  if (nowMarker) {
    nowMarker.style.left = `${progress}%`;
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
