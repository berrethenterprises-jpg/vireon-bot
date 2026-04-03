import axios from "axios"

export async function scanTokens() {
  try {
    const res = await axios.get(
      "https://api.dexscreener.com/latest/dex/pairs/solana",
      {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      }
    )

    let pairs = res.data.pairs || []

    // 🔥 SORT BY ACTIVITY (KEY FIX)
    pairs = pairs
      .filter(p => p.volume?.h24 > 10000)
      .sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))

    console.log("RAW PAIRS:", pairs.length)

    return pairs.slice(0, 50)
  } catch (err) {
    console.log("SCAN ERROR:", err.response?.status || err.message)
    return []
  }
}