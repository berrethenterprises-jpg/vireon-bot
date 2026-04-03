import axios from "axios"

export async function scanTokens() {
  try {
    const res = await axios.get(
      "https://api.dexscreener.com/latest/dex/search/?q=usdc",
      {
        headers: {
          "User-Agent": "Mozilla/5.0"
        },
        timeout: 5000
      }
    )

    let pairs = res.data.pairs || []

    console.log("RAW PAIRS:", pairs.length)

    // 🔥 FILTER OUT BASE TOKENS + KEEP MEMECOINS
    pairs = pairs.filter(p => {
      const symbol = p.baseToken?.symbol || ""
      const liq = p.liquidity?.usd || 0

      const isBase =
        symbol.toUpperCase().includes("SOL") ||
        symbol.toUpperCase().includes("USD") ||
        symbol.toUpperCase().includes("ETH") ||
        symbol.toUpperCase().includes("BTC")

      return !isBase && liq > 1000
    })

    // 🔥 SORT BY MOMENTUM
    pairs = pairs.sort((a, b) => {
      const aScore = (a.priceChange?.h1 || 0) + (a.volume?.h24 || 0)
      const bScore = (b.priceChange?.h1 || 0) + (b.volume?.h24 || 0)
      return bScore - aScore
    })

    console.log("FILTERED PAIRS:", pairs.length)

    return pairs.slice(0, 50)

  } catch (err) {
    console.log("SCAN ERROR:", err.response?.status || err.message)
    return []
  }
}