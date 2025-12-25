import { useState, useEffect, useRef, useCallback } from 'react'

export interface ChatMessage {
  type: 'chat_message'
  message: string
  sender: string
  timestamp: string
}

export interface FileNotification {
  type: 'file_uploaded'
  fileId: string
  filename: string
  size: number
  uploadedAt: string
}

export interface FilesHistory {
  type: 'files_history'
  files: Array<{
    id: string
    filename: string
    size: number
    uploadedAt: Date
  }>
}

export interface AuthResponse {
  type: 'auth_success' | 'auth_failed' | 'error'
  message?: string
}

export type WebSocketMessage = ChatMessage | FileNotification | FilesHistory | AuthResponse

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [files, setFiles] = useState<Array<{
    id: string
    filename: string
    size: number
    uploadedAt: Date
  }>>([])
  const wsRef = useRef<WebSocket | null>(null)

  const connect = useCallback((authToken?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws${authToken ? `?token=${authToken}` : ''}`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      // Authenticate with token if provided
      if (authToken) {
        ws.send(JSON.stringify({ type: 'auth', token: authToken }))
      }
    }

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data)

        switch (data.type) {
          case 'auth_success':
            setIsAuthenticated(true)
            break
          case 'auth_failed':
          case 'error':
            setIsAuthenticated(false)
            console.error('WebSocket error:', data.message)
            break
          case 'chat_message':
            setMessages(prev => [...prev, data])
            break
          case 'file_uploaded':
            setFiles(prev => [...prev, {
              id: data.fileId,
              filename: data.filename,
              size: data.size,
              uploadedAt: new Date(data.uploadedAt)
            }])
            break
          case 'files_history':
            setFiles(data.files.map(f => ({
              ...f,
              uploadedAt: new Date(f.uploadedAt)
            })))
            break
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
      setIsAuthenticated(false)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setIsConnected(false)
      setIsAuthenticated(false)
    }
  }, [])

  const sendMessage = useCallback((message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && isAuthenticated) {
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        message
      }))
    }
  }, [isAuthenticated])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    setIsAuthenticated(false)
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, []) // disconnect is stable thanks to useCallback with []

  return {
    isConnected,
    isAuthenticated,
    messages,
    files,
    connect,
    sendMessage,
    disconnect
  }
}
