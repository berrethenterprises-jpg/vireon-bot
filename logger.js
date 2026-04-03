export function log(msg, data = "") {
  console.log(`[${new Date().toISOString()}] ${msg}`, data)
}