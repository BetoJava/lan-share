import { useState, useEffect } from 'react'

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [urlToken, setUrlToken] = useState<string>('')
  const [isLocalhost, setIsLocalhost] = useState(false)

  useEffect(() => {
    const hostname = window.location.hostname
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
    setIsLocalhost(isLocal)

    const init = async () => {
      if (isLocal) {
        try {
          const res = await fetch('/api/token')
          if (res.ok) {
            const data = await res.json()
            setUrlToken(data.token)
            setIsAuthenticated(true)
          }
        } catch (e) {
          console.error("Erreur lors de la récupération du token local:", e)
          setIsAuthenticated(true) // Fallback
        }
      }

      const params = new URLSearchParams(window.location.search)
      const token = params.get('token')
      if (token) {
        setUrlToken(token)
        setIsAuthenticated(true)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
    init()
  }, [])

  return { isAuthenticated, urlToken, isLocalhost, setIsAuthenticated }
}

