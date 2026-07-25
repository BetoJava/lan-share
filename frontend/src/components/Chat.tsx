import { useState, useRef, useEffect } from 'react'
import { Send, MessageSquare, Copy, Check } from 'lucide-react'
import { ChatMessage } from '../types'
import { Button } from './ui/Button'
import { useMediaQuery } from '../hooks/useMediaQuery'

// Métriques partagées entre le textarea et son clone de mesure : toute
// divergence ici décalerait la hauteur calculée
const INPUT_BOX = 'px-4 py-2 text-base leading-6 border rounded-xl'
// Plafond appliqué au clone comme au textarea : c'est le clone qui dimensionne
// la ligne de grille, le borner sur le seul conteneur ne suffit pas
const INPUT_MAX_H = 'max-h-[200px]'

interface ChatProps {
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  isConnected: boolean
}

export const Chat = ({ messages, onSendMessage, isConnected }: ChatProps) => {
  const [inputMessage, setInputMessage] = useState('')
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Sur écran tactile, Entrée insère un retour à la ligne : on envoie au bouton
  const hasKeyboard = useMediaQuery('(pointer: fine)')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = () => {
    if (!inputMessage.trim() || !isConnected) return
    // Seuls les blancs en bordure sont retirés : les retours à la ligne
    // internes et les caractères markdown sont transmis tels quels
    onSendMessage(inputMessage.trim())
    setInputMessage('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && hasKeyboard) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Copie via un textarea hors écran : préserve les retours à la ligne, donc
  // le markdown ressort tel quel
  const copyViaTextArea = (text: string) => {
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.style.position = "fixed"
    textArea.style.left = "-9999px"
    textArea.style.top = "0"
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    let copied = false
    try {
      copied = document.execCommand('copy')
    } catch (err) {
      console.error('Fallback copy failed', err)
    }
    document.body.removeChild(textArea)
    return copied
  }

  const handleCopy = async (text: string, index: number) => {
    let copied = false

    // L'API moderne échoue aussi en contexte sécurisé quand la permission est
    // refusée : on retombe sur execCommand au lieu d'abandonner en silence
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text)
        copied = true
      } catch (err) {
        console.warn('Clipboard API refused, falling back', err)
      }
    }

    if (!copied) copied = copyViaTextArea(text)

    if (copied) {
      setCopiedId(index)
      setTimeout(() => setCopiedId(null), 2000)
    } else {
      console.error('Failed to copy text')
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
        <form onSubmit={handleSubmit} className="flex items-end space-x-3">
          {/* textarea et non input : un input single-line supprime les retours
              à la ligne au collage, ce qui écrase toute mise en forme markdown.
              La hauteur suit le contenu via un clone invisible placé dans la
              même cellule de grille — c'est lui qui dicte la hauteur de la
              ligne, le textarea s'y étire. Aucune mesure JS, donc rien qui
              puisse se tromper si l'élément est calculé à largeur nulle. */}
          <div className="flex-1 grid">
            <div
              aria-hidden="true"
              className={`${INPUT_BOX} ${INPUT_MAX_H} [grid-area:1/1] invisible overflow-hidden whitespace-pre-wrap break-words border-transparent`}
            >
              {inputMessage + ' '}
            </div>
            <textarea
              rows={1}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isConnected ? "Type your message..." : "Connection lost..."}
              disabled={!isConnected}
              className={`${INPUT_BOX} ${INPUT_MAX_H} [grid-area:1/1] w-full bg-white border-gray-200 resize-none overflow-y-auto focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors`}
            />
          </div>
          <Button
            type="submit"
            disabled={!inputMessage.trim() || !isConnected}
            className="rounded-xl px-4 h-[42px]"
          >
            <Send size={18} />
          </Button>
        </form>
        {hasKeyboard && (
          <p className="text-[10px] text-gray-400 mt-1.5 px-1">
            Enter to send &middot; Shift+Enter for a new line
          </p>
        )}
      </div>
    </div>
  )
}
