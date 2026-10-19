# Animation update

This update keeps the existing page copy, pricing, links, registration flow,
Cloudflare worker, Google Apps Script backend, and demo pages unchanged.

## Files changed

- `public/index.html`
  - Loads the shared motion stylesheet and script.
  - Adds the enhanced EIU student photo as a visual-only section.
  - Adds inline SVG decorations for AI, education, books, and learning.
- `public/register/index.html`
  - Loads the shared motion stylesheet and script only.
  - Registration fields, validation, payment, QR, and submission code are unchanged.

## Files added

- `public/assets/motion.css`
  - Scroll reveals, hover lift, pointer glow, image tilt, animated AI/education icons,
    click ripple, lightbox, responsive rules, and reduced-motion support.
- `public/assets/interactions.js`
  - Progressive enhancement for scroll, pointer, click, keyboard, and lightbox interactions.
- `public/assets/eiu-students-learning-enhanced.webp`
  - Enhanced web-ready student image, optimized to approximately 152 KB.

## Files intentionally unchanged

- `public/_worker.js`
- `apps-script/Code.gs`
- `public/demo/leave/index.html`
- `public/demo/time/index.html`
- `public/demo/meeting/index.html`
- `public/demo/overtime/index.html`
- `public/assets/logo-eiu.png`
- Existing deployment documentation and configuration files

## Deploy

Upload the whole repository to GitHub, or copy the two changed HTML files and
the three added files into the same paths in the existing repository. Cloudflare
Pages will deploy them from `public` without a build command.

