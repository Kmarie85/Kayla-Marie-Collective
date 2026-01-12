document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  /* =========================
     FOOTER YEAR (global)
  ========================= */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

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

  if (!lb || !lbImg) return;

  const open = (imgEl) => {
    // Prefer the real file, not a responsive srcset candidate
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

    // If something is blocking clicks, this will still only fire when the IMG is actually clicked
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
