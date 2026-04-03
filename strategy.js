export function clarityIndex(token) {
  let score = 0
  if (token.priceChange?.h1 > 5) score++
  if (token.volume?.h24 > 50000) score++
  if (token.txns?.h1?.buys > token.txns?.h1?.sells) score++
  return score
}

export function crowdScore(token) {
  const buys = token.txns?.h1?.buys || 0
  if (buys > 500) return "crowded"
  return "clean"
}

export function isHighQuality(token, clarity, crowd) {
  if (clarity < 2) return false
  if (crowd === "crowded") return false
  if ((token.liquidity?.usd || 0) < 20000) return false
  return true
}

export function shouldExit(pos, token, elapsed) {
  const gain = token.priceUsd / pos.entry

  if (elapsed > 180000 && gain < 1.2) return true
  if (elapsed > 300000) return true

  return false
}