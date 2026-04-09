import axios from "axios"

export async function scanTokens() {
  try {
    const res = await axios.get(
      "https://api.dexscreener.com/latest/dex/search/?q=sol",
      { timeout: 5000 }
    )

    return res.data.pairs || []
  } catch (e) {
    console.log("SCAN ERROR", e.message)
    return []
  }
}