function metrics(token) {
  const p1 = token.priceChange?.m5 || 0
  const p5 = token.priceChange?.h1 || 0
  const vol = token.volume?.h24 || 0
  const buys = token.txns?.h1?.buys || 0
  const sells = token.txns?.h1?.sells || 0
  const liq = token.liquidity?.usd || 0
  const fdv = token.fdv || 0

  return { p1, p5, vol, buys, sells, liq, fdv }
}

// ⚡ Momentum acceleration
function accelerating(m) {
  return m.p1 > 0 && m.p5 > m.p1
}

// 🐋 Smart money proxy
function smart(m) {
  return m.buys > m.sells * 2
}

// ⚠️ Volatility clamp (prevents spike entries)
function isTooVolatile(m) {
  return m.p5 > 80 || m.vol > 1_000_000
}

// 🧠 Score (normalized + capped)
export function scoreToken(token) {
  const m = metrics(token)

  if (isTooVolatile(m)) return 0

  let score = 0

  if (accelerating(m)) score += 25

  score += Math.min(m.p5 * 2, 50)
  score += Math.min((m.buys - m.sells) * 0.7, 40)
  score += Math.min(m.vol / 800, 40)

  if (m.fdv < 10_000_000) score += 20
  if (m.liq > 5000 && m.liq < 2_000_000) score += 10
  if (smart(m)) score += 25

  return Math.min(score, 200)
}

// 🎯 Entry filter
export function shouldConsider(token) {
  const m = metrics(token)

  if (isTooVolatile(m)) return false

  return (
    m.liq > 4000 &&
    m.vol > 15000 &&
    m.buys > m.sells * 1.2 &&
    m.p5 > 2 &&
    m.p5 < 60
  )
}

// 💰 Capital concentration
export function getEntrySize(token, base, rank) {
  if (rank === 0) return base * 2.5
  if (rank === 1) return base * 1.8
  if (rank === 2) return base * 1.3

  return base
}

// 💰 Partial profit (dynamic)
export function shouldTakePartial(pos, token) {
  const gain = token.priceUsd / pos.entry
  return gain > 1.3 && !pos.partialTaken
}

// 🔴 Exit logic (adaptive)
export function shouldExit(pos, token, elapsed) {
  const gain = token.priceUsd / pos.entry
  const m = metrics(token)

  // 🔴 Instant failure
  if (elapsed > 45000 && gain < 1.02) return true

  // 🔴 Momentum collapse
  if (elapsed > 90000 && m.buys <= m.sells) return true

  // 🔴 Volume fade
  if (elapsed > 120000 && m.vol < 10000) return true

  // 📈 Strong runner
  if (gain > 1.7 && m.buys > m.sells) return false

  // 📈 Moderate runner
  if (gain > 1.4 && elapsed < 600000) return false

  // ⏱ Timeout
  if (elapsed > 900000) return true

  return false
}