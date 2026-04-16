import { getAuthHeaders } from "@/lib/auth"

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8070"

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  })

  const contentType = response.headers.get("content-type") || ""
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const message =
      typeof data === "object" && data?.mensagem
        ? data.mensagem
        : "Erro ao comunicar com o servidor"

    const error = new Error(message)
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}
