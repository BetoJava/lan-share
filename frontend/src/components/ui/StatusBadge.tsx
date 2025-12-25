import { Wifi, WifiOff } from 'lucide-react'

export const StatusBadge = ({ isConnected }: { isConnected: boolean }) => (
  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
    isConnected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
  }`}>
    {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
    <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
  </div>
)

