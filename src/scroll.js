import scrollama from 'scrollama'

// Chart registry — chart plans (05, 06) will push into this
export const SECTION_CHARTS = {}

export async function initScrollPage() {
  const { loadData } = await import('./utils/data.js')
  const data = await loadData('viz_data.json')

  // Update data-driven PSI peak in narrative HTML
  const dayPreds = data.day_predictions || []
  const psi2015 = dayPreds
    .filter((d) => d.date && d.date.startsWith('2015'))
    .reduce((max, d) => Math.max(max, d.actual_psi || 0), 0)
  if (psi2015 > 0) {
    const peakSpan = document.querySelector('.psi-peak-2015')
    if (peakSpan) peakSpan.textContent = String(Math.round(psi2015))
  }

  const sections = document.querySelectorAll('section[id]')
  const scrollers = []

  for (const sectionEl of sections) {
    const chartModule = SECTION_CHARTS[sectionEl.id]
    if (!chartModule) continue

    const container = sectionEl.querySelector('.chart-panel')
    if (!container) continue

    // Initialize chart
    chartModule.init(container, data)

    // Create Scrollama instance for this section
    const scroller = scrollama()
    scroller
      .setup({
        step: sectionEl.querySelectorAll('[data-step]'),
        offset: 0.75,
        progress: true,
      })
      .onStepEnter(({ element, index }) => {
        // Update step active states within THIS section only
        sectionEl.querySelectorAll('[data-step]').forEach((el, i) => {
          el.classList.toggle('step-active', i === index)
        })
        // Update chart (discrete state changes)
        chartModule.update(index)
      })
      .onStepProgress(({ index, progress }) => {
        // Scale progress so animation completes in first half of scroll,
        // leaving the rest as reading time for the completed chart
        const scaled = Math.min(1, progress / 0.5)
        if (chartModule.progress) chartModule.progress(index, scaled)
      })

    scrollers.push(scroller)
  }

  // Resize handling
  window.addEventListener('resize', () => {
    scrollers.forEach(s => s.resize())
  })
}
