document.addEventListener('DOMContentLoaded', () => {
  const fadeElements = document.querySelectorAll('.js-fade');
  const clipElements = document.querySelectorAll('.js-clip-reveal');
  console.log('Animation elements found:', fadeElements.length + clipElements.length);

  const fadeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          fadeObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.5,
      rootMargin: '0px 0px -40px 0px'
    }
  );

  const clipObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          clipObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 1.0,
      rootMargin: '0px 0px 0px 0px'
    }
  );

  fadeElements.forEach((el) => {
    fadeObserver.observe(el);
  });

  clipElements.forEach((el) => {
    clipObserver.observe(el);
  });

  // 追従CTA: conceptセクションの下端がビューポート内に入ったら表示
  const concept = document.querySelector('section.concept');
  const floatingCta = document.querySelector('.p-floating-cta');
  if (concept && floatingCta) {
    const updateCta = () => {
      const rect = concept.getBoundingClientRect();
      if (rect.bottom <= window.innerHeight) {
        floatingCta.classList.add('is-visible');
      } else {
        floatingCta.classList.remove('is-visible');
      }
    };
    window.addEventListener('scroll', updateCta, { passive: true });
    window.addEventListener('resize', updateCta);
    updateCta();
  }
});
