document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  /* =========================
     FOOTER YEAR (global)
  ========================= */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* =========================
     OPTIONAL: GA CLICK TRACKING
     - Add data-track + data-label to links/buttons
  ========================= */
  (() => {
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-track]");
      if (!el) return;

      const action = el.getAttribute("data-track") || "click";
      const label = el.getAttribute("data-label") || el.textContent.trim().slice(0, 80);

      if (window.gtag) {
        window.gtag("event", action, {
          event_category: "engagement",
          event_label: label,
        });
      }
    });
  })();

  /* =========================
     MOBILE NAV TOGGLE (KMC)
  ========================= */
  (() => {
    const toggle = document.querySelector("[data-nav-toggle]");
    const nav = document.querySelector("[data-nav]");
    if (!toggle || !nav) return;

    const isOpen = () => nav.classList.contains("is-open");

    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    };

    toggle.addEventListener("click", () => setOpen(!isOpen()));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });

    nav.addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (link) setOpen(false);
    });

    document.addEventListener("click", (e) => {
      if (!isOpen()) return;
      const clickedToggle = e.target.closest("[data-nav-toggle]");
      const clickedNav = e.target.closest("[data-nav]");
      if (!clickedToggle && !clickedNav) setOpen(false);
    });

    window.addEventListener("resize", () => {
      if (window.matchMedia("(min-width: 768px)").matches) setOpen(false);
    });
  })();

  /* =========================
     PREFILL CONTACT SELECT
  ========================= */
  (() => {
    const params = new URLSearchParams(window.location.search);
    const typeRaw = (params.get("type") || "").trim().toLowerCase();
    if (!typeRaw) return;

    const select =
      document.querySelector("#project_type") ||
      document.querySelector("select[name='project_type']") ||
      document.querySelector("#service") ||
      document.querySelector("select[name='service']") ||
      document.querySelector("#support_level") ||
      document.querySelector("select[name='support_level']") ||
      document.querySelector("#inquiry_type") ||
      document.querySelector("select[name='inquiry_type']");

    if (!select || select.tagName !== "SELECT") return;

    const desired =
      typeRaw === "strategy" ? "strategy" :
      typeRaw === "standard" ? "website" :
      "";

    if (!desired) return;

    const options = Array.from(select.options);
    const found = options.find((o) => (o.value || "").toLowerCase() === desired);

    if (found) {
      select.value = found.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  })();

  /* =========================
     STRATEGY FOLLOW-UP TOGGLE
  ========================= */
  (() => {
    const projectType =
      document.querySelector("#project_type") ||
      document.querySelector("select[name='project_type']");

    const followup = document.getElementById("strategyFollowup");
    const focus = document.getElementById("strategy_focus");
    const link = document.getElementById("strategy_link");

    if (!projectType || !followup) return;

    const setState = () => {
      const isStrategy = (projectType.value || "").toLowerCase() === "strategy";

      followup.hidden = !isStrategy;
      if (focus) focus.required = isStrategy;

      if (!isStrategy) {
        if (focus) focus.value = "";
        if (link) link.value = "";
      }
    };

    setState();
    projectType.addEventListener("change", setState);
  })();

  /* =========================
     CONTACT FORM SUBMIT
  ========================= */
  const form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!form.action) {
        alert("Form action is missing. Please set your form endpoint and try again.");
        return;
      }

      const formData = new FormData(form);

      try {
        const res = await fetch(form.action, {
          method: "POST",
          body: formData,
          headers: { Accept: "application/json" },
        });

        if (res.ok) {
          if (window.gtag) {
            window.gtag("event", "contact_form_submit", {
              event_category: "engagement",
              event_label: "start_project",
            });
          }
          window.location.assign("thank-you.html");
        } else {
          alert("Something went wrong. Please check your entries and try again.");
        }
      } catch {
        alert("Network error. Please try again.");
      }
    });
  }

  /* =========================
     LIGHTBOX (click-to-zoom)
  ========================= */
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightboxImg");

  if (lb && lbImg) {
    let lastActiveEl = null;

    const open = (imgEl) => {
      lastActiveEl = document.activeElement;

      const src = imgEl.getAttribute("src");
      const alt = imgEl.getAttribute("alt") || "Preview image";

      lbImg.src = src;
      lbImg.alt = alt;

      lb.classList.add("is-open");
      lb.setAttribute("aria-hidden", "false");

      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    };

    const close = () => {
      lb.classList.remove("is-open");
      lb.setAttribute("aria-hidden", "true");

      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";

      lbImg.src = "";
      lbImg.alt = "";

      if (lastActiveEl && typeof lastActiveEl.focus === "function") {
        lastActiveEl.focus();
      }
      lastActiveEl = null;
    };

    document.addEventListener("click", (e) => {
      const img = e.target.closest("img[data-lightbox]");
      if (!img) return;

      // If image is inside a link, let the link behave normally
      if (e.target.closest("a")) return;

      open(img);
    });

    lb.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) {
        close();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && lb.classList.contains("is-open")) close();
    });
  }
});
