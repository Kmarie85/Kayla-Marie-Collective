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
          ...params
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
  ========================================================= */
  (() => {
    const path = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
    const nav = qs("[data-nav]");
    if (!nav) return;

    qsa("a[href]", nav).forEach((a) => {
      const href = (a.getAttribute("href") || "").trim();
      if (!href || href.startsWith("http") || href.startsWith("#")) return;

      const file = href
        .split("?")[0]
        .split("#")[0]
        .split("/")
        .pop()
        .toLowerCase();

      const isMatch = file === path;

      a.classList.toggle("active", isMatch);
      if (isMatch) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  })();

  /* =========================================================
     GA CLICK TRACKING (global)
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
        href &&
        /^https?:\/\//i.test(href) &&
        !href.includes(window.location.hostname);

      track(eventName, {
        label,
        outbound: !!isOutbound,
        link_url: isOutbound ? href : undefined,
        source: sourceLabel
      });
    });
  })();

  /* =========================================================
     MOBILE NAV TOGGLE (global)
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
      if (window.matchMedia("(min-width: 900px)").matches) setOpen(false);
    });
  })();

  /* =========================================================
     SERVICES: ADD-ON ACCORDION TRACKING
  ========================================================= */
  (() => {
    const hasAddons = qs("details.addon");
    if (!hasAddons) return;

    qsa("details.addon").forEach((d) => {
      d.addEventListener("toggle", () => {
        if (!d.open) return;

        const summary = d.querySelector("summary");
        const label = (summary && summary.textContent ? summary.textContent : "addon_open")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 80);

        track("addon_open", { label, source: sourceLabel });
      });
    });
  })();

  /* =========================================================
     CONTACT: PREFILL SELECT
  ========================================================= */
  const resolveDesiredProjectType = () => {
    const projectTypeRaw = safeLower(getParam("project_type"));
    const serviceRaw = safeLower(getParam("service"));
    const typeRaw = safeLower(getParam("type"));

    const allowed = new Set([
      "clarity_call",
      "website",
      "product",
      "funnel",
      "photography",
      "strategy",
      "wellness_essentials",
      "wellness_growth"
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

    const select =
      qs("#project_type", form) || qs("select[name='project_type']", form);
    if (!select || select.tagName !== "SELECT") return;

    const desired = resolveDesiredProjectType();
    if (!desired) return;

    const opt = Array.from(select.options).find((o) => safeLower(o.value) === desired);
    if (!opt) return;

    select.value = opt.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));

    // Optional: if clarity call, prefill details
    if (desired === "clarity_call") {
      const details = qs("textarea[name='project_details']", form);
      if (details && !details.value.trim()) {
        details.value =
          "I’d like to book a free 15-minute clarity call to talk through my project and next steps.";
      }
    }
  })();

  /* =========================================================
     CONTACT: PREFILL TIER (hidden input)
     Reads ?tier=foundation|growth|strategic and submits with the form
  ========================================================= */
  (() => {
    const form = qs("#contactForm");
    if (!form) return;

    const tierInput = qs("#tier", form);
    if (!tierInput) return;

    const tierRaw = safeLower(getParam("tier"));
    const allowed = new Set(["foundation", "growth", "strategic"]);
    if (!tierRaw || !allowed.has(tierRaw)) return;

    tierInput.value = tierRaw;
  })();

  /* =========================================================
     CONTACT: show selected tier note (from quiz)
  ========================================================= */
  (() => {
    const form = qs("#contactForm");
    if (!form) return;

    const note = qs("#selectionNote");
    const text = qs("#selectionText");
    if (!note || !text) return;

    const tier = safeLower(getParam("tier")) || safeLower((qs("#tier", form) || {}).value);

    if (!tier) return;

    const labelMap = {
      foundation: "Foundation Website",
      growth: "Growth Website",
      strategic: "Premium Website"
    };

    const label = labelMap[tier];
    if (!label) return;

    text.textContent = label;
    note.hidden = false;
  })();

  /* =========================================================
     CONTACT: STRATEGY FOLLOW-UP TOGGLE
  ========================================================= */
  (() => {
    const form = qs("#contactForm");
    if (!form) return;

    const projectType =
      qs("#project_type", form) || qs("select[name='project_type']", form);
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
     CONTACT: ADD-ONS gating
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

      fieldset.hidden = false;

      checks.forEach((cb) => {
        const row = cb.closest("label");
        if (row) row.hidden = false;
        cb.disabled = false;
      });

      if (!t) {
        checks.forEach((cb) => {
          cb.checked = false;
          cb.disabled = true;
        });
        return;
      }

      // Optional: keep add-ons disabled for clarity calls (cleaner UX)
      if (t === "clarity_call") {
        checks.forEach((cb) => {
          cb.checked = false;
          cb.disabled = true;
        });
        return;
      }

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
     CONTACT: submit handling + attribution
  ========================================================= */
  (() => {
    const form = qs("#contactForm");
    if (!form) return;

    const projectType = qs("#project_type", form);

    const getServiceHint = () =>
      resolveDesiredProjectType() ||
      safeLower(projectType && projectType.value) ||
      "unknown";

    const sourceInput = qs("#source", form);
    const sourcePageInput = qs("#source_page", form);
    const referrerInput = qs("#referrer", form);

    if (sourceInput) sourceInput.value = sourceLabel;
    if (sourcePageInput) sourcePageInput.value = window.location.href;
    if (referrerInput) referrerInput.value = document.referrer || "";

    track("contact_form_view", {
      source: sourceLabel,
      service: getServiceHint()
    });

    let started = false;
    const markStarted = () => {
      if (started) return;
      started = true;
      track("contact_form_start", {
        source: sourceLabel,
        service: getServiceHint()
      });
    };

    form.addEventListener("focusin", (e) => {
      if (e.target && e.target.matches("input, select, textarea")) markStarted();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Browser-native validation (required fields, email format, etc.)
      if (!form.checkValidity()) {
        form.reportValidity();
        track("contact_form_invalid", { source: sourceLabel, service: getServiceHint() });
        return;
      }

      if (!form.action) {
        alert("Form action is missing. Please set your form endpoint and try again.");
        return;
      }

      const serviceHint = getServiceHint();
      const addons = qsa("input[name='addons']:checked", form).map((cb) => cb.value);

      const tierVal = ((qs("#tier", form) || {}).value || "").trim();

      track("contact_form_submit_attempt", {
        source: sourceLabel,
        service: serviceHint,
        tier: tierVal || undefined,
        addons_count: addons.length
      });

      const formData = new FormData(form);

      try {
        const res = await fetch(form.action, {
          method: "POST",
          body: formData,
          headers: { Accept: "application/json" }
        });

        if (res.ok) {
          track("contact_form_submit_success", {
            source: sourceLabel,
            service: serviceHint,
            tier: tierVal || undefined,
            addons_count: addons.length
          });

          try {
            sessionStorage.setItem("kmc_last_source", sourceLabel);
            sessionStorage.setItem("kmc_last_service", serviceHint);
            sessionStorage.setItem("kmc_last_tier", tierVal || "");
            sessionStorage.setItem("kmc_last_ts", String(Date.now()));
          } catch {
            // ignore storage errors
          }

          const thankYouUrl =
            `thank-you.html?source=${encodeURIComponent(sourceLabel)}` +
            `&project_type=${encodeURIComponent(serviceHint)}` +
            (tierVal ? `&tier=${encodeURIComponent(tierVal)}` : "");

          window.location.assign(thankYouUrl);
        } else {
          track("contact_form_submit_error", {
            source: sourceLabel,
            service: serviceHint,
            tier: tierVal || undefined,
            status: res.status || 0
          });
          alert("Something went wrong. Please check your entries and try again.");
        }
      } catch {
        track("contact_form_submit_error", {
          source: sourceLabel,
          service: serviceHint,
          tier: tierVal || undefined,
          status: "network_error"
        });
        alert("Network error. Please try again.");
      }
    });
  })();

  /* =========================================================
     THANK-YOU PAGE conversion event
  ========================================================= */
  (() => {
    const isThankYou =
      /\/thank-you\.html(\?|#|$)/i.test(window.location.pathname) ||
      /thank-you\.html(\?|#|$)/i.test(window.location.href);

    if (!isThankYou) return;

    let src = "";
    let svc = "";
    let tier = "";
    let ts = 0;

    try {
      src = sessionStorage.getItem("kmc_last_source") || "";
      svc = sessionStorage.getItem("kmc_last_service") || "";
      tier = sessionStorage.getItem("kmc_last_tier") || "";
      ts = Number(sessionStorage.getItem("kmc_last_ts") || "0");
    } catch {
      // ignore
    }

    src = src || getParam("source") || "unknown";
    svc =
      svc ||
      safeLower(getParam("project_type")) ||
      safeLower(getParam("service")) ||
      "unknown";

    tier = tier || safeLower(getParam("tier")) || "";

    const ageMs = ts ? Date.now() - ts : Infinity;
    const recentEnough = ageMs >= 0 && ageMs < 10 * 60 * 1000;

    // Populate thank-you details (optional UI)
    const detailWrap = qs("#thankYouDetails");
    if (detailWrap) {
      const svcMap = {
        clarity_call: "Free 15-Minute Clarity Call",
        website: "Website Build",
        product: "Digital Product Page",
        funnel: "Bundle + Funnel Setup",
        photography: "Photography",
        strategy: "Strategy-Led Build",
        wellness_essentials: "Wellness Essentials",
        wellness_growth: "Wellness Growth"
      };

      const tierMap = {
        foundation: "Foundation Website",
        growth: "Growth Website",
        strategic: "Premium Website"
      };

      const svcText = svcMap[svc] || (svc ? svc : "Project inquiry");
      const tierText = tierMap[tier] || (tier ? tier : "");

      const svcEl = qs("#tyService");
      const tierEl = qs("#tyTier");

      if (svcEl) svcEl.textContent = svcText;
      if (tierEl) tierEl.textContent = tierText || "—";

      detailWrap.hidden = false;
    }

    if (recentEnough) {
      track("inquiry_thank_you_view", {
        source: src,
        service: svc,
        tier: tier || undefined
      });
      try {
        sessionStorage.removeItem("kmc_last_source");
        sessionStorage.removeItem("kmc_last_service");
        sessionStorage.removeItem("kmc_last_tier");
        sessionStorage.removeItem("kmc_last_ts");
      } catch {
        // ignore
      }
    } else {
      track("thank_you_view", {
        source: src,
        service: svc,
        tier: tier || undefined
      });
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

  /* =========================================================
     KMC — Motion: hero scroll response + reveal-on-scroll
  ========================================================= */
  (() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hero = qs(".hero");

    // ---- Hero scroll response (desktop stronger, mobile softer) ----
    if (hero && !reduceMotion.matches) {
      let ticking = false;
      let scrollTimer = null;

      const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

      const updateHero = () => {
        ticking = false;

        const rect = hero.getBoundingClientRect();
        const vh = window.innerHeight || 800;

        const progress = clamp((0 - rect.top) / (vh * 0.9), 0, 1);
        const isDesktop = window.matchMedia("(min-width: 900px)").matches;

        const shift = Math.round(progress * (isDesktop ? 44 : 18)); // px
        const tilt = (progress * (isDesktop ? 0.35 : 0.18)).toFixed(3); // deg
        const opacity = (1 - progress * 0.12).toFixed(3);

        document.documentElement.style.setProperty("--hero-shift", `${shift}px`);
        document.documentElement.style.setProperty("--hero-tilt", `${tilt}deg`);
        document.documentElement.style.setProperty("--hero-opacity", `${opacity}`);
      };

      const requestTick = () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(updateHero);
        }
      };

      const markScrolling = () => {
        hero.classList.add("is-scrolling");
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => hero.classList.remove("is-scrolling"), 140);
      };

      updateHero();
      window.addEventListener(
        "scroll",
        () => {
          requestTick();
          markScrolling();
        },
        { passive: true }
      );

      window.addEventListener("resize", requestTick);
    }

    // ---- Reveal on scroll ----
    const addReveal = (selector, soft = false) => {
      qsa(selector).forEach((el) => {
        el.classList.add("reveal");
        if (soft) el.classList.add("reveal--soft");
      });
    };

    addReveal(".proof-item", true);
    addReveal(".bullet-grid li", true);
    addReveal(".featured-item");
    addReveal(".mid-cta-inner");
    addReveal(".package-card");
    addReveal(".faq-item");
    addReveal(".final-cta .container");

    if (reduceMotion.matches) {
      qsa(".reveal").forEach((el) => el.classList.add("is-inview"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-inview");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
    );

    qsa(".reveal").forEach((el) => io.observe(el));

    if (reduceMotion.addEventListener) {
      reduceMotion.addEventListener("change", (e) => {
        if (e.matches) {
          qsa(".reveal").forEach((el) => el.classList.add("is-inview"));
          document.documentElement.style.setProperty("--hero-shift", "0px");
          document.documentElement.style.setProperty("--hero-tilt", "0deg");
          document.documentElement.style.setProperty("--hero-opacity", "1");
        }
      });
    }
  })();
});
