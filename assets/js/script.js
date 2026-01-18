document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  /* =========================================================
     HELPERS
  ========================================================= */
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const getParam = (key) => {
    try {
      return (new URLSearchParams(window.location.search).get(key) || "").trim();
    } catch {
      return "";
    }
  };

  const safeLower = (v) => (v == null ? "" : String(v)).trim().toLowerCase();

  // Unified tracking wrapper (doesn't throw if GA blocked)
  const track = (eventName, params = {}) => {
    try {
      if (typeof window.gtag === "function") {
        window.gtag("event", eventName, {
          page_location: window.location.href,
          page_path: window.location.pathname,
          ...params,
        });
      }
    } catch {
      // fail silent
    }
  };

  /* =========================================================
     SOURCE LABEL (attribution)
     Priority:
     1) ?source=
     2) ?type= -> type_strategy/type_standard
     3) direct
  ========================================================= */
  const sourceLabel =
    getParam("source") ||
    (getParam("type") ? `type_${safeLower(getParam("type"))}` : "") ||
    "direct";

  /* =========================================================
     FOOTER YEAR (global)
  ========================================================= */
  const yearEl = qs("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* =========================================================
     NAV ACTIVE STATES (global)
     - Adds .active + aria-current automatically based on path
     - Removes the need to hardcode class="active" in HTML
  ========================================================= */
  (() => {
    const path = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
    const nav = qs("[data-nav]");
    if (!nav) return;

    qsa("a[href]", nav).forEach((a) => {
      const href = (a.getAttribute("href") || "").trim();
      if (!href || href.startsWith("http") || href.startsWith("#")) return;

      const file = href.split("?")[0].split("#")[0].split("/").pop().toLowerCase();
      const isMatch = file === path;

      a.classList.toggle("active", isMatch);
      if (isMatch) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  })();

  /* =========================================================
     GA CLICK TRACKING (global)
     - Add data-track + data-label to links/buttons
  ========================================================= */
  (() => {
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-track]");
      if (!el) return;

      const eventName = (el.getAttribute("data-track") || "click").trim();
      const explicitLabel = (el.getAttribute("data-label") || "").trim();

      const textFallback = (el.textContent || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 80);

      const href = (el.getAttribute("href") || "").trim();
      const label = explicitLabel || textFallback || (href ? `href:${href}` : "") || "unknown";

      const isOutbound =
        href && /^https?:\/\//i.test(href) && !href.includes(window.location.hostname);

      track(eventName, {
        label,
        outbound: !!isOutbound,
        link_url: isOutbound ? href : undefined,
        source: sourceLabel,
      });
    });
  })();

  /* =========================================================
     MOBILE NAV TOGGLE (global)
     Requires:
     - button[data-nav-toggle]
     - nav[data-nav]
  ========================================================= */
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

  /* =========================================================
     SERVICES: ADD-ON ACCORDION TRACKING
     - Tracks <details class="addon"> opens (services + FAQ accordions)
  ========================================================= */
  (() => {
    const hasAddons = qs("details.addon");
    if (!hasAddons) return;

    qsa("details.addon").forEach((d) => {
      d.addEventListener("toggle", () => {
        if (!d.open) return;

        const summary = d.querySelector("summary");
        const label = (summary?.textContent || "addon_open")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 80);

        track("addon_open", {
          label,
          source: sourceLabel,
        });
      });
    });
  })();

  /* =========================================================
     CONTACT: PREFILL SELECT
     Standard: ?project_type=website|product|funnel|photography|strategy|wellness_essentials|wellness_growth
     Legacy:   ?service=website|product|funnel|photography|strategy
     Legacy:   ?type=strategy|standard -> strategy OR website
     Target:   #project_type (preferred)
  ========================================================= */
  const resolveDesiredProjectType = () => {
    const projectTypeRaw = safeLower(getParam("project_type"));
    const serviceRaw = safeLower(getParam("service"));
    const typeRaw = safeLower(getParam("type"));

    const allowed = new Set([
      "website",
      "product",
      "funnel",
      "photography",
      "strategy",
      "wellness_essentials",
      "wellness_growth",
    ]);

    if (projectTypeRaw && allowed.has(projectTypeRaw)) return projectTypeRaw;
    if (serviceRaw && allowed.has(serviceRaw)) return serviceRaw;

    if (typeRaw === "strategy") return "strategy";
    if (typeRaw === "standard") return "website";

    return "";
  };

  (() => {
    const form = qs("#contactForm");
    if (!form) return;

    const select = qs("#project_type", form) || qs("select[name='project_type']", form);
    if (!select || select.tagName !== "SELECT") return;

    const desired = resolveDesiredProjectType();
    if (!desired) return;

    const opt = Array.from(select.options).find((o) => safeLower(o.value) === desired);
    if (!opt) return;

    select.value = opt.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  })();

  /* =========================================================
     CONTACT: STRATEGY FOLLOW-UP TOGGLE
  ========================================================= */
  (() => {
    const form = qs("#contactForm");
    if (!form) return;

    const projectType = qs("#project_type", form) || qs("select[name='project_type']", form);
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

  /* =========================================================
     CONTACT: ADD-ONS (always visible, gated until project selected)
     - Disables all add-ons until a project type is chosen
     - If Photography selected: shows only photo_* add-ons
  ========================================================= */
  (() => {
    const form = qs("#contactForm");
    if (!form) return;

    const projectType = qs("#project_type", form);
    const fieldset = qs("#addonsFieldset", form);
    if (!projectType || !fieldset) return;

    const checks = qsa("input[type='checkbox'][name='addons']", fieldset);

    const setVisibility = () => {
      const t = safeLower(projectType.value);

      // Always visible fieldset
      fieldset.hidden = false;

      // Reset: show + enable everything
      checks.forEach((cb) => {
        const row = cb.closest("label");
        if (row) row.hidden = false;
        cb.disabled = false;
      });

      // No selection yet: disable all (still visible)
      if (!t) {
        checks.forEach((cb) => {
          cb.checked = false;
          cb.disabled = true;
        });
        return;
      }

      // Photography: only show photo_* checkboxes
      if (t === "photography") {
        checks.forEach((cb) => {
          const isPhoto = safeLower(cb.value).startsWith("photo_");
          const row = cb.closest("label");
          if (row) row.hidden = !isPhoto;
          if (!isPhoto) cb.checked = false;
        });
      }
    };

    setVisibility();
    projectType.addEventListener("change", setVisibility);
  })();

  /* =========================================================
     CONTACT: ATTRIBUTION + GA EVENTS + SUBMIT HANDLING
     - Fills hidden fields if present: #source, #source_page, #referrer
     - Tracks: contact_form_view/start/submit_attempt/success/error
     - Stores attribution for thank-you page conversion event
  ========================================================= */
  (() => {
    const form = qs("#contactForm");
    if (!form) return;

    const projectType = qs("#project_type", form);

    const getServiceHint = () => {
      return (
        resolveDesiredProjectType() ||
        safeLower(projectType && projectType.value) ||
        "unknown"
      );
    };

    // Fill hidden attribution fields
    const sourceInput = qs("#source", form);
    const sourcePageInput = qs("#source_page", form);
    const referrerInput = qs("#referrer", form);

    if (sourceInput) sourceInput.value = sourceLabel;
    if (sourcePageInput) sourcePageInput.value = window.location.href;
    if (referrerInput) referrerInput.value = document.referrer || "";

    // View
    track("contact_form_view", { source: sourceLabel, service: getServiceHint() });

    // Start (once)
    let started = false;
    const markStarted = () => {
      if (started) return;
      started = true;
      track("contact_form_start", { source: sourceLabel, service: getServiceHint() });
    };

    form.addEventListener("focusin", (e) => {
      if (e.target && e.target.matches("input, select, textarea")) markStarted();
    });

    // Submit (Formspree via fetch)
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!form.action) {
        alert("Form action is missing. Please set your form endpoint and try again.");
        return;
      }

      const serviceHint = getServiceHint();

      // Collect selected add-ons (for analytics)
      const addons = qsa("input[name='addons']:checked", form).map((cb) => cb.value);

      track("contact_form_submit_attempt", {
        source: sourceLabel,
        service: serviceHint,
        addons_count: addons.length,
      });

      const formData = new FormData(form);

      try {
        const res = await fetch(form.action, {
          method: "POST",
          body: formData,
          headers: { Accept: "application/json" },
        });

        if (res.ok) {
          track("contact_form_submit_success", {
            source: sourceLabel,
            service: serviceHint,
            addons_count: addons.length,
          });

          // Store attribution for thank-you page conversion event
          try {
            sessionStorage.setItem("kmc_last_source", sourceLabel);
            sessionStorage.setItem("kmc_last_service", serviceHint);
            sessionStorage.setItem("kmc_last_ts", String(Date.now()));
          } catch {}

          // Pass minimal params for debugging fallback
          const thankYouUrl = `thank-you.html?source=${encodeURIComponent(sourceLabel)}&project_type=${encodeURIComponent(serviceHint)}`;
          window.location.assign(thankYouUrl);
        } else {
          track("contact_form_submit_error", {
            source: sourceLabel,
            service: serviceHint,
            status: res.status || 0,
          });
          alert("Something went wrong. Please check your entries and try again.");
        }
      } catch {
        track("contact_form_submit_error", {
          source: sourceLabel,
          service: serviceHint,
          status: "network_error",
        });
        alert("Network error. Please try again.");
      }
    });
  })();

  /* =========================================================
     THANK-YOU PAGE: FINAL CONVERSION EVENT
     - Fires once using sessionStorage attribution from submit
     - Fallback: uses query params if sessionStorage missing
  ========================================================= */
  (() => {
    const isThankYou =
      /\/thank-you\.html(\?|#|$)/i.test(window.location.pathname) ||
      /thank-you\.html(\?|#|$)/i.test(window.location.href);

    if (!isThankYou) return;

    let src = "";
    let svc = "";
    let ts = 0;

    try {
      src = sessionStorage.getItem("kmc_last_source") || "";
      svc = sessionStorage.getItem("kmc_last_service") || "";
      ts = Number(sessionStorage.getItem("kmc_last_ts") || "0");
    } catch {}

    src = src || getParam("source") || "unknown";
    svc = svc || safeLower(getParam("project_type")) || safeLower(getParam("service")) || "unknown";

    const ageMs = ts ? Date.now() - ts : Infinity;
    const recentEnough = ageMs >= 0 && ageMs < 10 * 60 * 1000; // 10 minutes

    if (recentEnough) {
      track("inquiry_thank_you_view", { source: src, service: svc });
      try {
        sessionStorage.removeItem("kmc_last_source");
        sessionStorage.removeItem("kmc_last_service");
        sessionStorage.removeItem("kmc_last_ts");
      } catch {}
    } else {
      track("thank_you_view", { source: src, service: svc });
    }
  })();

  /* =========================================================
     LIGHTBOX (click-to-zoom)
  ========================================================= */
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

      if (lastActiveEl && typeof lastActiveEl.focus === "function") lastActiveEl.focus();
      lastActiveEl = null;
    };

    document.addEventListener("click", (e) => {
      const img = e.target.closest("img[data-lightbox]");
      if (!img) return;
      if (e.target.closest("a")) return; // don't hijack linked images
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
