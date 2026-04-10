import './styles/main.css'
import { initExplorer } from './explorer.js'
import { initLivePSI } from './nav.js'

document.addEventListener('DOMContentLoaded', async () => {
  initLivePSI()
  try {
    await initExplorer()
  } catch (err) {
    console.error('Explorer initialization failed:', err)
  }
})
