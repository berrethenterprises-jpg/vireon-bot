// 🚀 BUILD CONFIRMATION
console.log("🚀 VIREON v9.0 ACTIVATION MODE")

import { scanTokens } from "./scanner.js"
import { getBalance, getPositions, openPosition, closePosition, cleanPositions } from "./paperTrader.js"
import { clarityIndex, crowdScore, shouldExit } from "./strategy.js"
import { log } from "./logger.js"
import { CONFIG } from "./config.js"

const activeAddresses = new Set()

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getLivePrice(address, tokens) {
  const t = tokens.find(t => t.baseToken.address === address)
  return t?.priceUsd || null
}

async function runBot() {
  while (true) {
    const tokens = await scanTokens()

    console.log("TOKENS RECEIVED:", tokens.length)

    for (let token of tokens) {
      if (!token?.priceUsd) continue

      const symbol = token.baseToken?.symbol
      if (!symbol) continue

      // 🚫 BLOCK BASE TOKENS
      const banned = ["SOL", "SOLANA", "USDC", "USDT", "ETH", "BTC"]
      if (banned.includes(symbol)) continue

      const liquidity = token.liquidity?.usd || 0

      // 🔥 MUCH WIDER RANGE (ACTIVATION MODE)
      if (liquidity < 1000) continue
      if (liquidity > 10_000_000) continue

      console.log("SCANNING:", symbol, "| LIQ:", liquidity)

      const clarity = clarityIndex(token)
      const crowd = crowdScore(token)

      // 🔥 VERY LOOSE ENTRY (TEMPORARY)
      if (clarity < 0) continue

      if (getPositions().length >= CONFIG.MAX_OPEN_TRADES) continue
      if (activeAddresses.has(token.baseToken.address)) continue

      openPosition(token, CONFIG.BASE_SIZE)
      activeAddresses.add(token.baseToken.address)

      log("OPEN", {
        token: symbol,
        price: token.priceUsd
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