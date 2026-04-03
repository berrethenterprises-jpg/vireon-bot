import axios from "axios"

export async function scanTokens() {
  try {
    const res = await axios.get("https://api.dexscreener.com/latest/dex/pairs/solana")

    const pairs = res.data.pairs || []

    console.log("RAW PAIRS:", pairs.length)

    return pairs.slice(0, 50)
  } catch (err) {
    console.log("SCAN ERROR:", err.message)
    return []
  }
}