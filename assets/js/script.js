document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  /* =========================
     FOOTER YEAR (global)
  ========================= */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* =========================
     PREFILL CONTACT SELECT (Option A)
     - contact.html?type=strategy  -> selects "strategy"
     - contact.html?type=standard  -> selects "website" (default)
     - Safe on pages without the select
  ========================= */
  (() => {
    const params = new URLSearchParams(window.location.search);
    const typeRaw = (params.get("type") || "").trim().toLowerCase();
    if (!typeRaw) return;

    // Prefer the actual contact select you added
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

    // Set desired value based on type
    const desired =
      typeRaw === "strategy" ? "strategy" :
      typeRaw === "standard" ? "website" :
      ""; // ignore unknowns

    if (!desired) return;

    // Only set if that option exists
    const options = Array.from(select.options);
    const found = options.find((o) => (o.value || "").toLowerCase() === desired);

    if (found) {
      select.value = found.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  })();

  /* =========================
     STRATEGY FOLLOW-UP TOGGLE
     - Shows #strategyFollowup only when project_type === "strategy"
     - Makes #strategy_focus required only when visible
     - Clears strategy fields when switching away
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

    // Initialize (important when prefill sets strategy via query param)
    setState();

    projectType.addEventListener("change", setState);
  })();

  /* =========================
     CONTACT FORM SUBMIT (contact.html only)
  ========================= */
  const form = document.getElementById("contactForm");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(form);

      try {
        const res = await fetch(form.action, {
          method: "POST",
          body: formData,
          headers: { Accept: "application/json" },
        });

        if (res.ok) {
          // GA4 event tracking
          if (window.gtag) {
            window.gtag("event", "contact_form_submit", {
              event_category: "engagement",
              event_label: "start_project",
            });
          }

          // Redirect to custom thank-you page
          window.location.assign("thank-you.html");
        } else {
          alert("Something went wrong. Please check your entries and try again.");
        }
      } catch (err) {
        alert("Network error. Please try again.");
      }
    });
  }

  /* =========================
     LIGHTBOX (click-to-zoom)
     - Add data-lightbox to any <img>
     - Requires:
       #lightbox, #lightboxImg, [data-close]
     - Safe on pages without lightbox
  ========================= */
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightboxImg");

  if (lb && lbImg) {
    const open = (imgEl) => {
      const src = imgEl.getAttribute("src");
      const alt = imgEl.getAttribute("alt") || "Preview image";

      lbImg.src = src;
      lbImg.alt = alt;

      lb.classList.add("is-open");
      lb.setAttribute("aria-hidden", "false");

      // prevent background scroll
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    };

    const close = () => {
      lb.classList.remove("is-open");
      lb.setAttribute("aria-hidden", "true");

      // restore scroll
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";

      // clear image
      lbImg.src = "";
      lbImg.alt = "";
    };

    // Open when clicking any image with data-lightbox
    document.addEventListener("click", (e) => {
      const img = e.target.closest("img[data-lightbox]");
      if (!img) return;
      open(img);
    });

    // Close when clicking backdrop or close button
    lb.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) close();
    });

    // Close on ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && lb.classList.contains("is-open")) close();
    });
  }
});
