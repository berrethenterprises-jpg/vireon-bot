import { scanTokens } from "./scanner.js"
import { getBalance, getPositions, openPosition, closePosition, cleanPositions } from "./paperTrader.js"
import { clarityIndex, crowdScore, isHighQuality, shouldExit } from "./strategy.js"
import { log } from "./logger.js"
import { CONFIG } from "./config.js"

const activeAddresses = new Set()

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function getLivePrice(address, tokens) {
  const t = tokens.find(t => t.baseToken.address === address)
  return t?.priceUsd || null
}

async function runBot() {
  while (true) {
    const tokens = await scanTokens()

    for (let token of tokens) {
      if (!token?.priceUsd) continue

      const clarity = clarityIndex(token)
      const crowd = crowdScore(token)

      if (!isHighQuality(token, clarity, crowd)) continue

      if (getPositions().length >= CONFIG.MAX_OPEN_TRADES) continue
      if (activeAddresses.has(token.baseToken.address)) continue

      openPosition(token, CONFIG.BASE_SIZE)
      activeAddresses.add(token.baseToken.address)

      log("OPEN", token.baseToken.symbol)
    }

    for (let pos of getPositions()) {
      const currentPrice = getLivePrice(pos.address, tokens)
      if (!currentPrice) continue

      const elapsed = Date.now() - pos.start

      if (shouldExit(pos, { priceUsd: currentPrice }, elapsed)) {
        const adjustedPrice = currentPrice * (1 - CONFIG.SLIPPAGE - CONFIG.FEE)
        const pnl = closePosition(pos, adjustedPrice)

        activeAddresses.delete(pos.address)

        log("CLOSE", { token: pos.symbol, pnl })
      }
    }

    cleanPositions()

    log("BALANCE", getBalance())

    await sleep(CONFIG.LOOP_DELAY)
  }
}

runBot()