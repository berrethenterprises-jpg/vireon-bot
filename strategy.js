export function shouldEnter(token) {
  const priceChange = token.priceChange?.h1 || 0
  const volume = token.volume?.h24 || 0

  // 🔥 VERY LOOSE ENTRY (TEMP)
  return priceChange > 0 || volume > 5000
}

export function shouldExit(pos, token, elapsed) {
  const gain = token.priceUsd / pos.entry

  // quick exits
  if (elapsed > 60000 && gain < 1.02) return true

  // let winners run
  if (gain > 1.2) return false

  // max hold
  if (elapsed > 300000) return true

  return false
}