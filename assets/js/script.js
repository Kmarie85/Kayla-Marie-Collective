document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  /* =========================
     FOOTER YEAR (global)
  ========================= */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* =========================
     PREFILL CONTACT SELECT (Option A)
     - Supports: contact.html?type=strategy or ?type=standard
     - Tries common select ids/names
     - Matches by option value first, then by option text
  ========================= */
  (() => {
    const params = new URLSearchParams(window.location.search);
    const typeRaw = (params.get("type") || "").trim().toLowerCase();
    if (!typeRaw) return;

    // Common select field targets (adjust your form IDs/names if needed)
    const select =
      document.querySelector("#service") ||
      document.querySelector("select[name='service']") ||
      document.querySelector("#support_level") ||
      document.querySelector("select[name='support_level']") ||
      document.querySelector("#project_type") ||
      document.querySelector("select[name='project_type']") ||
      document.querySelector("#inquiry_type") ||
      document.querySelector("select[name='inquiry_type']");

    if (!select || select.tagName !== "SELECT") return;

    // Map query -> likely option values (you can customize these anytime)
    const valueMap = {
      strategy: ["strategy", "strategy-led", "strategyled", "vip", "premium"],
      standard: ["website", "standard", "implementation", "general"],
    };

    const desiredValues = valueMap[typeRaw];
    const options = Array.from(select.options);

    // 1) Try match by value
    if (desiredValues && desiredValues.length) {
      const foundByValue = options.find((o) =>
        desiredValues.includes((o.value || "").trim().toLowerCase())
      );
      if (foundByValue) {
        select.value = foundByValue.value;
        // trigger change in case you have conditional UI tied to it
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }
    }

    // 2) Fallback: match by label/text
    const labelNeedle =
      typeRaw === "strategy"
        ? ["strategy", "strategy-led", "strategic", "vip", "premium"]
        : ["website", "standard", "implementation", "general"];

    const foundByText = options.find((o) => {
      const text = (o.textContent || "").trim().toLowerCase();
      return labelNeedle.some((n) => text.includes(n));
    });

    if (foundByText) {
      select.value = foundByText.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
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
  ========================= */
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightboxImg");

  // If the page doesn't have a lightbox, stop here (everything else above still ran)
  if (!lb || !lbImg) return;

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
});
