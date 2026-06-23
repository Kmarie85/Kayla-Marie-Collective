const revealSelectors = [
  ".section-eyebrow",
  ".services-hero__container",
  ".services-intro__container",
  ".service-card",
  ".services-belief__container",
  ".fit-card",
  ".services-cta__container",

  ".work-hero__container",
  ".featured-story__content",
  ".featured-story__visual",
  ".story-breakdown article",
  ".project-card",
  ".work-thread__container",
  ".work-cta__container",

  ".about-hero__content",
  ".about-hero__visual",
  ".about-story__container",
  ".belief-strip article",
  ".about-background__visual",
  ".about-background__content",
  ".personal-note__content",
  ".personal-note__card",
  ".about-cta__container",

  ".contact-hero__container",
  ".contact-main__content",
  ".contact-form",
  ".contact-steps article",
  ".contact-cta__container",

  ".hero__content",
  ".hero__visual",
  ".problem-card",
  ".about-preview__content",
  ".about-preview__visual",
  ".help-card",
  ".story-card",
  ".why-kmc__item",
  ".objection-card",
  ".process-step",
  ".testimonial-card",
  ".final-cta__container"
];

const revealElements = document.querySelectorAll(revealSelectors.join(","));

const revealOnScroll = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealOnScroll.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.14,
  }
);

revealElements.forEach((element, index) => {
  element.classList.add("reveal");
  element.style.transitionDelay = `${Math.min(index * 35, 280)}ms`;
  revealOnScroll.observe(element);
});