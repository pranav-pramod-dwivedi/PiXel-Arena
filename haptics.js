/* ============================================================
   NovaPay — haptics + bubble/spring feedback
   Include on every page:  <script src="haptics.js" defer></script>
   - Vibrates (where supported) on taps of interactive elements.
   - Adds a springy "bubble" bounce + ripple on press.
   Works with .tap, .glass-tap, buttons, links, [role=button].
   ============================================================ */
(function () {
  'use strict';

  // inject bounce + ripple styles
  const css = document.createElement('style');
  css.textContent = `
    @keyframes nvBubble { 0%{transform:scale(1)} 35%{transform:scale(.9)} 70%{transform:scale(1.04)} 100%{transform:scale(1)} }
    .nv-bubble { animation: nvBubble .34s cubic-bezier(.34,1.56,.64,1); }
    .nv-ripple { position:absolute; border-radius:50%; transform:scale(0); pointer-events:none;
      background:rgba(255,255,255,.45); mix-blend-mode:overlay; animation:nvRip .5s ease-out forwards; z-index:99; }
    @keyframes nvRip { to { transform:scale(2.4); opacity:0; } }
    [data-theme="dark"] .nv-ripple { background:rgba(255,255,255,.25); }
  `;
  document.head.appendChild(css);

  const SEL = 'button, a, .tap, .glass-tap, [role="button"], .act, .ctrl, .switch button, .nv-item, .ps-key, .key, .chip:not(.chip::before)';

  // vibration patterns (ms). No-op on desktop / unsupported.
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

  function press(el, e) {
    // spring bounce
    el.classList.remove('nv-bubble');
    void el.offsetWidth;            // reflow to restart animation
    el.classList.add('nv-bubble');
    el.addEventListener('animationend', () => el.classList.remove('nv-bubble'), { once: true });

    // ripple at touch point
    try {
      const r = el.getBoundingClientRect();
      const size = Math.max(r.width, r.height);
      const x = ((e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX) || (r.left + r.width / 2)) - r.left - size / 2;
      const y = ((e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY) || (r.top + r.height / 2)) - r.top - size / 2;
      const cs = getComputedStyle(el);
      if (cs.position === 'static') el.style.position = 'relative';
      if (cs.overflow === 'visible') el.style.overflow = 'hidden';
      const rip = document.createElement('span');
      rip.className = 'nv-ripple';
      rip.style.width = rip.style.height = size + 'px';
      rip.style.left = x + 'px'; rip.style.top = y + 'px';
      el.appendChild(rip);
      rip.addEventListener('animationend', () => rip.remove(), { once: true });
    } catch (e) {}

    buzz(12);   // light tick
  }

  function handler(e) {
    const el = e.target.closest(SEL);
    if (!el) return;
    press(el, e);
  }

  document.addEventListener('pointerdown', handler, { passive: true });

  // stronger buzz for confirming actions (primary CTAs)
  document.addEventListener('click', e => {
    const el = e.target.closest('.ps-cta, .cta button, .nv-item.on, [data-haptic="strong"]');
    if (el) buzz([10, 30, 18]);
  }, { passive: true });

  // expose for scripts (e.g. success = double buzz)
  window.NovaHaptics = { buzz, success: () => buzz([12, 40, 12, 40, 25]), error: () => buzz([60, 40, 60]) };
})();
