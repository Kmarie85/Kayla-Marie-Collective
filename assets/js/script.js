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
     SOURCE LABEL
  ========================================================= */
  const sourceLabel =
    getParam("source") ||
    (getParam("type") ? `type_${safeLower(getParam("type"))}` : "") ||
    "direct";

  /* =========================================================
     FOOTER YEAR
  ========================================================= */
  (() => {
    const yearEl = qs("#year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  })();

  /* =========================================================
     NAV ACTIVE STATES
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
     GA CLICK TRACKING
  ========================================================= */
  (() => {
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-track]");
      if (!el) return;

      const eventName = (el.getAttribute("data-track") || "click").trim();
      const explicitLabel = (el.getAttribute("data-label") || "").trim();
      const textFallback = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80);
      const href = (el.getAttribute("href") || "").trim();

      const label =
        explicitLabel || textFallback || (href ? `href:${href}` : "") || "unknown";

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
     MOBILE NAV TOGGLE
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
     PHOTO STRIP — SEAMLESS MARQUEE
  ========================================================= */
  (function photoStripMarqueeSeamless() {
    const strips = document.querySelectorAll(".photo-strip");
    if (!strips.length) return;

    const prefersReduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const pxPerSecond = 55;

    const waitImages = (root) => {
      const imgs = Array.from(root.querySelectorAll("img"));
      if (!imgs.length) return Promise.resolve();
      return Promise.all(
        imgs.map(
          (img) =>
            new Promise((res) => {
              if (img.complete) return res();
              img.addEventListener("load", res, { once: true });
              img.addEventListener("error", res, { once: true });
            })
        )
      );
    };

    const rebuild = async (strip) => {
      const trackEl = strip.querySelector(".photo-strip__track");
      if (!trackEl) return;

      const sets = Array.from(trackEl.querySelectorAll(".photo-strip__set"));
      if (!sets.length) return;

      const setA = sets[0];

      if (prefersReduced) {
        sets.slice(1).forEach((n) => n.remove());
        trackEl.style.animation = "none";
        trackEl.style.transform = "none";
        trackEl.style.removeProperty("--marquee-distance");
        trackEl.style.removeProperty("--marquee-duration");
        return;
      }

      sets.slice(1).forEach((n) => n.remove());
      await waitImages(setA);

      requestAnimationFrame(() => {
        const stripW = strip.clientWidth || 0;
        const setW = Math.round(setA.getBoundingClientRect().width);

        if (!setW || setW < 10) return;

        const minTrackW = stripW + setW;
        let trackW = setW;
        let clones = 0;

        while (trackW < minTrackW && clones < 12) {
          const clone = setA.cloneNode(true);
          trackEl.appendChild(clone);
          clones += 1;
          trackW += setW;
        }

        if (trackEl.querySelectorAll(".photo-strip__set").length < 2) {
          trackEl.appendChild(setA.cloneNode(true));
        }

        trackEl.style.setProperty("--marquee-distance", `${setW}px`);
        const duration = Math.max(12, Math.round(setW / pxPerSecond));
        trackEl.style.setProperty("--marquee-duration", `${duration}s`);
      });
    };

    strips.forEach(rebuild);

    let t;
    window.addEventListener("resize", () => {
      clearTimeout(t);
      t = setTimeout(() => strips.forEach(rebuild), 150);
    });

    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(() => {
        clearTimeout(t);
        t = setTimeout(() => strips.forEach(rebuild), 80);
      });
      strips.forEach((s) => ro.observe(s));
    }
  })();

  /* =========================================================
     LIGHTBOX
  ========================================================= */
  (function initLightbox() {
    const lb = qs("#lightbox");
    const lbImg = qs("#lightboxImg");
    if (!lb || !lbImg) return;

    let lastActiveEl = null;

    const openWith = (src, alt = "Preview image") => {
      if (!src) return;

      lastActiveEl = document.activeElement;
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

    document.addEventListener(
      "pointerdown",
      (e) => {
        const btn = e.target.closest(".photo-strip__btn[data-lightbox-src]");
        if (btn) {
          e.preventDefault();
          const src = (btn.getAttribute("data-lightbox-src") || "").trim();
          const img = btn.querySelector("img");
          const alt =
            (img && img.getAttribute("alt")) ||
            btn.getAttribute("aria-label") ||
            "Preview image";
          openWith(src, alt);
          return;
        }

        if (e.target.closest("[data-lightbox-close]")) {
          e.preventDefault();
          close();
          return;
        }

        if (e.target.classList && e.target.classList.contains("lightbox-backdrop")) {
          e.preventDefault();
          close();
        }
      },
      { passive: false }
    );

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && lb.classList.contains("is-open")) close();
    });
  })();

  /* =========================================================
     ABOUT SPLIT ROTATOR
  ========================================================= */
  (function initAboutSplitRotator() {
    const section = qs(".about-split");
    if (!section) return;

    const imgEl = qs(".about-split__img", section);
    const capEl = qs(".about-split__caption", section);
    const dotsWrap = qs(".about-split__dots", section);
    const btnPrev = qs("[data-prev]", section);
    const btnNext = qs("[data-next]", section);
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
          "I lived in Nepal for over a year — still one of my favorite places on earth — I call it home.",
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
          "The fur babies. Charlie and Luna Binx — changed our lives in all the best ways! They are feisty, goofy, and know how to get their way! They are currently waiting for their treats LOL!",
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
     PACKAGE QUIZ
     Supports the updated offer structure:
     - Website Reset
     - Custom Website Build
     - Premium Website Build
  ========================================================= */
  (() => {
    const form = qs("#packageQuiz");
    if (!form) return;

    const result = qs("#quizResult");
    const title = qs("#resultTitle");
    const summary = qs("#resultSummary");
    const details = qs("#resultDetails");
    const cta = qs("#resultCta");
    const note = qs("#resultNote");

    if (!result || !title || !summary || !cta) return;

    result.hidden = true;
    if ("hidden" in cta) cta.hidden = true;

    const requiredSelects = Array.from(form.querySelectorAll("select[required]"));
    const totalSteps = requiredSelects.length || 5;

    const makeProgress = () => {
      const wrap = document.createElement("div");
      wrap.className = "quiz-progress";
      wrap.setAttribute("role", "status");
      wrap.setAttribute("aria-live", "polite");
      wrap.style.marginTop = "0.75rem";

      const dots = document.createElement("div");
      dots.className = "quiz-progress__dots";
      dots.style.display = "flex";
      dots.style.gap = "8px";
      dots.style.alignItems = "center";

      const label = document.createElement("div");
      label.className = "quiz-progress__label small-note";
      label.style.marginTop = "0.5rem";
      label.style.opacity = "0.9";

      const dotEls = [];
      for (let i = 0; i < totalSteps; i++) {
        const d = document.createElement("span");
        d.className = "quiz-progress__dot";
        d.style.width = "7px";
        d.style.height = "7px";
        d.style.borderRadius = "999px";
        d.style.border = "1px solid currentColor";
        d.style.opacity = "0.35";
        dotEls.push(d);
        dots.appendChild(d);
      }

      wrap.appendChild(dots);
      wrap.appendChild(label);
      return { wrap, dotEls, label };
    };

    const progress = makeProgress();
    const firstNote = form.querySelector(".form-note");
    if (firstNote) firstNote.insertAdjacentElement("afterend", progress.wrap);
    else form.insertAdjacentElement("afterbegin", progress.wrap);

    const countAnswered = () =>
      requiredSelects.reduce((acc, s) => acc + ((s.value || "").trim() ? 1 : 0), 0);

    const updateProgress = () => {
      const answered = countAnswered();
      progress.dotEls.forEach((d, idx) => {
        const on = idx < answered;
        d.style.opacity = on ? "0.95" : "0.35";
        d.style.background = on ? "currentColor" : "transparent";
      });
      progress.label.textContent = `${answered}/${totalSteps} answered`;
    };

    requiredSelects.forEach((s) => s.addEventListener("change", updateProgress));
    updateProgress();

    const makeCard = (heading, price, items) => {
      const el = document.createElement("details");
      el.className = "addon";
      el.open = true;
      el.innerHTML = `
        <summary>
          ${heading}
          <span class="addon-price">${price}</span>
        </summary>
        <div class="addon-body">
          <ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>
        </div>
      `;
      return el;
    };

    const makeWhy = (items) => {
      const el = document.createElement("details");
      el.className = "addon";
      el.open = true;
      el.innerHTML = `
        <summary>Why this recommendation</summary>
        <div class="addon-body">
          <ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>
        </div>
      `;
      return el;
    };

    let resetBtn = null;

    const ensureResetBtn = () => {
      if (resetBtn) return resetBtn;

      resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.className = "btn-secondary";
      resetBtn.textContent = "Reset quiz";
      resetBtn.style.marginLeft = "0.75rem";
      resetBtn.style.marginTop = "0.5rem";

      resetBtn.addEventListener("click", () => {
        form.reset();
        updateProgress();

        if (details) details.innerHTML = "";
        result.hidden = true;
        if ("hidden" in cta) cta.hidden = true;
        if (note) note.textContent = "";

        title.textContent = "Your recommendation";
        summary.innerHTML =
          "Answer the questions above and click <strong>Get my recommendation</strong>. Your result will appear here with a direct link to continue.";

        const firstSel = requiredSelects[0];
        if (firstSel) firstSel.focus();

        track("package_quiz_reset", { source: sourceLabel });
      });

      return resetBtn;
    };

    const mountResetBtn = () => {
      const btn = ensureResetBtn();
      const ctaWrap = cta.closest(".text-link") || cta.parentElement;
      if (ctaWrap && !ctaWrap.contains(btn)) ctaWrap.appendChild(btn);
    };

    const isElementInView = (el, pad = 16) => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      return r.top >= pad && r.bottom <= vh - pad;
    };

    const maybeScrollToResult = () => {
      const r = result.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const belowFold = r.top > vh - 24;

      if (belowFold && !isElementInView(result)) {
        result.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    const render = (tier) => {
      if (details) details.innerHTML = "";

      if (tier === "website-reset") {
        title.textContent = "Recommendation: Website Reset";
        summary.textContent =
          "Based on your answers, a Website Reset looks like the best fit. This is the right choice when you already have a site, but it feels unclear, outdated, or not fully aligned with your business anymore.";

        if (details) {
          details.appendChild(
            makeCard("Website Reset", "Starting at $1,400", [
              "Refinement of an existing website",
              "Clearer structure and stronger page flow",
              "Mobile-friendly updates",
              "Call-to-action cleanup",
              "Foundational SEO improvements",
              "Launch support",
            ])
          );

          details.appendChild(
            makeWhy([
              "You already have a website in place.",
              "Your project sounds more like refinement than a full rebuild from scratch.",
              "You need stronger clarity and structure without overcomplicating the scope.",
            ])
          );
        }

        cta.href =
          "/contact.html?project_type=website-reset&source=package_quiz&tier=website-reset";

        if (note) {
          note.textContent =
            "If the scope grows or your current site is too limited to build from, a Custom Website Build may be the better direction.";
        }
      }

      if (tier === "custom-website-build") {
        title.textContent = "Recommendation: Custom Website Build";
        summary.textContent =
          "Based on your answers, a Custom Website Build is likely the best fit. This is ideal when you need a full site built from the ground up with clear structure, thoughtful design, and conversion in mind.";

        if (details) {
          details.appendChild(
            makeCard("Custom Website Build", "Starting at $1,800", [
              "Custom build from the ground up",
              "Clear page structure and user flow",
              "Mobile-first, conversion-focused layout",
              "Foundational SEO + analytics setup",
              "Inquiry flow support",
              "Launch readiness support",
            ])
          );

          details.appendChild(
            makeWhy([
              "You need more than a simple cleanup.",
              "Your site needs structure, guidance, and a stronger path to action.",
              "Your project calls for a clean custom build without the deeper complexity of a premium scope.",
            ])
          );
        }

        cta.href =
          "/contact.html?project_type=custom-website-build&source=package_quiz&tier=custom-website-build";

        if (note) {
          note.textContent =
            "If your project needs more advanced customization, layered strategy, or custom integrations, a Premium Website Build may be a better fit.";
        }
      }

      if (tier === "premium-website-build") {
        title.textContent = "Recommendation: Premium Website Build";
        summary.textContent =
          "Based on your answers, a Premium Website Build looks like the best fit. This is for projects that need deeper planning, more customization, and a more layered build experience.";

        if (details) {
          details.appendChild(
            makeCard("Premium Website Build", "Starting at $2,200+", [
              "More custom layout and structure",
              "Deeper strategy and planning support",
              "Advanced integrations when needed",
              "Higher-touch project guidance",
              "Post-launch guidance",
              "Priority support",
            ])
          );

          details.appendChild(
            makeWhy([
              "Your project sounds more custom and layered than a standard build.",
              "You want stronger input on strategy, structure, or decision-making.",
              "Your scope likely includes added flexibility, integration needs, or a more tailored experience.",
            ])
          );
        }

        cta.href =
          "/contact.html?project_type=premium-website-build&source=package_quiz&tier=premium-website-build";

        if (note) {
          note.textContent =
            "Final scope is always confirmed before anything is booked so the level of support matches what you actually need.";
        }
      }

      result.hidden = false;
      if ("hidden" in cta) cta.hidden = false;
      mountResetBtn();
      maybeScrollToResult();

      track("package_quiz_result", { label: tier, source: sourceLabel });
    };

    const getQuizResult = () => {
      const qExisting = safeLower(
        form.elements.q_existing?.value || form.elements.q_existing_site?.value || ""
      );
      const qScope = safeLower(
        form.elements.q_scope?.value || form.elements.q_pages?.value || ""
      );
      const qGoal = safeLower(form.elements.q_goal?.value || "");
      const qSupport = safeLower(form.elements.q_support?.value || "");
      const qCustom = safeLower(
        form.elements.q_custom?.value || form.elements.q_tracking?.value || ""
      );

      let premiumPoints = 0;
      let customPoints = 0;
      let resetPoints = 0;

      if (qExisting === "yes") resetPoints += 3;
      if (qExisting === "no") customPoints += 2;

      if (qScope === "simple" || qScope === "1_3") resetPoints += 2;
      if (qScope === "standard" || qScope === "4_6") customPoints += 3;
      if (qScope === "advanced" || qScope === "7_10") premiumPoints += 3;

      if (qGoal === "credibility") resetPoints += 1;
      if (qGoal === "leads") customPoints += 2;
      if (qGoal === "conversion" || qGoal === "revenue") premiumPoints += 2;

      if (qSupport === "light" || qSupport === "hands_off") resetPoints += 1;
      if (qSupport === "guided") customPoints += 2;
      if (qSupport === "high" || qSupport === "strategic") premiumPoints += 3;

      if (qCustom === "no" || qCustom === "basic") resetPoints += 1;
      if (qCustom === "some" || qCustom === "ga4") customPoints += 1;
      if (qCustom === "yes" || qCustom === "events") premiumPoints += 2;

      if (qExisting === "yes" && (qScope === "simple" || qScope === "1_3")) {
        return "website-reset";
      }

      if (premiumPoints >= customPoints && premiumPoints >= resetPoints) {
        return "premium-website-build";
      }

      if (customPoints >= resetPoints) {
        return "custom-website-build";
      }

      return "website-reset";
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        track("package_quiz_invalid", { source: sourceLabel });
        return;
      }

      render(getQuizResult());
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
     CONTACT: PROJECT TYPE RESOLUTION
  ========================================================= */
  const resolveDesiredProjectType = () => {
    const projectTypeRaw = safeLower(getParam("project_type"));
    const serviceRaw = safeLower(getParam("service"));
    const typeRaw = safeLower(getParam("type"));
    const tierRaw = safeLower(getParam("tier"));

    const tierToProjectType = {
      "website-reset": "website-reset",
      "custom-website-build": "custom-website-build",
      "premium-website-build": "premium-website-build",
      foundation: "website-reset",
      growth: "custom-website-build",
      strategic: "premium-website-build",
      premium: "premium-website-build",
    };

    if (tierRaw && tierToProjectType[tierRaw]) return tierToProjectType[tierRaw];

    const allowed = new Set([
      "website-reset",
      "custom-website-build",
      "premium-website-build",
      "product",
      "funnel",
      "brand-only",
      "brand-web-prep",
      "photography",
      "not_sure",
    ]);

    if (projectTypeRaw && allowed.has(projectTypeRaw)) return projectTypeRaw;

    const legacyMap = {
      website: "custom-website-build",
      standard: "custom-website-build",
      clarity_call: "not_sure",
      "clarity-call": "not_sure",
      strategy: "premium-website-build",
      premium: "premium-website-build",
      foundation: "website-reset",
      growth: "custom-website-build",
      strategic: "premium-website-build",
      reset: "website-reset",
      product: "product",
      funnel: "funnel",
      brand: "brand-only",
      brand_identity: "brand-only",
      "brand-identity": "brand-only",
      "brand-only": "brand-only",
      brand_only: "brand-only",
      "brand-web-prep": "brand-web-prep",
      brand_web_prep: "brand-web-prep",
      photography: "photography",
      not_sure: "not_sure",
    };

    if (serviceRaw && legacyMap[serviceRaw]) return legacyMap[serviceRaw];
    if (typeRaw && legacyMap[typeRaw]) return legacyMap[typeRaw];

    return "";
  };

  /* =========================================================
     CONTACT: PREFILL SELECT + HERO SWAP
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
      }
    }

    const note = qs("#prefillNote");
    if (note) note.hidden = !safeLower(select.value);

    const hero = qs(".page-hero");
    const heroH1 = hero ? qs("h1", hero) : null;

    let heroText = qs("#contactHeroText");
    if (!heroText && hero && heroH1) {
      heroText = document.createElement("p");
      heroText.id = "contactHeroText";
      heroText.className = "hero-subcopy";
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

      if (v === "brand-only" || v === "brand-web-prep") {
        heroH1.textContent = "Start a Branding Project";
        heroText.textContent =
          "Share a few details about your brand and where you need clarity. I’ll review, confirm fit, and follow up with next steps.";
        return;
      }

      if (v === "website-reset") {
        heroH1.textContent = "Start a Website Reset";
        heroText.textContent =
          "Tell me what feels off in your current site. I’ll review what needs work, confirm fit, and follow up with the cleanest next step.";
        return;
      }

      if (v === "custom-website-build") {
        heroH1.textContent = "Start a Custom Website Build";
        heroText.textContent =
          "Share what you’re building from the ground up. I’ll review your goals, confirm fit, and follow up with next steps or a quote.";
        return;
      }

      if (v === "premium-website-build") {
        heroH1.textContent = "Start a Premium Website Build";
        heroText.textContent =
          "Share a few details about the kind of support and customization you need. I’ll review scope, confirm fit, and follow up with next steps.";
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
     CONTACT: PREFILL HIDDEN FIELDS
  ========================================================= */
  (() => {
    const form = qs("#contactForm");
    if (!form) return;

    const sourceInput = qs("#source", form);
    const sourcePageInput = qs("#source_page", form);
    const referrerInput = qs("#referrer", form);
    const tierInput = qs("#tier", form);

    if (sourceInput) sourceInput.value = sourceLabel;
    if (sourcePageInput) sourcePageInput.value = window.location.pathname || "/contact.html";
    if (referrerInput) referrerInput.value = document.referrer || "";

    const tierRaw = safeLower(getParam("tier"));
    const allowed = new Set([
      "website-reset",
      "custom-website-build",
      "premium-website-build",
      "foundation",
      "growth",
      "strategic",
    ]);

    if (tierInput && tierRaw && allowed.has(tierRaw)) {
      const map = {
        foundation: "website-reset",
        growth: "custom-website-build",
        strategic: "premium-website-build",
      };
      tierInput.value = map[tierRaw] || tierRaw;
    }
  })();

  /* =========================================================
     CONTACT: SHOW SELECTED NOTE
  ========================================================= */
  (() => {
    const note = qs("#selectionNote");
    const text = qs("#selectionText");
    if (!note || !text) return;

    const projectType = resolveDesiredProjectType();
    const tier = safeLower(getParam("tier"));

    const labelMap = {
      "website-reset": "Website Reset",
      "custom-website-build": "Custom Website Build",
      "premium-website-build": "Premium Website Build",
      foundation: "Website Reset",
      growth: "Custom Website Build",
      strategic: "Premium Website Build",
    };

    const label = labelMap[projectType] || labelMap[tier];
    if (!label) return;

    text.textContent = label;
    note.hidden = false;
  })();

  /* =========================================================
     CONTACT: CONDITIONAL SECTIONS
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

      const premiumFocus = qs("#premium_focus", form);
      if (premiumFocus) premiumFocus.required = current === "premium-website-build";
    };

    apply();
    select.addEventListener("change", apply);
  })();

  /* =========================================================
     CONTACT: SUBMIT HANDLING + ATTRIBUTION
  ========================================================= */
  (() => {
    const form = qs("#contactForm");
    if (!form) return;

    const projectType = qs("#project_type", form);

    const getServiceHint = () =>
      resolveDesiredProjectType() ||
      safeLower(projectType && projectType.value) ||
      "unknown";

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
     BRAND PROCESS TABS
  ========================================================= */
  (function initBrandProcessTabs() {
    const root = qs("[data-bp]");
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
        if (key !== "ArrowLeft" && key !== "ArrowRight" && key !== "Home" && key !== "End") {
          return;
        }

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
     MOTION
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