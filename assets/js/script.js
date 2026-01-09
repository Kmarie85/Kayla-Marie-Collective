document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  if (!form) return;

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
        window.location.assign("/thank-you.html");
      } else {
        alert("Something went wrong. Please check your entries and try again.");
      }
    } catch (err) {
      alert("Network error. Please try again.");
    }
  });
});
