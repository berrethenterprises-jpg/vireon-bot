console.log("🚀 VIREON v9.6 LIVE")

import { scanTokens } from "./scanner.js"
import { getBalance, getPositions, openPosition, closePosition, cleanPositions } from "./paperTrader.js"
import { shouldEnter, shouldExit } from "./strategy.js"
import { log } from "./logger.js"
import { CONFIG } from "./config.js"

const activeAddresses = new Set()

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ✅ SMART TOKEN PICKER (FIXES USDC/SOL ISSUE)
function getTokenSide(pair) {
  const base = pair.baseToken
  const quote = pair.quoteToken

  const baseSymbol = base?.symbol?.toUpperCase() || ""
  const quoteSymbol = quote?.symbol?.toUpperCase() || ""

  const isStable = (s) =>
    s.includes("SOL") ||
    s.includes("USD") ||
    s.includes("ETH") ||
    s.includes("BTC")

  const baseStable = isStable(baseSymbol)
  const quoteStable = isStable(quoteSymbol)

  // Case 1: one side is stable → pick the other
  if (baseStable && !quoteStable) return quote
  if (!baseStable && quoteStable) return base

  // Case 2: both are stable → skip
  if (baseStable && quoteStable) return null

  // Case 3: both non-stable → default to base
  return base
}

// ✅ GET LIVE PRICE FOR OPEN POSITIONS
function getLivePrice(address, tokens) {
  const t = tokens.find(t => {
    const token = getTokenSide(t)
    return token?.address === address
  })
  return t?.priceUsd || null
}

async function runBot() {
  while (true) {
    const tokens = await scanTokens()

    console.log("TOKENS RECEIVED:", tokens.length)

    for (let pair of tokens) {
      const token = getTokenSide(pair)
      if (!token) continue

      const symbol = token.symbol || "UNKNOWN"
      const liquidity = pair.liquidity?.usd || 0

      console.log("RAW TOKEN:", symbol, "| LIQ:", liquidity)

      // ✅ BASIC LIQUIDITY FILTER
      if (liquidity < 1000) continue
      if (liquidity > 5_000_000) continue

      console.log("SCANNING:", symbol)

      // ✅ REQUIRE PRICE + STRATEGY
      if (!pair.priceUsd) continue
      if (!shouldEnter(pair)) continue

      // ✅ POSITION LIMIT
      if (getPositions().length >= CONFIG.MAX_OPEN_TRADES) continue

      // ✅ PREVENT DUPLICATES
      if (activeAddresses.has(token.address)) continue

      // ✅ OPEN TRADE
      openPosition(
        {
          ...pair,
          baseToken: token
        },
        CONFIG.BASE_SIZE
      )

      activeAddresses.add(token.address)

      log("OPEN", {
        token: symbol,
        price: pair.priceUsd
      })
    }

    // ✅ MANAGE OPEN POSITIONS
    for (let pos of getPositions()) {
      const currentPrice = getLivePrice(pos.address, tokens)
      if (!currentPrice) continue

      const elapsed = Date.now() - pos.start

      if (shouldExit(pos, { priceUsd: currentPrice }, elapsed)) {
        const adjustedPrice =
          currentPrice * (1 - CONFIG.SLIPPAGE - CONFIG.FEE)

        const pnl = closePosition(pos, adjustedPrice)

        activeAddresses.delete(pos.address)

        log("CLOSE", {
          token: pos.symbol,
          pnl: pnl.toFixed(2)
        })
      }
    }

    cleanPositions()

    log("BALANCE", getBalance().toFixed(2))

    await sleep(CONFIG.LOOP_DELAY)
  }
}

runBot()