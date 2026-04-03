// 🚀 FORCE BUILD CONFIRMATION
console.log("🚀 VIREON v8.8 STRONG FILTER BUILD ACTIVE")

import { scanTokens } from "./scanner.js"
import { getBalance, getPositions, openPosition, closePosition, cleanPositions } from "./paperTrader.js"
import { clarityIndex, crowdScore, isHighQuality, shouldExit } from "./strategy.js"
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

      // 🔥 STRONG FILTER (FINAL VERSION)
      const banned = ["SOL", "SOLANA", "USDC", "USDT", "ETH", "BTC"]

      // skip base tokens
      if (banned.includes(symbol)) continue

      // skip high liquidity (not memecoins)
      const liquidity = token.liquidity?.usd || 0
      if (liquidity > 5_000_000) continue

      // skip dead/low liquidity junk
      if (liquidity < 5_000) continue

      console.log("SCANNING:", symbol, "| LIQ:", liquidity)

      const clarity = clarityIndex(token)
      const crowd = crowdScore(token)

      if (!isHighQuality(token, clarity, crowd)) continue

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