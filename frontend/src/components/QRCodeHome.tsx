import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { Smartphone, Shield, Wifi, RefreshCw } from 'lucide-react'
import { Button } from './ui/Button'

export const QRCodeHome = () => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [token, setToken] = useState<string>('')
  const [hostIp, setHostIp] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    setIsLoading(true)
    setError('')
    try {
      const tokenResponse = await fetch('/api/token')
      if (!tokenResponse.ok) throw new Error(`Token error: ${tokenResponse.status}`)
      const tokenData = await tokenResponse.json()
      setToken(tokenData.token)

      const ipResponse = await fetch('/api/host-ip')
      if (ipResponse.ok) {
        const ipData = await ipResponse.json()
        if (!ipData.ip) throw new Error('IP not detected')
        setHostIp(ipData.ip)
      } else {
        throw new Error(`IP error: ${ipResponse.status}`)
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Connection error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const generateQR = async () => {
      if (token && hostIp) {
        try {
          const url = `http://${hostIp}:3009?token=${token}`
          const qrCodeDataUrl = await QRCode.toDataURL(url, {
            width: 300,
            margin: 2,
            color: {
              dark: '#2563eb',
              light: '#ffffff'
            }
          })
          setQrCodeUrl(qrCodeDataUrl)
        } catch (err) {
          console.error(err)
        }
      }
    }
    generateQR()
  }, [token, hostIp])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full text-center border border-gray-100 relative overflow-hidden">
        {/* Background decorative element */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200 rotate-3">
            <Smartphone size={40} className="text-white -rotate-3" />
          </div>
          
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">LAN Share</h1>
          <p className="text-gray-500 font-medium mb-8 flex items-center justify-center">
            <Shield size={16} className="mr-2 text-green-500" />
            Secure local sharing
          </p>
        </div>

        {isLoading ? (
          <div className="py-12 space-y-4">
            <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-400 font-medium animate-pulse">Secure initialization...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-6 rounded-3xl border border-red-100 space-y-4">
            <p className="text-red-700 font-bold">Oops! Something went wrong</p>
            <p className="text-red-600 text-sm">{error}</p>
            <Button onClick={loadData} variant="danger" className="w-full rounded-2xl">
              <RefreshCw size={18} className="mr-2" /> Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-gray-50/50 rounded-[2rem] p-6 border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                📱 Scan to access
              </h2>
              <div className="flex justify-center bg-white p-4 rounded-3xl shadow-lg">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center">
                    <div className="animate-pulse w-full h-full bg-gray-100 rounded-xl" />
                  </div>
                )}
              </div>
            </div>

            <div className="text-left bg-blue-50/50 rounded-2xl p-5 border border-blue-100">
              <h3 className="font-bold text-blue-900 mb-3 flex items-center">
                <Wifi size={18} className="mr-2" /> Quick Start
              </h3>
              <ul className="text-sm text-blue-800 space-y-2 font-medium opacity-80">
                <li className="flex items-start">
                  <span className="mr-2 text-blue-500">•</span>
                  Connect to the same WiFi
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-blue-500">•</span>
                  Scan the code with your mobile
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-blue-500">•</span>
                  Share your files instantly
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
