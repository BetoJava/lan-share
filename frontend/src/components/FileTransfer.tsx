import React, { useState, useRef, useEffect } from 'react'
import { UploadCloud, File, Download, HardDrive } from 'lucide-react'
import { FileInfo } from '../types'
import { Button } from './ui/Button'

interface FileTransferProps {
  onFileUploaded?: () => void
  authToken?: string
}

export const FileTransfer = ({ onFileUploaded, authToken }: FileTransferProps) => {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState<{ file: File, progress: number }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date) => {
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files
    if (!fileList || fileList.length === 0) return

    const filesArray = Array.from(fileList)
    const maxSize = 100 * 1024 * 1024

    // Check file sizes
    const oversizedFiles = filesArray.filter(file => file.size > maxSize)
    if (oversizedFiles.length > 0) {
      alert(`The following files are too large (max 100MB):\n${oversizedFiles.map(f => f.name).join('\n')}`)
      return
    }

    setSelectedFiles(filesArray)
  }

  const clearSelection = () => {
    setSelectedFiles([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)
    setUploadingFiles(selectedFiles.map(file => ({ file, progress: 0 })))

    try {
      const formData = new FormData()
      selectedFiles.forEach(file => {
        formData.append('files', file)
      })
      if (authToken) {
        formData.append('token', authToken)
      }

      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      // Update progress for all files
      setUploadingFiles(selectedFiles.map(file => ({ file, progress: 100 })))

      await loadFiles()
      onFileUploaded?.()

      // Clear selection after successful upload
      setSelectedFiles([])
      setTimeout(() => {
        setUploadingFiles([])
      }, 1000)

    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload error')
      setSelectedFiles([])
      setUploadingFiles([])
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const loadFiles = async () => {
    try {
      const response = await fetch('/api/files')
      const data = await response.json()
      setFiles(data.files.map((f: any) => ({
        ...f,
        uploadedAt: new Date(f.uploadedAt)
      })))
    } catch (error) {
      console.error('Failed to load files:', error)
    }
  }

  const downloadFile = async (fileId: string, filename: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}`)
      if (!response.ok) throw new Error('Download failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
      alert('Download error')
    }
  }

  useEffect(() => {
    loadFiles()
    
    // Poll every 2 seconds to refresh the file list
    const interval = setInterval(loadFiles, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <UploadCloud className="mr-2 text-blue-600" size={20} />
          File Transfer
        </h2>

        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
              isUploading
                ? 'bg-gray-50 border-gray-200 cursor-not-allowed'
                : 'bg-blue-50/30 border-blue-200 hover:border-blue-400 hover:bg-blue-50/50'
            }`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadCloud className={`mb-3 ${isUploading ? 'text-gray-400 animate-pulse' : 'text-blue-500'}`} size={32} />
              <p className="text-sm text-gray-700 font-medium">
                {isUploading ? 'Upload in progress...' : selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : 'Click to select files'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Maximum 100 MB per file</p>
            </div>
          </label>

          {selectedFiles.length > 0 && !isUploading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">Selected files:</h4>
                <div className="flex space-x-2">
                  <Button onClick={clearSelection} variant="secondary" className="text-xs px-3 py-1">
                    Clear
                  </Button>
                  <Button onClick={handleUpload} className="text-xs px-3 py-1">
                    Upload {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
                  </Button>
                </div>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2 min-w-0">
                      <File size={16} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{file.name}</span>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">{formatFileSize(file.size)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadingFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">Uploading:</h4>
              <div className="space-y-2">
                {uploadingFiles.map((item, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <File size={16} className="text-blue-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{item.file.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full transition-all duration-300 ease-out"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8">{item.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100">
        <h3 className="text-md font-bold text-gray-900 mb-4 flex items-center">
          <HardDrive className="mr-2 text-gray-500" size={18} />
          Available Files
        </h3>

        {files.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed">
            <File className="mx-auto mb-3 text-gray-300" size={40} />
            <p className="text-gray-500 text-sm">No files shared yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <File size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {file.filename}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {formatFileSize(file.size)} • {formatDate(file.uploadedAt)}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => downloadFile(file.id, file.filename)}
                  variant="secondary"
                  className="rounded-lg p-2 hover:bg-blue-50 hover:text-blue-600"
                >
                  <Download size={18} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
