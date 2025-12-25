export interface ChatMessage {
  type: 'chat_message'
  message: string
  sender: string
  timestamp: string
}

export interface FileInfo {
  id: string
  filename: string
  size: number
  uploadedAt: Date
}

export type TabType = 'chat' | 'files' | 'network'

