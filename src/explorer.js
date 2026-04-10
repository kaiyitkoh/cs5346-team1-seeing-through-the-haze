import { loadData } from './utils/data.js'
import { filterState, broadcastFilter, onFilterChange, initFilterControls, isDefaultState } from './explorer-state.js'

// Named chart module imports
import { createTrendChart } from './charts/explorer/trend-chart.js'
import { createScatterChart } from './charts/explorer/scatter-chart.js'
import { createProvinceBarChart } from './charts/explorer/province-bar-chart.js'
import { createDayPickerChart } from './charts/explorer/daypicker-chart.js'
import { createMonthlyTimelineChart } from './charts/explorer/monthly-timeline-chart.js'
import { createTierDistributionChart } from './charts/explorer/tier-distribution-chart.js'

// Chart registry
export const charts = [
  createTrendChart(),
  createMonthlyTimelineChart(),
  createScatterChart(),
  createTierDistributionChart(),
  createProvinceBarChart(),
  createDayPickerChart(),
]

// Maps for filter value → data string conversion
const SEASON_MAP = {
  'sw-monsoon': 'SW Monsoon',
  'ne-monsoon': 'NE Monsoon',
  'inter-monsoon': 'Inter-monsoon',
}
const ENSO_MAP = {
  'el-nino': 'El Nino',
  'la-nina': 'La Nina',
  'neutral': 'Neutral',
}

function deriveFilteredData(data, state) {
  let result = { ...data }

  const [yearMin, yearMax] = state.yearRange
  const hasYearFilter = yearMin !== 2014 || yearMax !== 2024
  const hasSeasonFilter = state.seasons.length > 0
  const hasEnsoFilter = state.ensoPhases.length > 0

  // Map selected filter values to data strings
  const seasonValues = state.seasons.map(s => SEASON_MAP[s])
  const ensoValues = state.ensoPhases.map(e => ENSO_MAP[e])

  // Filter annual_trend by year range and ENSO
  let annual = [...(data.annual_trend || [])]
  if (hasYearFilter) annual = annual.filter(d => d.year >= yearMin && d.year <= yearMax)
  if (hasEnsoFilter) annual = annual.filter(d => ensoValues.includes(d.enso_phase))
  result.annual_trend = annual

  // Filter fire_psi_scatter by year range, season, and ENSO
  let scatter = [...(data.fire_psi_scatter || [])]
  if (hasYearFilter) scatter = scatter.filter(d => d.year >= yearMin && d.year <= yearMax)
  if (hasSeasonFilter) scatter = scatter.filter(d => seasonValues.includes(d.season))
  if (hasEnsoFilter) {
    const ensoYears = (data.annual_trend || []).filter(d => ensoValues.includes(d.enso_phase)).map(d => d.year)
    scatter = scatter.filter(d => ensoYears.includes(d.year))
  }
  result.fire_psi_scatter = scatter

  // Filter day_predictions by year range and season
  let preds = [...(data.day_predictions || [])]
  if (hasYearFilter) {
    preds = preds.filter(d => {
      const yr = parseInt(d.date.split('-')[0])
      return yr >= yearMin && yr <= yearMax
    })
  }
  if (hasSeasonFilter) {
    preds = preds.filter(d => {
      const month = parseInt(d.date.split('-')[1])
      const matchesAny = state.seasons.some(s => {
        if (s === 'sw-monsoon') return month >= 6 && month <= 9
        if (s === 'ne-monsoon') return month === 12 || month <= 3
        if (s === 'inter-monsoon') return (month >= 4 && month <= 5) || (month >= 10 && month <= 11)
        return false
      })
      return matchesAny
    })
  }
  result.day_predictions = preds

  // Filter province_bar_monthly by year range, season, and ENSO
  let provMonthly = [...(data.province_bar_monthly || [])]
  if (hasYearFilter) provMonthly = provMonthly.filter(d => d.year >= yearMin && d.year <= yearMax)
  if (hasSeasonFilter) {
    provMonthly = provMonthly.filter(d => {
      return state.seasons.some(s => {
        if (s === 'sw-monsoon') return d.month >= 6 && d.month <= 9
        if (s === 'ne-monsoon') return d.month === 12 || d.month <= 3
        if (s === 'inter-monsoon') return (d.month >= 4 && d.month <= 5) || (d.month >= 10 && d.month <= 11)
        return false
      })
    })
  }
  if (hasEnsoFilter) {
    const ensoYears = (data.annual_trend || []).filter(d => ensoValues.includes(d.enso_phase)).map(d => d.year)
    provMonthly = provMonthly.filter(d => ensoYears.includes(d.year))
  }
  // Re-aggregate filtered monthly data into province totals
  const provAgg = new Map()
  provMonthly.forEach(d => {
    const key = d.province
    if (!provAgg.has(key)) {
      provAgg.set(key, { province: d.province, country: d.country, impact_score: 0, fire_count: 0, distance_km: d.distance_km })
    }
    const entry = provAgg.get(key)
    entry.impact_score += d.impact_score
    entry.fire_count += d.fire_count
  })
  result.province_bar = Array.from(provAgg.values())
    .sort((a, b) => b.impact_score - a.impact_score)
    .slice(0, 10)
    .map(d => ({ ...d, impact_score: Math.round(d.impact_score * 10000) / 10000 }))

  return result
}

export async function initExplorer() {
  const data = await loadData('viz_data.json')

  // Initialize filter controls (builds slider, wires pills)
  initFilterControls()

  // Initialize all charts
  charts.forEach(({ id, init }) => {
    const container = document.querySelector(`#${id} .chart-container`)
    if (container) init(container, data, filterState)
  })

  // Listen for filter changes — re-derive data and re-render all charts
  onFilterChange((state) => {
    const filtered = deriveFilteredData(data, state)
    charts.forEach(({ id, render }) => {
      const container = document.querySelector(`#${id} .chart-container`)
      if (container) render(container, filtered, state)
    })
  })
}
