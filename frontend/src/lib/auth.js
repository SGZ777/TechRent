export function getStoredToken() {
  if (typeof window === "undefined") {
    return null
  }

  return window.localStorage.getItem("token")
}

export function clearStoredToken() {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem("token")
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=")
  const decoded = window.atob(padded)

  try {
    const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return decoded
  }
}

export function parseTokenPayload(token) {
  if (!token) {
    return null
  }

  try {
    const parts = token.split(".")

    if (parts.length !== 3) {
      return null
    }

    return JSON.parse(decodeBase64Url(parts[1]))
  } catch {
    return null
  }
}

export function getCurrentUser() {
  const token = getStoredToken()
  const payload = parseTokenPayload(token)

  if (!token || !payload) {
    return null
  }

  return {
    token,
    id: payload.id,
    nome: payload.nome,
    email: payload.email,
    nivel_acesso: payload.nivel_acesso,
  }
}

export function getAuthHeaders() {
  const token = getStoredToken()

  if (!token) {
    return {}
  }

  return {
    Authorization: `Bearer ${token}`,
  }
}
