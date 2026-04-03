console.log("🚀 VIREON v9.5 REAL TOKEN FIX ACTIVE")

import { scanTokens } from "./scanner.js"
import { getBalance, getPositions, openPosition, closePosition, cleanPositions } from "./paperTrader.js"
import { shouldEnter, shouldExit } from "./strategy.js"
import { log } from "./logger.js"
import { CONFIG } from "./config.js"

const activeAddresses = new Set()

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 🔥 GET THE ACTUAL MEMECOIN (NOT SOL/USDC)
function getTokenSide(pair) {
  const base = pair.baseToken
  const quote = pair.quoteToken

  const baseSymbol = base?.symbol?.toUpperCase() || ""
  const quoteSymbol = quote?.symbol?.toUpperCase() || ""

  const isBaseStable =
    baseSymbol.includes("SOL") ||
    baseSymbol.includes("USD") ||
    baseSymbol.includes("ETH") ||
    baseSymbol.includes("BTC")

  const isQuoteStable =
    quoteSymbol.includes("SOL") ||
    quoteSymbol.includes("USD") ||
    quoteSymbol.includes("ETH") ||
    quoteSymbol.includes("BTC")

  // 🔥 choose the NON-stable side
  if (isBaseStable && !isQuoteStable) return quote
  if (!isBaseStable && isQuoteStable) return base

  return base // fallback
}

function getLivePrice(address, tokens) {
  const t = tokens.find(t => t.baseToken.address === address)
  return t?.priceUsd || null
}

async function runBot() {
  while (true) {
    const tokens = await scanTokens()

    console.log("TOKENS RECEIVED:", tokens.length)

    for (let pair of tokens) {
      const token = getTokenSide(pair)

      const symbol = token?.symbol || "UNKNOWN"
      const liquidity = pair.liquidity?.usd || 0

      console.log("RAW TOKEN:", symbol, "| LIQ:", liquidity)

      if (!symbol) continue

      if (liquidity < 1000) continue
      if (liquidity > 5_000_000) continue

      console.log("SCANNING:", symbol)

      if (!pair.priceUsd) continue
      if (!shouldEnter(pair)) continue

      if (getPositions().length >= CONFIG.MAX_OPEN_TRADES) continue
      if (activeAddresses.has(token.address)) continue

      openPosition({
        ...pair,
        baseToken: token
      }, CONFIG.BASE_SIZE)

      activeAddresses.add(token.address)

      log("OPEN", {
        token: symbol,
        price: pair.priceUsd
      })
    }

    for (let pos of getPositions()) {
      const currentPrice = getLivePrice(pos.address, tokens)
      if (!currentPrice) continue

      const elapsed = Date.now() - pos.start

      if (shouldExit(pos, { priceUsd: currentPrice }, elapsed)) {
        const adjustedPrice = currentPrice * (1 - CONFIG.SLIPPAGE - CONFIG.FEE)
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