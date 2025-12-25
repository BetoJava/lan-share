import React, { useState } from 'react'
import { MessageSquare, Files, Network } from 'lucide-react'
import { Chat } from './components/Chat'
import { FileTransfer } from './components/FileTransfer'
import { NetworkInfo } from './components/NetworkInfo'
import { useWebSocket } from './hooks/useWebSocket'
import { useAuth } from './hooks/useAuth'
import { TabType } from './types'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('network')
  const { isAuthenticated, urlToken, setIsAuthenticated } = useAuth()
  const { isConnected, isAuthenticated: wsAuth, messages, sendMessage, disconnect, connect } = useWebSocket()

  // Connect to WebSocket when authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      connect(urlToken)
    }
  }, [isAuthenticated, urlToken, connect])

  const handleLogout = () => {
    disconnect()
    setIsAuthenticated(false)
    window.location.reload()
  }

  const tabs = [
    { id: 'network', label: 'Network', icon: Network },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'files', label: 'Files', icon: Files },
  ]

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
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
            {activeTab === 'network' && (
              <NetworkInfo 
                isConnected={isConnected && wsAuth} 
                onLogout={handleLogout} 
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
