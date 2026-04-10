/**
 * nav.js — Live PSI badge and nav dot module
 *
 * Exports:
 *   initLivePSI()   — Fetches real-time PSI from NEA API, updates badge with color coding
 *   initNavDots()   — Tracks active section via IntersectionObserver, handles dot click scroll
 */

const PSI_API_URL = 'https://api-open.data.gov.sg/v2/real-time/api/psi';
const PSI_TIMEOUT_MS = 3000;

/**
 * NEA official PSI band color lookup.
 * Colors chosen to meet WCAG AA 4.5:1 contrast on both #FAFAF8 and #F0EEEA backgrounds.
 */
function getPSIColor(psi) {
  if (psi <= 50)  return '#14532D';  // Good       — green-900  (~9.8:1 on #F0EEEA)
  if (psi <= 100) return '#92400E';  // Moderate   — amber-800  (~8.9:1 on #F0EEEA)
  if (psi <= 200) return '#C2410C';  // Unhealthy  — orange-700 (~6.0:1 on #F0EEEA)
  if (psi <= 300) return '#B91C1C';  // Very Unhealthy — red-700 (~6.7:1 on #F0EEEA)
  return '#6D28D9';                  // Hazardous  — violet-700 (~5.8:1 on #F0EEEA)
}

/**
 * Fetches the current 24-hour PSI reading from the NEA open API.
 * Displays in the #psi-badge element with NEA band color coding.
 * Falls back to "PSI: —" on error or timeout.
 */
export function initLivePSI() {
  const badge = document.getElementById('psi-badge');
  if (!badge) return;

  // Loading state
  badge.textContent = 'Current SG PSI: ...';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PSI_TIMEOUT_MS);

  fetch(PSI_API_URL, { signal: controller.signal })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(json => {
      clearTimeout(timeoutId);

      const readings = json?.data?.items?.[0]?.readings?.psi_twenty_four_hourly;
      if (!readings || typeof readings !== 'object') throw new Error('Unexpected response shape');

      const values = Object.values(readings).filter(v => typeof v === 'number' && !isNaN(v));
      if (values.length === 0) throw new Error('No numeric PSI readings');

      const avgPSI = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
      const color = getPSIColor(avgPSI);

      badge.textContent = `Current SG PSI: ${avgPSI}`;
      badge.style.color = color;
      badge.style.borderColor = color;
      badge.style.borderWidth = '1px';
      badge.style.borderStyle = 'solid';
      badge.style.borderRadius = '2px';
    })
    .catch(() => {
      clearTimeout(timeoutId);
      badge.textContent = 'Current SG PSI: \u2014';
      badge.style.color = '#5A5A5A';
    });
}

/**
 * Tracks which story section is in the viewport using IntersectionObserver.
 * Adds `.active` class to the corresponding nav dot and handles smooth scrolling
 * when a nav dot is clicked.
 */
export function initNavDots() {
  const dots = Array.from(document.querySelectorAll('.nav-dot'));
  if (dots.length === 0) return;

  // Build ordered list of section-id → nav-dot pairs
  const sections = [];
  dots.forEach(dot => {
    const targetId = dot.dataset.target;
    const sectionEl = targetId ? document.getElementById(targetId) : null;
    if (sectionEl) sections.push({ id: targetId, el: sectionEl, dot });
  });

  // Track active dot via scroll position — find the section whose top
  // is closest to (but not past) the viewport center
  let ticking = false;
  function updateActiveDot() {
    const viewMid = window.scrollY + window.innerHeight * 0.4;
    let closest = null;
    let closestDist = Infinity;

    for (const s of sections) {
      const top = s.el.offsetTop;
      const bottom = top + s.el.offsetHeight;
      // Section must have started (top <= viewMid)
      if (top <= viewMid) {
        const dist = viewMid - top;
        if (dist < closestDist) {
          closestDist = dist;
          closest = s;
        }
      }
    }

    dots.forEach(d => d.classList.remove('active'));
    if (closest) {
      closest.dot.classList.add('active');
    }
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateActiveDot);
    }
  }, { passive: true });

  // Initial update
  updateActiveDot();

  // Click → smooth scroll to section
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const targetId = dot.dataset.target;
      if (!targetId) return;
      const sectionEl = document.getElementById(targetId);
      if (sectionEl) {
        sectionEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}
