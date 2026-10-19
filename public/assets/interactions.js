(function () {
  'use strict';

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  );

  document.documentElement.classList.add(
    'motion-ready'
  );

  function setupRevealAnimations() {
    const groups = [
      '.hero-content > *',
      '.app-scene',
      '.campus-stage',
      '.demo-apps-heading > *',
      '.demo-experience-attractor',
      '.demo-app-card',
      '.section-heading > *',
      '.benefit-card',
      '.experience-copy > *',
      '.hospitality-card',
      '.session-card',
      '.final-section .container > *',
      '.course-panel > *:not(.course-ai-network)',
      '.form-heading > *',
      '.field',
      '.submit-button'
    ];

    const elements = Array.from(
      document.querySelectorAll(
        groups.join(',')
      )
    );

    elements.forEach(function (element, index) {
      element.classList.add('motion-reveal');
      element.dataset.motionState = 'pending';
      element.style.setProperty(
        '--motion-delay',
        String((index % 4) * 75) + 'ms'
      );

      if (
        element.matches('.app-scene, .hospitality-card')
      ) {
        element.dataset.motionDirection = 'right';
      }
    });

    if (
      reducedMotion.matches ||
      !('IntersectionObserver' in window)
    ) {
      elements.forEach(function (element) {
        element.dataset.motionState = 'visible';
      });
      return;
    }

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.dataset.motionState = 'visible';
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: '0px 0px -9% 0px',
        threshold: 0.09
      }
    );

    elements.forEach(function (element) {
      observer.observe(element);
    });
  }

  function setupPointerSurfaces() {
    if (
      reducedMotion.matches ||
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ) {
      return;
    }

    document.querySelectorAll(
      '.demo-app-card, .benefit-card, .session-card, .hospitality-card, .price-card, .form-panel'
    ).forEach(function (surface) {
      const highlight = document.createElement('span');

      surface.classList.add('motion-surface');
      highlight.className = 'motion-pointer-highlight';
      highlight.setAttribute('aria-hidden', 'true');
      surface.prepend(highlight);

      surface.addEventListener('pointermove', function (event) {
        const bounds = surface.getBoundingClientRect();

        surface.style.setProperty(
          '--pointer-x',
          String(event.clientX - bounds.left) + 'px'
        );

        surface.style.setProperty(
          '--pointer-y',
          String(event.clientY - bounds.top) + 'px'
        );
      });
    });
  }

  function setupPhotoTilt() {
    const stage = document.querySelector('.campus-stage');

    if (!stage) {
      return;
    }

    const canTilt =
      !reducedMotion.matches &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (canTilt) {
      stage.addEventListener('pointermove', function (event) {
        const bounds = stage.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;

        stage.style.setProperty(
          '--tilt-x',
          String(y * -4.5) + 'deg'
        );
        stage.style.setProperty(
          '--tilt-y',
          String(x * 5.5) + 'deg'
        );
        stage.style.setProperty(
          '--photo-x',
          String(x * -8) + 'px'
        );
        stage.style.setProperty(
          '--photo-y',
          String(y * -6) + 'px'
        );
      });

      stage.addEventListener('pointerleave', function () {
        stage.style.setProperty('--tilt-x', '0deg');
        stage.style.setProperty('--tilt-y', '0deg');
        stage.style.setProperty('--photo-x', '0px');
        stage.style.setProperty('--photo-y', '0px');
      });
    }

    stage.addEventListener('pointerdown', function () {
      stage.classList.remove('is-activated');
      void stage.offsetWidth;
      stage.classList.add('is-activated');

      window.setTimeout(function () {
        stage.classList.remove('is-activated');
      }, 950);
    });
  }

  function setupRipples() {
    const targets = document.querySelectorAll(
      'a.logo-box, a.demo-app-card, a.floating-register, button:not([data-demo-attractor]), .submit-button'
    );

    targets.forEach(function (target) {
      target.classList.add('motion-ripple-host');

      if (window.getComputedStyle(target).position === 'static') {
        target.classList.add('motion-ripple-position');
      }
    });

    document.addEventListener('pointerdown', function (event) {
      if (reducedMotion.matches) {
        return;
      }

      const target = event.target.closest('.motion-ripple-host');

      if (!target) {
        return;
      }

      const bounds = target.getBoundingClientRect();
      const ripple = document.createElement('span');

      ripple.className = 'motion-ripple';
      ripple.setAttribute('aria-hidden', 'true');
      ripple.style.left = String(event.clientX - bounds.left) + 'px';
      ripple.style.top = String(event.clientY - bounds.top) + 'px';

      target.appendChild(ripple);

      window.setTimeout(function () {
        ripple.remove();
      }, 680);
    });
  }

  function setupDemoAttractor() {
    const trigger = document.querySelector('[data-demo-attractor]');

    if (!trigger) {
      return;
    }

    const gridId = trigger.getAttribute('aria-controls');
    const grid = gridId ? document.getElementById(gridId) : null;

    if (!grid) {
      return;
    }

    const cards = Array.from(
      grid.querySelectorAll('.demo-app-card')
    );
    let timers = [];

    trigger.addEventListener('click', function () {
      timers.forEach(function (timer) {
        window.clearTimeout(timer);
      });
      timers = [];

      cards.forEach(function (card) {
        card.classList.remove('is-callout');
      });

      grid.scrollIntoView({
        behavior: reducedMotion.matches ? 'auto' : 'smooth',
        block: 'center'
      });

      if (reducedMotion.matches) {
        return;
      }

      cards.forEach(function (card, index) {
        const showTimer = window.setTimeout(function () {
          card.classList.add('is-callout');

          const hideTimer = window.setTimeout(function () {
            card.classList.remove('is-callout');
          }, 950);

          timers.push(hideTimer);
        }, 180 + index * 170);

        timers.push(showTimer);
      });
    });
  }

  function setupLightbox() {
    const stage = document.querySelector('[data-lightbox-src]');

    if (!stage) {
      return;
    }

    const lightbox = document.createElement('div');
    const closeButton = document.createElement('button');
    const image = document.createElement('img');
    let previousFocus = null;

    lightbox.className = 'motion-lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', stage.getAttribute('aria-label') || 'Xem ảnh');

    closeButton.className = 'motion-lightbox-close';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Đóng ảnh');
    closeButton.textContent = '×';

    image.src = stage.dataset.lightboxSrc;
    image.alt = stage.dataset.lightboxAlt || '';
    image.decoding = 'async';

    lightbox.appendChild(closeButton);
    lightbox.appendChild(image);
    document.body.appendChild(lightbox);

    function openLightbox() {
      previousFocus = document.activeElement;
      lightbox.classList.add('is-open');
      document.body.classList.add('motion-lock');
      closeButton.focus();
    }

    function closeLightbox() {
      lightbox.classList.remove('is-open');
      document.body.classList.remove('motion-lock');

      if (previousFocus && typeof previousFocus.focus === 'function') {
        previousFocus.focus();
      }
    }

    stage.addEventListener('click', openLightbox);

    stage.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLightbox();
      }
    });

    closeButton.addEventListener('click', closeLightbox);

    lightbox.addEventListener('click', function (event) {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && lightbox.classList.contains('is-open')) {
        closeLightbox();
      }
    });
  }

  function initializeMotion() {
    setupRevealAnimations();
    setupPointerSurfaces();
    setupPhotoTilt();
    setupDemoAttractor();
    setupRipples();
    setupLightbox();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMotion, { once: true });
  } else {
    initializeMotion();
  }
})();
