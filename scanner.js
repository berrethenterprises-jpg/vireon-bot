import axios from "axios"

export async function scanTokens() {
  try {
    const res = await axios.get("https://api.dexscreener.com/latest/dex/tokens/solana")
    return res.data.pairs.slice(0, 50)
  } catch {
    return []
  }
}