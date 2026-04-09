let balance = 1000
let positions = []

export function getBalance() {
  return balance
}

export function getPositions() {
  return positions
}

export function openPosition(token, size) {
  positions.push({
    address: token.baseToken.address,
    symbol: token.baseToken.symbol,
    entry: token.priceUsd,
    size,
    start: Date.now(),
    partialTaken: false
  })

  balance -= size
}

export function closePosition(pos, price) {
  const pnl = pos.size * (price / pos.entry - 1)

  balance += pos.size + pnl

  positions = positions.filter(p => p !== pos)

  return pnl
}

export function cleanPositions() {
  positions = positions.filter(p => p.size > 0)
}