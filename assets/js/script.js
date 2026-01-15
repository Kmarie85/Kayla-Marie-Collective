document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  /* =========================================================
     HELPERS
  ========================================================= */
  const qs = (sel, root = document) => root.querySelector(sel);

  const getParam = (key) => {
    try {
      return (new URLSearchParams(window.location.search).get(key) || "").trim();
    } catch {
      return "";
    }
  };

  const gtagEvent = (action, label, extra = {}) => {
    if (!window.gtag) return;
    window.gtag("event", action || "click", {
      event_category: "engagement",
      event_label: label || "unknown",
      ...extra,
    });
  };

  const safeLower = (v) => (v == null ? "" : String(v)).trim().toLowerCase();

  /* =========================
     SOURCE LABEL (attribution)
     Priority:
     1) ?source=...
     2) ?type=... -> type_strategy/type_standard
     3) direct
  ========================= */
  const sourceLabel =
    getParam("source") ||
    (getParam("type") ? `type_${safeLower(getParam("type"))}` : "") ||
    "direct";

  /* =========================
     FOOTER YEAR (global)
  ========================= */
  const yearEl = qs("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* =========================
     GA CLICK TRACKING (global)
     - Add data-track + data-label to links/buttons
  ========================= */
  (() => {
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-track]");
      if (!el) return;

      const action = el.getAttribute("data-track") || "click";
      const explicitLabel = (el.getAttribute("data-label") || "").trim();

      const textFallback = (el.textContent || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 80);

      const href = (el.getAttribute("href") || "").trim();
      const hrefFallback = href ? `href:${href}` : "";

      const label = explicitLabel || textFallback || hrefFallback || "unknown";

      const isOutbound =
        href &&
        /^https?:\/\//i.test(href) &&
        !href.includes(window.location.hostname);

      gtagEvent(
        action,
        label,
        isOutbound ? { outbound: true, link_url: href } : {}
      );
    });
  })();

  /* =========================
     MOBILE NAV TOGGLE (KMC)
  ========================= */
  (() => {
    const toggle = qs("[data-nav-toggle]");
    const nav = qs("[data-nav]");
    if (!toggle || !nav) return;

    const isOpen = () => nav.classList.contains("is-open");

    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      toggle.classList.toggle("is-open", open);
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
     - Priority:
       1) ?project_type=wellness_essentials|wellness_growth|website|...
       2) ?service=website|product|funnel|strategy (legacy)
       3) ?type=strategy|standard (legacy fallback)
     - Targets: #project_type (your contact page)
  ========================= */
  (() => {
    const select =
      qs("#project_type") ||
      qs("select[name='project_type']") ||
      qs("#service") ||
      qs("select[name='service']") ||
      qs("#support_level") ||
      qs("select[name='support_level']") ||
      qs("#inquiry_type") ||
      qs("select[name='inquiry_type']");

    if (!select || select.tagName !== "SELECT") return;

    const projectTypeRaw = safeLower(getParam("project_type"));
    const serviceRaw = safeLower(getParam("service"));
    const typeRaw = safeLower(getParam("type"));

    const serviceMap = {
      website: "website",
      product: "product",
      funnel: "funnel",
      strategy: "strategy",
      wellness_essentials: "wellness_essentials",
      wellness_growth: "wellness_growth",
    };

    let desired = "";

    if (projectTypeRaw && serviceMap[projectTypeRaw]) {
      desired = serviceMap[projectTypeRaw];
    } else if (serviceRaw && serviceMap[serviceRaw]) {
      desired = serviceMap[serviceRaw];
    } else {
      desired =
        typeRaw === "strategy"
          ? "strategy"
          : typeRaw === "standard"
          ? "website"
          : "";
    }

    if (!desired) return;

    const found = Array.from(select.options).find(
      (o) => safeLower(o.value) === desired
    );

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
      qs("#project_type") || qs("select[name='project_type']");
    const followup = qs("#strategyFollowup");
    const focus = qs("#strategy_focus");
    const link = qs("#strategy_link");

    if (!projectType || !followup) return;

    const setState = () => {
      const isStrategy = safeLower(projectType.value) === "strategy";
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
     CONTACT ATTRIBUTION + GA EVENTS
     - Fills hidden fields if present:
       #source, #source_page, #referrer
     - Tracks view/start/attempt/success/error
     - Stores attribution for thank-you page
     - Service hint priority:
       1) ?project_type=
       2) ?service= (legacy)
       3) dropdown value
       4) unknown
  ========================= */
  (() => {
    const form = qs("#contactForm");
    if (!form) return;

    const projectType =
      qs("#project_type", form) || qs("select[name='project_type']", form);

    let serviceHint =
      safeLower(getParam("project_type")) ||
      safeLower(getParam("service")) ||
      safeLower(projectType && projectType.value) ||
      "unknown";

    if (projectType) {
      projectType.addEventListener("change", () => {
        serviceHint =
          safeLower(getParam("project_type")) ||
          safeLower(getParam("service")) ||
          safeLower(projectType.value) ||
          "unknown";
      });
    }

    // Fill hidden attribution fields
    const sourceInput = qs("#source", form);
    const sourcePageInput = qs("#source_page", form);
    const referrerInput = qs("#referrer", form);

    const pageUrl = window.location.href;
    const ref = document.referrer || "";

    if (sourceInput) sourceInput.value = sourceLabel;
    if (sourcePageInput) sourcePageInput.value = pageUrl;
    if (referrerInput) referrerInput.value = ref;

    // View (once)
    gtagEvent("contact_form_view", sourceLabel, { service: serviceHint });

    // Start (once)
    let started = false;
    const markStarted = () => {
      if (started) return;
      started = true;
      gtagEvent("contact_form_start", sourceLabel, { service: serviceHint });
    };

    form.addEventListener("focusin", (e) => {
      if (e.target && e.target.matches("input, select, textarea")) markStarted();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!form.action) {
        alert("Form action is missing. Please set your form endpoint and try again.");
        return;
      }

      // Update one last time at submit
      serviceHint =
        safeLower(getParam("project_type")) ||
        safeLower(getParam("service")) ||
        safeLower(projectType && projectType.value) ||
        "unknown";

      gtagEvent("contact_form_submit_attempt", sourceLabel, { service: serviceHint });

      const formData = new FormData(form);

      try {
        const res = await fetch(form.action, {
          method: "POST",
          body: formData,
          headers: { Accept: "application/json" },
        });

        if (res.ok) {
          gtagEvent("contact_form_submit_success", sourceLabel, { service: serviceHint });

          // Store attribution so thank-you can fire a reliable conversion event
          try {
            sessionStorage.setItem("kmc_last_source", sourceLabel);
            sessionStorage.setItem("kmc_last_service", serviceHint);
            sessionStorage.setItem("kmc_last_ts", String(Date.now()));
          } catch {}

          // Add query params as fallback attribution/debugging
          const thankYouUrl = `thank-you.html?source=${encodeURIComponent(
            sourceLabel
          )}&project_type=${encodeURIComponent(serviceHint)}`;

          window.location.assign(thankYouUrl);
        } else {
          gtagEvent("contact_form_submit_error", sourceLabel, {
            service: serviceHint,
            status: res.status || 0,
          });
          alert("Something went wrong. Please check your entries and try again.");
        }
      } catch {
        gtagEvent("contact_form_submit_error", sourceLabel, {
          service: serviceHint,
          status: "network_error",
        });
        alert("Network error. Please try again.");
      }
    });
  })();

  /* =========================
     THANK-YOU PAGE: FINAL CONVERSION EVENT
     - Fires once using sessionStorage attribution from submit
     - Fallback: uses query params if sessionStorage missing
  ========================= */
  (() => {
    const isThankYou =
      /\/thank-you\.html(\?|#|$)/i.test(window.location.pathname) ||
      /thank-you\.html(\?|#|$)/i.test(window.location.href);

    if (!isThankYou) return;

    let src = "unknown";
    let svc = "unknown";
    let ts = 0;

    try {
      src = sessionStorage.getItem("kmc_last_source") || "";
      svc = sessionStorage.getItem("kmc_last_service") || "";
      ts = Number(sessionStorage.getItem("kmc_last_ts") || "0");
    } catch {}

    // Fallback to URL params if needed
    src = src || getParam("source") || "unknown";
    svc =
      svc ||
      safeLower(getParam("project_type")) ||
      safeLower(getParam("service")) ||
      "unknown";

    const ageMs = ts ? Date.now() - ts : Infinity;
    const recentEnough = ageMs >= 0 && ageMs < 10 * 60 * 1000; // 10 minutes

    if (recentEnough) {
      gtagEvent("inquiry_thank_you_view", src, { service: svc });
      try {
        sessionStorage.removeItem("kmc_last_source");
        sessionStorage.removeItem("kmc_last_service");
        sessionStorage.removeItem("kmc_last_ts");
      } catch {}
    } else {
      gtagEvent("thank_you_view", "thank_you", { service: svc });
    }
  })();

  /* =========================
     LIGHTBOX (click-to-zoom)
  ========================= */
  (() => {
    const lb = qs("#lightbox");
    const lbImg = qs("#lightboxImg");
    if (!lb || !lbImg) return;

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
      if (e.target.closest("a")) return;
      open(img);
    });

    lb.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && lb.classList.contains("is-open")) close();
    });
  })();
});
