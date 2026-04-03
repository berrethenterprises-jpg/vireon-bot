import axios from "axios"

async function fetchPairs(url) {
  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      },
      timeout: 5000
    })

    return res.data.pairs || []
  } catch (err) {
    console.log("FAILED:", url)
    return []
  }
}

export async function scanTokens() {
  try {
    // 🔥 TRY MULTIPLE SOURCES
    let pairs = []

    // Primary
    pairs = await fetchPairs("https://api.dexscreener.com/latest/dex/search/?q=sol")

    // Fallback 1
    if (pairs.length === 0) {
      pairs = await fetchPairs("https://api.dexscreener.com/latest/dex/search/?q=usdc")
    }

    // Fallback 2
    if (pairs.length === 0) {
      pairs = await fetchPairs("https://api.dexscreener.com/latest/dex/search/?q=token")
    }

    console.log("RAW PAIRS:", pairs.length)

    // 🔥 CLEAN + SORT
    pairs = pairs
      .filter(p => p.priceUsd && p.liquidity?.usd)
      .sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))

    return pairs.slice(0, 50)

  } catch (err) {
    console.log("SCAN ERROR:", err.message)
    return []
  }
}