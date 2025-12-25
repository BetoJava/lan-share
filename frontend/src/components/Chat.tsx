import { useState, useRef, useEffect } from 'react'
import { Send, MessageSquare, Copy, Check } from 'lucide-react'
import { ChatMessage } from '../types'
import { Button } from './ui/Button'

interface ChatProps {
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  isConnected: boolean
}

export const Chat = ({ messages, onSendMessage, isConnected }: ChatProps) => {
  const [inputMessage, setInputMessage] = useState('')
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputMessage.trim() && isConnected) {
      onSendMessage(inputMessage.trim())
      setInputMessage('')
    }
  }

  const handleCopy = async (text: string, index: number) => {
    try {
      // Tentative avec l'API moderne
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        // Fallback pour mobile/contextes non-sécurisés (HTTP)
        const textArea = document.createElement("textarea")
        textArea.value = text
        textArea.style.position = "fixed"
        textArea.style.left = "-9999px"
        textArea.style.top = "0"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        try {
          document.execCommand('copy')
        } catch (err) {
          console.error('Fallback copy failed', err)
        }
        document.body.removeChild(textArea)
      }
      
      setCopiedId(index)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="flex flex-col h-[600px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 py-8">
            <div className="p-4 bg-gray-50 rounded-full mb-4">
              <MessageSquare size={48} className="text-gray-300" />
            </div>
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className="flex items-start space-x-3">
              {/* Bouton copier */}
              <button
                onClick={() => handleCopy(msg.message, index)}
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm border ${
                  copiedId === index 
                    ? 'bg-green-500 text-white border-green-600' 
                    : 'bg-white text-gray-400 border-gray-200 hover:text-blue-600 hover:border-blue-300 active:scale-95'
                }`}
                title="Copier le message"
              >
                {copiedId === index ? <Check size={14} /> : <Copy size={14} />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-semibold text-gray-900">
                    {msg.sender.slice(0, 8)}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-2 inline-block max-w-full">
                  <p className="text-sm text-gray-800 break-words whitespace-pre-wrap">{msg.message}</p>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t bg-gray-50/50 p-4">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={isConnected ? "Type your message..." : "Connection lost..."}
            disabled={!isConnected}
            className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
          />
          <Button
            type="submit"
            disabled={!inputMessage.trim() || !isConnected}
            className="rounded-xl px-4"
          >
            <Send size={18} />
          </Button>
        </form>
      </div>
    </div>
  )
}
