import './styles/main.css'
import { initScrollPage } from './scroll.js'
import { initLivePSI, initNavDots } from './nav.js'
import { initTooltips } from './utils/tooltips.js'
import './charts/story/pattern-chart.js'
import './charts/story/source-chart.js'
import './charts/story/climate-chart.js'
import './charts/story/change-chart.js'

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Start PSI fetch (non-blocking)
  initLivePSI()

  // 2. Initialize nav dots
  initNavDots()

  // 3. Initialize scroll + charts
  try {
    await initScrollPage()
  } catch (err) {
    console.error('Scroll initialization failed:', err)
  }

  // 4. Initialize technical term tooltips (after full DOM is initialized)
  initTooltips()

  // 5. Animate bridge text on scroll into view
  const bridgeObserver = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
    { threshold: 0.3 }
  )
  document.querySelectorAll('.bridge-text').forEach(el => bridgeObserver.observe(el))

})
