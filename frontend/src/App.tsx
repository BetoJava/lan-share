import React, { useState } from 'react'
import { MessageSquare, Files, QrCode } from 'lucide-react'
import { Chat } from './components/Chat'
import { FileTransfer } from './components/FileTransfer'
import { QRCodeHome } from './components/QRCodeHome'
import { useWebSocket } from './hooks/useWebSocket'
import { useAuth } from './hooks/useAuth'
import { useIsSmallScreen } from './hooks/useMediaQuery'
import { TabType } from './types'

function App() {
  const isSmallScreen = useIsSmallScreen()
  const [activeTab, setActiveTab] = useState<TabType>('chat')
  const { isAuthenticated, urlToken } = useAuth()
  const { isConnected, isAuthenticated: wsAuth, messages, sendMessage, connect } = useWebSocket()

  // Connect to WebSocket when authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      connect(urlToken)
    }
  }, [isAuthenticated, urlToken, connect])

  const tabs = isSmallScreen ? [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'files', label: 'Files', icon: Files },
    { id: 'connect', label: 'Connect', icon: QrCode },
  ] : [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'files', label: 'Files', icon: Files },
  ]

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col relative">
      {/* QR Code - Only visible on large screens (sm and up) */}
      {!isSmallScreen && (
        <div className="absolute top-4 right-4 z-10">
          <QRCodeHome isConnected={isConnected && wsAuth} compact={true} />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 bg-gray-50">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col min-h-[600px]">
          {/* Tabs */}
          <nav className="flex border-b bg-gray-50/50">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as TabType)}
                className={`flex-1 flex items-center justify-center py-4 text-sm font-medium transition-all border-b-2 ${
                  activeTab === id
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} className="mr-2" />
                {label}
              </button>
            ))}
          </nav>

          <div className="flex-1">
            {activeTab === 'chat' && (
              <Chat messages={messages} onSendMessage={sendMessage} isConnected={isConnected && wsAuth} />
            )}
            {activeTab === 'files' && (
              <FileTransfer authToken={urlToken} />
            )}
            {activeTab === 'connect' && isSmallScreen && (
              <div className="h-full flex items-center justify-center p-6">
                <QRCodeHome isConnected={isConnected && wsAuth} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
