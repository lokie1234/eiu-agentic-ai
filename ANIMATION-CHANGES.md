# Animation update

The site now uses a plain, professional style with almost no motion.
Page copy, pricing, links, registration flow, Cloudflare worker, and the
Google Apps Script backend are unchanged.

## What changed

- Removed every decorative animation: floating cards and icons, pulsing
  buttons, moving arrows, the "Trải nghiệm ngay Web App tương tác" button,
  confetti, hover lift/scale effects, and the 3D tilt on the hero window.
- Removed `public/assets/motion.css` and `public/assets/interactions.js`
  (scroll reveals, pointer glow, click ripple) and their includes.
- Demo app and benefit icons on the home page are simple line icons (SVG)
  instead of emoji and symbols.
- "Phiên 1 / Phiên 2" is now "Buổi 1 / Buổi 2", and "2 phiên" is "2 buổi".

## What is kept

- Loading spinners on submit buttons.
- Short colour, shadow, and opacity transitions on hover, toasts, and dialogs.

## Deploy

Upload the whole repository to GitHub. Cloudflare Pages deploys `public`
without a build command.
