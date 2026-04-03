let balance = 1000
let positions = []

export function getBalance() {
  return balance
}

export function getPositions() {
  return positions.filter(p => p.open)
}

export function openPosition(token, size) {
  positions.push({
    address: token.baseToken.address,
    symbol: token.baseToken.symbol,
    entry: token.priceUsd,
    size,
    open: true,
    start: Date.now(),
    partialTaken: false
  })
}

export function closePosition(pos, currentPrice) {
  const pnl = ((currentPrice - pos.entry) / pos.entry) * pos.size
  balance += pnl
  pos.open = false
  return pnl
}

export function cleanPositions() {
  positions = positions.filter(p => p.open)
}