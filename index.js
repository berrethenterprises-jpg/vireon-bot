console.log("🚀 VIREON v20.7 MAX STABILITY")

import { scanTokens } from "./scanner.js"
import {
  getBalance,
  getPositions,
  openPosition,
  closePosition,
  cleanPositions
} from "./paperTrader.js"

import {
  scoreToken,
  shouldConsider,
  shouldExit,
  shouldTakePartial,
  getEntrySize
} from "./strategy.js"

import { log } from "./logger.js"
import { CONFIG } from "./config.js"

const MAX_CAPITAL_USAGE = 0.5
const MAX_TRADE_SHARE = 0.25
const START_BALANCE = 1000

const confirmationCache = new Map()
const cooldown = new Map()

function now() {
  return Date.now()
}

// 🧹 Cleanup maps
function cleanup(map, ttl) {
  const cutoff = now() - ttl
  for (let [k, v] of map) {
    if (v < cutoff) map.delete(k)
  }
}

// 💰 Capital tracking
function getUsedCapital() {
  return getPositions().reduce((s, p) => s + p.size, 0)
}

async function run() {
  while (true) {
    cleanup(cooldown, 300000)

    const pairs = await scanTokens()

    // ⚠️ API failure handling
    if (!pairs.length) {
      await new Promise(r => setTimeout(r, 3000))
      continue
    }

    const balance = getBalance()
    const maxCapital = balance * MAX_CAPITAL_USAGE

    // ⚡ Fast pre-filter
    let valid = pairs.filter(p => shouldConsider(p)).slice(0, 25)

    let ranked = valid.map((p, i) => ({
      pair: p,
      id: `${p.baseToken.address}-${i}`,
      score: scoreToken(p)
    }))

    // 🧠 Regime filter (avg score)
    const avgScore =
      ranked.reduce((s, r) => s + r.score, 0) / (ranked.length || 1)

    if (avgScore < 50) {
      await new Promise(r => setTimeout(r, 2000))
      continue
    }

    // 🔥 Sort best → worst
    ranked.sort((a, b) => b.score - a.score)

    for (let i = 0; i < ranked.length; i++) {
      const { pair } = ranked[i]
      const token = pair.baseToken
      const key = token.address

      // ⛔ Cooldown
      if (cooldown.get(key) > now()) continue

      // 🧠 Confirmation logic (time-separated)
      const prev = confirmationCache.get(key) || { count: 0, time: 0 }

      if (now() - prev.time < 500) {
        confirmationCache.set(key, {
          count: prev.count + 1,
          time: now()
        })
      } else {
        confirmationCache.set(key, { count: 1, time: now() })
        continue
      }

      if (confirmationCache.get(key).count < 2) continue

      // 💰 Capital recalc (CRITICAL FIX)
      let used = getUsedCapital()
      if (used >= maxCapital) break

      let size = getEntrySize(pair, CONFIG.BASE_SIZE, i)

      // 🛡 Max per trade cap
      const maxTrade = balance * MAX_TRADE_SHARE
      if (size > maxTrade) size = maxTrade

      const remaining = maxCapital - used
      if (size > remaining) size = remaining

      // 🛑 Minimum size
      if (size < balance * 0.01) continue

      openPosition({ ...pair }, size)

      cooldown.set(key, now() + 180000)

      log("OPEN", {
        token: token.symbol,
        size,
        rank: i
      })
    }

    for (let pos of getPositions()) {
      const fresh = pairs.find(p => p.baseToken.address === pos.address)
      if (!fresh) continue

      const price = fresh.priceUsd * 0.995 // slippage buffer
      const elapsed = now() - pos.start
      const gain = price / pos.entry

      // 💰 Partial (safe)
      if (!pos.partialTaken && shouldTakePartial(pos, { priceUsd: price })) {
        const portion = gain > 1.6 ? 0.3 : 0.5

        closePosition(
          { ...pos, size: pos.size * portion },
          price
        )

        pos.partialTaken = true
        continue
      }

      // 🔴 Early kill
      if (elapsed > 60000 && gain < 1.03) {
        closePosition(pos, price)
        continue
      }

      // 🔴 Main exit
      if (shouldExit(pos, { priceUsd: price }, elapsed)) {
        closePosition(pos, price)
      }
    }

    cleanPositions()

    log("BALANCE", getBalance().toFixed(2))

    await new Promise(r => setTimeout(r, 1200))
  }
}

run()