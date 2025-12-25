import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { QrCode } from 'lucide-react'
import { StatusBadge } from './ui/StatusBadge'

interface NetworkInfoProps {
  isConnected: boolean
  onLogout: () => void
}

export const NetworkInfo = ({ isConnected }: NetworkInfoProps) => {
  const [hostIp, setHostIp] = useState<string>('')
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

  useEffect(() => {
    const loadNetworkInfo = async () => {
      try {
        const hostResponse = await fetch('/api/host-ip')
        if (hostResponse.ok) {
          const hostData = await hostResponse.json()
          setHostIp(hostData.ip)
        }
      } catch (error) {
        console.error('Failed to load network info:', error)
      }
    }

    loadNetworkInfo()
  }, [])

  useEffect(() => {
    const generateQR = async () => {
      if (hostIp) {
        try {
          const tokenResponse = await fetch('/api/token')
          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json()
            const token = tokenData.token

            const url = `http://${hostIp}:3000?token=${token}`
            const qrCodeDataUrl = await QRCode.toDataURL(url, {
              width: 300,
              margin: 2,
              color: {
                dark: '#2563eb', // blue-600
                light: '#ffffff'
              }
            })
            setQrCodeUrl(qrCodeDataUrl)
          }
        } catch (error) {
          console.error('Failed to generate QR code:', error)
        }
      }
    }

    generateQR()
  }, [hostIp])

  return (
    <div className="p-6 h-full flex flex-col items-center justify-center space-y-8">
      <div className="flex flex-col items-center space-y-4">
        <StatusBadge isConnected={isConnected} />
        
        {qrCodeUrl ? (
          <div className="text-center space-y-4">
            <p className="text-sm font-medium text-gray-700 flex items-center justify-center">
              <QrCode size={16} className="mr-2 text-blue-600 animate-pulse" />
              Scan to connect
            </p>
            <div className="inline-block p-4 bg-white border border-gray-100 rounded-3xl shadow-xl transition-all duration-1000 animate-pulse border-blue-200">
              <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
            </div>
          </div>
        ) : (
          <div className="h-64 w-64 flex items-center justify-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}
      </div>
    </div>
  )
}
