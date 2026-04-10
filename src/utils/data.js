const BASE = `${import.meta.env.BASE_URL}data`

// Expand short keys in day_predictions to full names (keeps JSON small on wire)
function expandDayPredictions(data) {
  if (!data.day_predictions) return data
  data.day_predictions = data.day_predictions.map(r => ({
    date: r.d,
    predicted_tier: r.t,
    actual_psi: r.psi,
    next_day_psi: r.np,
    fire_idn: r.fi,
    fire_mys: r.fm,
    wind_impact_idn: r.wi,
    wind_impact_mys: r.wm,
    rainfall_mm: r.r,
    oni: r.o,
    wind_speed: r.ws,
    pm25: r.pm,
    season: r.s,
    enso_phase: r.e,
  }))
  return data
}

export async function loadData(filename) {
  const url = `${BASE}/${filename}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`)
  const data = await res.json()
  return expandDayPredictions(data)
}
