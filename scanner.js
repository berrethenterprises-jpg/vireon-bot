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

    // 🔥 MEMECOIN FILTER
    pairs = pairs.filter(p => {
      const liq = p.liquidity?.usd || 0
      const vol = p.volume?.h24 || 0
      const fdv = p.fdv || 0

      // 🚫 Remove big caps / non-meme
      if (fdv > 50_000_000) return false

      // 🚫 Remove dead tokens
      if (liq < 3000) return false

      // 🚫 Remove no activity
      if (vol < 10000) return false

      return true
    })

    console.log("FILTERED PAIRS:", pairs.length)

    // 🔥 SORT BY MOMENTUM
    pairs.sort((a, b) => {
      const aScore = (a.priceChange?.h1 || 0) + (a.volume?.h24 || 0)
      const bScore = (b.priceChange?.h1 || 0) + (b.volume?.h24 || 0)
      return bScore - aScore
    })

    return pairs.slice(0, 50)

  } catch (err) {
    console.log("SCAN ERROR:", err.response?.status || err.message)
    return []
  }
}