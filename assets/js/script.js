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
     ABOUT SPLIT ROTATOR
  ========================================================= */
  (function () {
    const section = document.querySelector(".about-split");
    if (!section) return;

    const imgEl = section.querySelector(".about-split__img");
    const capEl = section.querySelector(".about-split__caption");
    const dotsWrap = section.querySelector(".about-split__dots");
    const btnPrev = section.querySelector("[data-prev]");
    const btnNext = section.querySelector("[data-next]");
    if (!imgEl || !capEl || !dotsWrap) return;

    const slides = [
      {
        src: "images/tattoopic.png",
        caption:
          "That one time that I was a tattoo apprentice. Just another way I found to be creative.",
      },
      {
        src: "images/tree.png",
        caption:
          "I love nature! One of my favorite places to be. It brings you to life in ways that nothing else does.",
      },
      { src: "images/girlandhercat.png", caption: "Just a girl and her cat." },
      {
        src: "images/nepal.png",
        caption:
          "I loved in Nepal for over a year - still one of my favorite places on earth - I call it home.",
      },
      { src: "images/create.png", caption: "I don't think I can ever be serious." },
      {
        src: "images/us5.png",
        caption:
          "The love of my life. We started out best friends and fell in love. The best love story I have ever known has been her. She is my favorite, my home, and my forever.",
      },
      {
        src: "images/furbabies.png",
        caption:
          "The fur babies. Charlie and Luna Binx - changed our lives in all the best ways! They are feisty, goofy, and know how to get their way! They are currently waiting for their treats LOL!",
      },
    ];

    let i = 0;
    let timer = null;

    function renderDots() {
      dotsWrap.innerHTML = "";
      slides.forEach((_, idx) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "about-split__dot" + (idx === i ? " is-active" : "");
        b.setAttribute("aria-label", `Show photo ${idx + 1}`);
        b.addEventListener("click", () => go(idx, true));
        dotsWrap.appendChild(b);
      });
    }

    function go(nextIndex, userAction = false) {
      i = (nextIndex + slides.length) % slides.length;
      imgEl.style.opacity = "0";
      setTimeout(() => {
        imgEl.src = slides[i].src;
        capEl.textContent = slides[i].caption;
        imgEl.style.opacity = "1";
        renderDots();
      }, 160);

      if (userAction) restart();
    }

    function restart() {
      if (timer) clearInterval(timer);
      timer = setInterval(() => go(i + 1), 6500);
    }

    btnPrev?.addEventListener("click", () => go(i - 1, true));
    btnNext?.addEventListener("click", () => go(i + 1, true));

    imgEl.style.transition = "opacity 200ms ease";
    go(0);
    restart();
  })();

  /* =========================================================
     SOURCE LABEL (attribution)
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

      const file = href.split("?")[0].split("#")[0].split("/").pop().toLowerCase();
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

      const textFallback = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80);

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
  ========================================================= */
  (() => {
    const toggle = qs("[data-nav-toggle]");
    const nav = qs("[data-nav]");
    if (!toggle || !nav) return;

    const setOpen = (open) => {
      toggle.classList.toggle("is-open", open);
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    };

    toggle.addEventListener("click", () => {
      const isOpen = toggle.classList.contains("is-open");
      setOpen(!isOpen);
    });

    nav.addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (!link) return;
      if (window.matchMedia("(max-width: 900px)").matches) setOpen(false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });

    window.addEventListener("resize", () => {
      if (window.matchMedia("(min-width: 901px)").matches) setOpen(false);
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
     CONTACT: PROJECT TYPE RESOLUTION (URL → dropdown)
  ========================================================= */
  const resolveDesiredProjectType = () => {
    const projectTypeRaw = safeLower(getParam("project_type"));
    const serviceRaw = safeLower(getParam("service")); // legacy
    const typeRaw = safeLower(getParam("type")); // legacy
    const tierRaw = safeLower(getParam("tier")); // optional helper

    const tierToProjectType = {
      foundation: "foundation-website",
      growth: "growth-website",
      strategic: "strategy",
    };
    if (tierRaw && tierToProjectType[tierRaw]) return tierToProjectType[tierRaw];

    const allowed = new Set([
      "foundation-website",
      "growth-website",
      "strategy",
      "product",
      "funnel",
      "brand-identity",
      "brand-only",
      "brand-web-prep",
      "photography",
      "wellness_essentials",
      "wellness_growth",
      "not_sure",
    ]);

    if (projectTypeRaw && allowed.has(projectTypeRaw)) return projectTypeRaw;

    const legacyMap = {
      website: "foundation-website",
      standard: "foundation-website",
      clarity_call: "not_sure",
      "clarity-call": "not_sure",
      strategy: "strategy",
      product: "product",
      funnel: "funnel",
      brand: "brand-identity",
      brand_identity: "brand-identity",
      "brand-identity": "brand-identity",
      "brand-only": "brand-only",
      brand_only: "brand-only",
      "brand-web-prep": "brand-web-prep",
      brand_web_prep: "brand-web-prep",
      photography: "photography",
      wellness_essentials: "wellness_essentials",
      wellness_growth: "wellness_growth",
    };

    if (serviceRaw && legacyMap[serviceRaw]) return legacyMap[serviceRaw];
    if (typeRaw && legacyMap[typeRaw]) return legacyMap[typeRaw];

    return "";
  };

  /* =========================================================
     CONTACT: PREFILL SELECT + PREFILL NOTE + HERO SWAP
     FIX: never target ".page-hero p" (it hits the kicker)
     - Targets #contactHeroText if present
     - If missing, creates it under the H1
  ========================================================= */
  (() => {
    const form = qs("#contactForm");
    if (!form) return;

    const select = qs("#project_type", form) || qs("select[name='project_type']", form);
    if (!select || select.tagName !== "SELECT") return;

    const desired = resolveDesiredProjectType();
    if (desired) {
      const opt = Array.from(select.options).find((o) => safeLower(o.value) === desired);
      if (opt) {
        select.value = opt.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    const note = qs("#prefillNote");
    if (note) note.hidden = !safeLower(select.value);

    const hero = qs(".page-hero");
    const heroH1 = hero ? qs("h1", hero) : null;

    // Prefer explicit hero text element
    let heroText = qs("#contactHeroText");

    // If it doesn't exist, create it right under the H1 (contact page only)
    if (!heroText && hero && heroH1) {
      heroText = document.createElement("p");
      heroText.id = "contactHeroText";
      heroText.className = "hero-subcopy"; // harmless if you don't style it
      heroH1.insertAdjacentElement("afterend", heroText);
    }

    const updateHero = () => {
      const v = safeLower(select.value);

      if (!heroH1 || !heroText) return;

      if (v === "photography") {
        heroH1.textContent = "Ask About Local Brand Photography";
        heroText.textContent =
          "Share a few details about your space and what you need images for. I’ll confirm fit, availability, and next steps.";
        return;
      }

      if (v === "brand-identity" || v === "brand-only" || v === "brand-web-prep") {
        heroH1.textContent = "Start a Branding Project";
        heroText.textContent =
          "Share a few details about your brand and what you need. I’ll review, confirm fit, and follow up with next steps.";
        return;
      }

      heroH1.textContent = "Start a Website Project";
      heroText.textContent =
        "Share a few details about what you’re building. I’ll review your goals, confirm fit, and follow up with next steps or a quote.";
    };

    updateHero();

    select.addEventListener("change", () => {
      if (note) note.hidden = !safeLower(select.value);
      updateHero();
    });
  })();

  /* =========================================================
     CONTACT: PREFILL HIDDEN FIELDS (source/source_page/referrer/tier)
  ========================================================= */
  (() => {
    const form = qs("#contactForm");
    if (!form) return;

    const sourceInput = qs("#source", form);
    const sourcePageInput = qs("#source_page", form);
    const referrerInput = qs("#referrer", form);
    const tierInput = qs("#tier", form);

    if (sourceInput) sourceInput.value = sourceLabel;
    if (sourcePageInput) sourcePageInput.value = window.location.href;
    if (referrerInput) referrerInput.value = document.referrer || "";

    const tierRaw = safeLower(getParam("tier"));
    const allowed = new Set(["foundation", "growth", "strategic"]);
    if (tierInput && tierRaw && allowed.has(tierRaw)) tierInput.value = tierRaw;
  })();

  /* =========================================================
     CONTACT: SHOW SELECTED TIER NOTE
  ========================================================= */
  (() => {
    const note = qs("#selectionNote");
    const text = qs("#selectionText");
    if (!note || !text) return;

    const tier = safeLower(getParam("tier"));
    if (!tier) return;

    const labelMap = {
      foundation: "Foundation Website",
      growth: "Growth Website",
      strategic: "Premium Website",
    };

    const label = labelMap[tier];
    if (!label) return;

    text.textContent = label;
    note.hidden = false;
  })();

  /* =========================================================
     CONTACT: CONDITIONAL SECTIONS (data-show-for)
  ========================================================= */
  (() => {
    const form = qs("#contactForm");
    if (!form) return;

    const select = qs("#project_type", form);
    if (!select) return;

    const sections = qsa(".form-conditional[data-show-for]", form);

    const setEnabled = (section, enabled) => {
      section.hidden = !enabled;
      qsa("input, select, textarea, button", section).forEach((el) => {
        el.disabled = !enabled;
      });
    };

    const apply = () => {
      const current = safeLower(select.value);

      sections.forEach((section) => {
        const allowed = (section.getAttribute("data-show-for") || "")
          .split(/\s+/)
          .map(safeLower)
          .filter(Boolean);

        const show = current && allowed.includes(current);
        setEnabled(section, !!show);
      });

      const focus = qs("#strategy_focus", form);
      if (focus) focus.required = current === "strategy";
    };

    apply();
    select.addEventListener("change", apply);
  })();

  /* =========================================================
     CONTACT: SUBMIT HANDLING + ATTRIBUTION (Formspree + GA events)
  ========================================================= */
  (() => {
    const form = qs("#contactForm");
    if (!form) return;

    const projectType = qs("#project_type", form);

    const getServiceHint = () =>
      resolveDesiredProjectType() || safeLower(projectType && projectType.value) || "unknown";

    track("contact_form_view", { source: sourceLabel, service: getServiceHint() });

    let started = false;
    const markStarted = () => {
      if (started) return;
      started = true;
      track("contact_form_start", { source: sourceLabel, service: getServiceHint() });
    };

    form.addEventListener("focusin", (e) => {
      if (e.target && e.target.matches("input, select, textarea")) markStarted();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

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
      const interest = qsa("input[name='interest_areas']:checked", form).map((cb) => cb.value);
      const tierVal = ((qs("#tier", form) || {}).value || "").trim();

      track("contact_form_submit_attempt", {
        source: sourceLabel,
        service: serviceHint,
        tier: tierVal || undefined,
        interest_count: interest.length,
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
            tier: tierVal || undefined,
            interest_count: interest.length,
          });

          try {
            sessionStorage.setItem("kmc_last_source", sourceLabel);
            sessionStorage.setItem("kmc_last_service", serviceHint);
            sessionStorage.setItem("kmc_last_tier", tierVal || "");
            sessionStorage.setItem("kmc_last_ts", String(Date.now()));
          } catch {}

          const thankYouUrl =
            `/thank-you.html?source=${encodeURIComponent(sourceLabel)}` +
            `&project_type=${encodeURIComponent(serviceHint)}` +
            (tierVal ? `&tier=${encodeURIComponent(tierVal)}` : "");

          window.location.assign(thankYouUrl);
        } else {
          track("contact_form_submit_error", {
            source: sourceLabel,
            service: serviceHint,
            tier: tierVal || undefined,
            status: res.status || 0,
          });
          alert("Something went wrong. Please check your entries and try again.");
        }
      } catch {
        track("contact_form_submit_error", {
          source: sourceLabel,
          service: serviceHint,
          tier: tierVal || undefined,
          status: "network_error",
        });
        alert("Network error. Please try again.");
      }
    });
  })();

  /* =========================================================
     Brand Process Tabs (accessible)
  ========================================================= */
  (function initBrandProcessTabs() {
    const root = document.querySelector("[data-bp]");
    if (!root) return;

    const tabs = Array.from(root.querySelectorAll("[data-bp-tab]"));
    const panels = tabs
      .map((t) => document.getElementById(`bp-panel-${t.dataset.bpTab}`))
      .filter(Boolean);

    function activate(idx, focusTab = false) {
      tabs.forEach((tab, i) => {
        const selected = i === idx;
        tab.setAttribute("aria-selected", selected ? "true" : "false");
        tab.tabIndex = selected ? 0 : -1;
      });

      panels.forEach((panel, i) => {
        if (!panel) return;
        if (i === idx) panel.removeAttribute("hidden");
        else panel.setAttribute("hidden", "");
      });

      if (focusTab) tabs[idx]?.focus();
    }

    tabs.forEach((tab, idx) => {
      tab.addEventListener("click", () => activate(idx));

      tab.addEventListener("keydown", (e) => {
        const key = e.key;
        if (key !== "ArrowLeft" && key !== "ArrowRight" && key !== "Home" && key !== "End")
          return;

        e.preventDefault();

        let next = idx;
        if (key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
        if (key === "ArrowRight") next = (idx + 1) % tabs.length;
        if (key === "Home") next = 0;
        if (key === "End") next = tabs.length - 1;

        activate(next, true);
      });
    });

    activate(0);
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
     ALIVE MOTION (Hero parallax + reveal on scroll)
  ========================================================= */
  const prefersReduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  (function heroParallax() {
    if (prefersReduced) return;
    const hero = qs(".hero");
    if (!hero) return;

    const onScroll = () => {
      const y = window.scrollY || 0;
      const shift = Math.min(26, y * 0.08);
      const tilt = Math.max(-1.2, Math.min(1.2, (y - 120) * 0.002));
      const opacity = Math.max(0.72, 1 - y * 0.0008);

      document.documentElement.style.setProperty("--hero-shift", `${shift}px`);
      document.documentElement.style.setProperty("--hero-tilt", `${tilt}deg`);
      document.documentElement.style.setProperty("--hero-opacity", `${opacity}`);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  })();

  (function addRevealClasses() {
    const candidates = qsa(
      ".section-header, .hero-text, .proof-item, .package-card, .service-block, .featured-item, .testimonial-card, .faq-item, .case-card, .legal-card"
    );
    candidates.forEach((el, i) => {
      if (el.classList.contains("reveal")) return;
      el.classList.add("reveal");
      if (i % 2 === 0) el.classList.add("reveal--soft");
    });

    qsa(".hero-text.reveal").forEach((el) => el.classList.add("is-inview"));
  })();

  (function revealOnScroll() {
    const items = qsa(".reveal:not(.is-inview)");
    if (!items.length) return;

    if (prefersReduced || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-inview"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-inview");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -10% 0px" }
    );

    items.forEach((el) => io.observe(el));
  })();
});
