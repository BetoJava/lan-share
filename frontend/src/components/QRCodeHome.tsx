import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { QrCode, Wifi, WifiOff } from 'lucide-react'

interface QRCodeHomeProps {
  isConnected: boolean
  compact?: boolean
}

export const QRCodeHome = ({ isConnected, compact = false }: QRCodeHomeProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [token, setToken] = useState<string>('')
  const [hostIp, setHostIp] = useState<string>('')

  useEffect(() => {
    const loadNetworkInfo = async () => {
      try {
        const tokenResponse = await fetch('/api/token')
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json()
          setToken(tokenData.token)
        }

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
      if (token && hostIp) {
        try {
          const url = `http://${hostIp}:3009?token=${token}`
          const qrCodeDataUrl = await QRCode.toDataURL(url, {
            width: compact ? 120 : 256,
            margin: compact ? 1 : 2,
            color: {
              dark: '#2563eb',
              light: '#ffffff'
            }
          })
          setQrCodeUrl(qrCodeDataUrl)
        } catch (error) {
          console.error('Failed to generate QR code:', error)
        }
      }
    }

    generateQR()
  }, [token, hostIp, compact])

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center space-x-1 text-xs font-medium text-gray-600">
            <QrCode size={12} />
            <span>Connect</span>
            {isConnected ? (
              <Wifi size={10} className="text-green-500" />
            ) : (
              <WifiOff size={10} className="text-red-500" />
            )}
          </div>

          {qrCodeUrl ? (
            <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20" />
          ) : (
            <div className="w-20 h-20 flex items-center justify-center bg-gray-50 rounded-md border border-dashed border-gray-200">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-8 p-6">
      <div className="text-center space-y-4">
        <p className="text-sm font-medium text-gray-700 flex items-center justify-center">
          <QrCode size={16} className="mr-2 text-blue-600 animate-pulse" />
          Scan to connect
        </p>
        {qrCodeUrl ? (
          <div className="inline-block p-4 bg-white border border-gray-100 rounded-3xl shadow-xl transition-all duration-1000 animate-pulse border-blue-200">
            <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
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
