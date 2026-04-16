"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { clearStoredToken, getCurrentUser } from "@/lib/auth"

export function useAuthenticatedUser() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setReady(true)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const user = ready ? getCurrentUser() : null

  useEffect(() => {
    if (!ready) {
      return
    }

    if (!user) {
      clearStoredToken()
      router.replace("/")
    }
  }, [ready, router, user])

  return { user, ready }
}
