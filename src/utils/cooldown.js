const COOLDOWN_KEY = 'login_cooldown_end'
const COOLDOWN_TYPE_KEY = 'login_cooldown_type'

export function getCooldownEnd() {
  const val = localStorage.getItem(COOLDOWN_KEY)
  return val ? parseInt(val, 10) : 0
}

export function setCooldownFromWait(waitSeconds, type = 'throttle') {
  const end = Date.now() + waitSeconds * 1000
  localStorage.setItem(COOLDOWN_KEY, String(end))
  localStorage.setItem(COOLDOWN_TYPE_KEY, type)
  return end
}

export function getCooldownType() {
  return localStorage.getItem(COOLDOWN_TYPE_KEY) || 'throttle'
}

export function clearCooldown() {
  localStorage.removeItem(COOLDOWN_KEY)
  localStorage.removeItem(COOLDOWN_TYPE_KEY)
}

export function getRemainingSeconds() {
  const end = getCooldownEnd()
  if (!end) return 0
  const remaining = Math.ceil((end - Date.now()) / 1000)
  return remaining > 0 ? remaining : 0
}
