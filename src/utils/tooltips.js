/**
 * tooltips.js — Technical term tooltip system.
 *
 * Finds all [data-term] elements in the document and attaches hover/focus
 * event listeners that show a floating definition card.
 *
 * Card style: Direction B white card (#FFFFFF), 2px border #D8D4CE, no glassmorphism.
 *
 * Integration: call initTooltips() after initScrollPage() completes.
 */

// Term glossary — exact copy from 12-UI-SPEC.md Technical Term Glossary.
// All 7 required terms. Ordered longest-first to prevent substring conflicts
// in auto-wrapping scenarios.
const GLOSSARY = {
  'SW Monsoon': 'The Southwest Monsoon is a seasonal wind pattern from May to September that carries smoke from Indonesia toward Singapore.',
  'El Ni\u00f1o': 'A warm phase of the ENSO climate cycle, marked by an ONI index above +0.5. It brings reduced rainfall and drought to Sumatra and Borneo, the main fire source regions.',
  'PM2.5': 'Fine particulate matter smaller than 2.5 micrometres. These tiny particles from smoke penetrate deep into the lungs and are the most health-damaging component of haze.',
  'ENSO': 'El Ni\u00f1o\u2013Southern Oscillation, a climate pattern in the Pacific Ocean. El Ni\u00f1o years bring drier conditions to Southeast Asia, increasing fire risk.',
  'PSI': 'The Pollutant Standards Index is Singapore\u2019s official air quality measure. Daily peak readings above 100 are unhealthy for sensitive groups. Above 200, everyone is affected.',
  'ONI': 'The Oceanic Ni\u00f1o Index is a 3-month running average of sea surface temperature anomalies in the Pacific. Positive values indicate El Ni\u00f1o conditions.',
  'FRP': 'Fire Radiative Power measures the energy output of a fire in megawatts, as detected by satellite. Higher FRP indicates more intense burning.',
  'peatland': 'Carbon-rich wetland soil. When burned, peatlands release far more CO\u2082 and smoke than surface vegetation fires, making them the primary source of Singapore\u2019s worst haze episodes.',
  'La Ni\u00f1a': 'A cool phase of the ENSO climate cycle, marked by an ONI index below \u22120.5. It brings above-average rainfall across Southeast Asia, suppressing fire activity and typically giving Singapore cleaner air.',
  'VIIRS': 'Visible Infrared Imaging Radiometer Suite, a NASA satellite sensor that detects fire hotspots at 375m resolution. Data from Suomi NPP and NOAA-20 satellites underpins the fire counts in this analysis.',
  'fire detection': 'A satellite-observed thermal anomaly indicating active burning. Each detection represents one 375m pixel where the sensor recorded elevated heat. Multiple detections can represent a single fire.',
  'impact score': 'A measure that divides fire count by distance from Singapore. Nearby provinces with fewer fires can score higher than distant ones with many more.',
  'risk tier': 'A predicted air quality category for a given day, based on fire activity, ENSO phase, and historical patterns. The three tiers (Good, Moderate, Unhealthy) correspond to NEA PSI health advisory bands.',
  'mobility data': 'Movement tracking data from Google and Apple that measures how much people travel for work, transit, and recreation. During COVID lockdowns, mobility dropped sharply across Southeast Asia.',
}

/**
 * Position the tooltip card near the triggering element.
 * Uses getBoundingClientRect() for element-relative positioning.
 * Clamps to viewport edges to prevent overflow.
 * Card uses position: fixed so we use client coords (not scroll-adjusted).
 */
function positionCard(card, element) {
  const rect = element.getBoundingClientRect()

  // Default: show below and to the right of element
  let top = rect.bottom + 10
  let left = rect.left + 10

  // Clamp right edge
  const cardWidth = 240 // matches max-width in CSS
  const viewportWidth = window.innerWidth
  if (left + cardWidth > viewportWidth - 8) {
    left = viewportWidth - cardWidth - 8
  }

  // Flip above if below the fold
  const cardHeight = 80 // estimated
  const viewportHeight = window.innerHeight
  if (top + cardHeight > viewportHeight - 8) {
    top = rect.top - cardHeight - 10
  }

  // Clamp top
  if (top < 8) {
    top = 8
  }

  card.style.top = `${top}px`
  card.style.left = `${left}px`
}

/**
 * Main export. Call once after initScrollPage() so the full DOM is initialized.
 *
 * 1. Creates singleton tooltip card element (if not already present)
 * 2. Uses querySelectorAll to find all [data-term] elements
 * 3. Attaches mouseenter/mouseleave and focusin/focusout event listeners
 * 4. Card shows GLOSSARY definition for the term; positions near element
 */
export function initTooltips() {
  // Create singleton tooltip card if not already in DOM
  let card = document.getElementById('term-tooltip')
  if (!card) {
    card = document.createElement('div')
    card.id = 'term-tooltip'
    card.className = 'tooltip-card'
    document.body.appendChild(card)
  }

  // Find all [data-term] elements via querySelectorAll
  const terms = document.querySelectorAll('[data-term]')

  terms.forEach((element) => {
    // Determine the term key — use data-term attribute first, fall back to textContent
    const termKey = element.dataset.term || element.textContent.trim()
    const definition = GLOSSARY[termKey]

    if (!definition) return // skip unknown terms

    // Accessibility: link element to tooltip
    element.setAttribute('aria-describedby', 'term-tooltip')

    function showTooltip() {
      card.textContent = definition
      positionCard(card, element)
      card.classList.add('tooltip-visible')
    }

    function hideTooltip() {
      card.classList.remove('tooltip-visible')
    }

    // Desktop hover
    element.addEventListener('mouseenter', showTooltip)
    element.addEventListener('mouseleave', hideTooltip)

    // Keyboard accessibility
    element.addEventListener('focusin', showTooltip)
    element.addEventListener('focusout', hideTooltip)
  })
}
