document.addEventListener("DOMContentLoaded", () => {

  /* =========================
     CONTACT FORM SUBMIT
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
            gtag("event", "contact_form_submit", {
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
  ========================= */
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightboxImg");

  if (!lb || !lbImg) return;

  const open = (imgEl) => {
    lbImg.src = imgEl.src;
    lbImg.alt = imgEl.alt || "Preview image";

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
  };

  // Open lightbox
  document.addEventListener("click", (e) => {
    const img = e.target.closest("img[data-lightbox]");
    if (img) open(img);
  });

  // Close lightbox (backdrop or ✕)
  lb.addEventListener("click", (e) => {
    if (e.target.matches("[data-close]")) close();
  });

  // Close on ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lb.classList.contains("is-open")) {
      close();
    }
  });

});
