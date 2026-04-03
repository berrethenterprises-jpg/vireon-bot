export function analyzeMomentum(token) {
  const priceChange = token.priceChange?.h1 || 0
  const volume = token.volume?.h24 || 0
  const buys = token.txns?.h1?.buys || 0
  const sells = token.txns?.h1?.sells || 0

  const buyPressure = buys > sells
  const volumeStrong = volume > 10000

  return {
    strong: priceChange > 5 && buyPressure && volumeStrong,
    moderate: priceChange > 1 && buys > sells
  }
}

export function shouldEnter(token) {
  const m = analyzeMomentum(token)
  return m.strong || m.moderate
}

export function shouldExit(pos, token, elapsed) {
  const gain = token.priceUsd / pos.entry

  if (elapsed > 120000 && gain < 1.03) return true
  if (gain > 1.3 && elapsed < 600000) return false
  if (elapsed > 600000) return true

  return false
}