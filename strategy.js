export function clarityIndex(token) {
  let score = 0

  if ((token.priceChange?.h1 || 0) > 1) score++
  if ((token.volume?.h24 || 0) > 10000) score++
  if ((token.txns?.h1?.buys || 0) > 10) score++

  return score
}

export function crowdScore(token) {
  const buys = token.txns?.h1?.buys || 0
  if (buys > 800) return "crowded"
  return "clean"
}

export function isHighQuality(token, clarity, crowd) {
  if (clarity < 1) return false
  if ((token.liquidity?.usd || 0) < 5000) return false
  return true
}

export function shouldExit(pos, token, elapsed) {
  const gain = token.priceUsd / pos.entry

  if (elapsed > 180000 && gain < 1.15) return true
  if (elapsed > 300000) return true

  return false
}