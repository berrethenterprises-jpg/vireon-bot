export function analyzeMomentum(token) {
  const priceChange = token.priceChange?.h1 || 0
  const volume = token.volume?.h24 || 0
  const buys = token.txns?.h1?.buys || 0
  const sells = token.txns?.h1?.sells || 0

  const buyPressure = buys > sells
  const volumeStrong = volume > 10000

  return {
    strong: priceChange > 5 && buyPressure && volumeStrong,
    moderate: priceChange > 1 && buys > sells,
    strength: priceChange + (buys - sells)
  }
}

export function shouldEnter(token) {
  const m = analyzeMomentum(token)

  // 🔥 Tier 1 (strong)
  if (m.strong) return true

  // 🔥 Tier 2 (emerging momentum)
  if (m.moderate) return true

  return false
}

export function shouldExit(pos, token, elapsed) {
  const gain = token.priceUsd / pos.entry

  // cut losers fast
  if (elapsed > 120000 && gain < 1.03) return true

  // let winners run
  if (gain > 1.3 && elapsed < 600000) return false

  // time exit
  if (elapsed > 600000) return true

  return false
}