import axios from "axios"

export async function scanTokens() {
  try {
    const res = await axios.get(
      "https://api.dexscreener.com/latest/dex/search/?q=",
      {
        headers: {
          "User-Agent": "Mozilla/5.0"
        },
        timeout: 5000
      }
    )

    let pairs = res.data.pairs || []

    // 🔥 REMOVE SOL BASE PAIRS
    pairs = pairs.filter(p => {
      const symbol = p.baseToken?.symbol || ""
      return !symbol.toUpperCase().includes("SOL")
    })

    // 🔥 SORT BY MOMENTUM (KEY)
    pairs = pairs.sort((a, b) => {
      const aScore = (a.priceChange?.h1 || 0) + (a.volume?.h24 || 0)
      const bScore = (b.priceChange?.h1 || 0) + (b.volume?.h24 || 0)
      return bScore - aScore
    })

    console.log("RAW PAIRS AFTER FILTER:", pairs.length)

    return pairs.slice(0, 50)

  } catch (err) {
    console.log("SCAN ERROR:", err.message)
    return []
  }
}