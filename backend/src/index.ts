import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/bun'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { networkInterfaces } from 'os'

const app = new Hono()
const PORT = parseInt(process.env.PORT || '3009')
const AUTH_TOKEN = randomUUID() // Token UUID4 généré au démarrage

// Taille max par fichier, doit rester alignée avec le frontend (FileTransfer.tsx)
const MAX_FILE_SIZE = 1000 * 1024 * 1024
// Le frontend envoie tous les fichiers sélectionnés dans une seule requête,
// donc la limite de body doit couvrir plusieurs fichiers à la fois.
// Sans ça, Bun rejette la requête à 128 Mo (sa valeur par défaut).
const MAX_REQUEST_BODY_SIZE = 4 * 1024 * 1024 * 1024

// Nettoie un nom de fichier pour qu'il soit utilisable sur disque et en
// Content-Disposition : pas de séparateur de chemin, pas de caractère de
// contrôle, pas de caractère interdit sous Windows.
const sanitizeFilename = (name: string): string => {
  const base = (name.split(/[/\\]/).pop() || '')
    .normalize('NFC')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/[<>:"|?*]/g, '_')
    .replace(/^\.+/, '')
    .trim()

  if (!base) return 'file'
  if (base.length <= 200) return base

  // Tronque en gardant l'extension
  const dot = base.lastIndexOf('.')
  const ext = dot > 0 ? base.slice(dot) : ''
  return base.slice(0, 200 - ext.length) + ext
}

// Stockage des fichiers en mémoire
const fileStorage = new Map<string, { filename: string, size: number, path: string, uploadedAt: Date }>()

// Type pour les données WebSocket
type WSData = {
  clientId: string
  authenticated: boolean
  ip: string
}

// Map pour garder une trace des clients connectés
const connectedClients = new Set<any>()

// Middleware CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Endpoint pour récupérer le token d'auth (uniquement depuis localhost)
app.get('/api/token', async (c) => {
  const clientIP = c.req.header('x-forwarded-for') ||
                   c.req.header('x-real-ip') ||
                   '127.0.0.1'

  // Uniquement autorisé depuis localhost
  if (clientIP !== '127.0.0.1' && clientIP !== '::1' && !clientIP.startsWith('127.')) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  return c.json({ token: AUTH_TOKEN })
})

// API pour récupérer les IPs réseau
app.get('/api/network', (c) => {
  const nets = networkInterfaces()
  const addresses: string[] = []

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address)
      }
    }
  }

  return c.json({ addresses })
})

// API pour récupérer l'IP de l'hôte
app.get('/api/host-ip', (c) => {
  const hostIp = process.env.HOST_IP
  if (hostIp) {
    return c.json({ ip: hostIp })
  }
  return c.json({
    ip: '',
    message: 'Enter your computer\'s IP address manually.'
  })
})

app.post('/api/files', async (c) => {
  try {
    const formData = await c.req.formData()
    const authToken = formData.get('token') as string

    // Get all files from the form data (support multiple files)
    const files = formData.getAll('files') as File[]
    const singleFile = formData.get('file') as File

    // Support both single file (backward compatibility) and multiple files
    const filesToUpload = files.length > 0 ? files : (singleFile ? [singleFile] : [])

    if (filesToUpload.length === 0 || authToken !== AUTH_TOKEN) {
      return c.json({ error: 'Invalid files or token' }, 400)
    }

    const oversized = filesToUpload.filter(file => file.size > MAX_FILE_SIZE)
    if (oversized.length > 0) {
      return c.json({
        error: `Files too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB): ${oversized.map(f => f.name).join(', ')}`
      }, 413)
    }

    const uploadedFiles = []

    // Process each file
    for (const file of filesToUpload) {
      const fileId = randomUUID()
      const filename = sanitizeFilename(file.name)
      const filePath = join(tmpdir(), `lan-share-${fileId}-${filename}`)

      // Save the file (Bun streams le Blob, pas de buffer complet en mémoire)
      await Bun.write(filePath, file)

      fileStorage.set(fileId, {
        filename,
        size: file.size,
        path: filePath,
        uploadedAt: new Date()
      })

      uploadedFiles.push({
        fileId,
        filename,
        size: file.size,
        uploadedAt: new Date().toISOString()
      })

      // Notify all connected clients about each file
      const notification = JSON.stringify({
        type: 'file_uploaded',
        fileId,
        filename,
        size: file.size,
        uploadedAt: new Date().toISOString()
      })

      for (const ws of connectedClients) {
        if (ws.data?.authenticated) {
          ws.send(notification)
        }
      }
    }

    return c.json({ files: uploadedFiles })
  } catch (error: any) {
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})

// Download de fichiers
app.get('/api/files/:id', (c) => {
  const fileId = c.req.param('id')
  const fileInfo = fileStorage.get(fileId)

  if (!fileInfo) {
    return c.json({ error: 'File not found' }, 404)
  }

  // filename= en ASCII pour les vieux clients, filename*= en UTF-8 (RFC 5987)
  // pour préserver accents et caractères non-latins
  const asciiName = fileInfo.filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '')

  c.header('Content-Type', 'application/octet-stream')
  c.header(
    'Content-Disposition',
    `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileInfo.filename)}`
  )

  return new Response(Bun.file(fileInfo.path).stream())
})

// Suppression d'un fichier
app.delete('/api/files/:id', async (c) => {
  const fileId = c.req.param('id')
  const token = c.req.query('token')

  if (token !== AUTH_TOKEN) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const fileInfo = fileStorage.get(fileId)
  if (!fileInfo) {
    return c.json({ error: 'File not found' }, 404)
  }

  try {
    await Bun.file(fileInfo.path).exists() && require('fs').unlinkSync(fileInfo.path)
  } catch (_) {}

  fileStorage.delete(fileId)
  return c.json({ success: true })
})

// Liste des fichiers disponibles
app.get('/api/files', (c) => {
  const files = Array.from(fileStorage.entries()).map(([id, info]) => ({
    id,
    filename: info.filename,
    size: info.size,
    uploadedAt: info.uploadedAt
  }))

  return c.json({ files })
})

// Servir les fichiers statiques du frontend
// Pour l'exécutable standalone, utiliser le répertoire de l'exécutable
import { dirname } from 'path';
const executableDir = dirname(process.execPath);
const staticRoot = join(executableDir, 'static');
app.use('*', serveStatic({ root: staticRoot }))

// Démarrage du serveur
console.log(`Starting LAN Share server on port ${PORT}`)

const server = Bun.serve<WSData>({
  port: PORT,
  hostname: '0.0.0.0',
  maxRequestBodySize: MAX_REQUEST_BODY_SIZE,

  fetch(request, server) {
    const url = new URL(request.url)

    // WebSocket upgrade
    if (url.pathname === '/ws') {
      const success = server.upgrade(request, {
        data: {
          clientId: randomUUID(),
          authenticated: false,
          ip: 'unknown'
        }
      })

      if (success) {
        return undefined
      }
      return new Response('WebSocket upgrade failed', { status: 400 })
    }

    // Routes HTTP avec Hono
    return app.fetch(request)
  },

  websocket: {
    open(ws) {
      connectedClients.add(ws)

      // Auto-authentification pour localhost
      const clientIP = ws.remoteAddress || '127.0.0.1'
      // En Docker, l'IP peut être différente, on accepte donc aussi les plages locales courantes
      if (clientIP === '127.0.0.1' || clientIP === '::1' || clientIP.startsWith('127.') || clientIP.startsWith('172.')) {
        ws.data.authenticated = true
        console.log(`Client ${ws.data.clientId} auto-authenticated (${clientIP})`)
        
        // Informer le client qu'il est authentifié
        ws.send(JSON.stringify({ type: 'auth_success' }))

        // Envoyer l'historique des fichiers
        const files = Array.from(fileStorage.entries()).map(([id, info]) => ({
          id,
          filename: info.filename,
          size: info.size,
          uploadedAt: info.uploadedAt
        }))
        ws.send(JSON.stringify({ type: 'files_history', files }))
      } else {
        console.log(`Client ${ws.data.clientId} connected (needs token auth)`)
      }
    },

    message(ws, message) {
      try {
        const data = JSON.parse(message as string)

        // Si pas encore authentifié et pas localhost, vérifier le token
        if (!ws.data.authenticated && data.type === 'auth') {
          if (data.token === AUTH_TOKEN) {
            ws.data.authenticated = true
            ws.send(JSON.stringify({ type: 'auth_success' }))

            // Envoyer l'historique des fichiers
            const files = Array.from(fileStorage.entries()).map(([id, info]) => ({
              id,
              filename: info.filename,
              size: info.size,
              uploadedAt: info.uploadedAt
            }))
            ws.send(JSON.stringify({ type: 'files_history', files }))
          } else {
            ws.send(JSON.stringify({ type: 'auth_failed' }))
          }
          return
        }

        if (!ws.data.authenticated) {
          ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }))
          return
        }

        if (data.type === 'chat_message') {
          // Diffuser le message à tous les clients authentifiés
          const chatMessage = JSON.stringify({
            type: 'chat_message',
            message: data.message,
            sender: ws.data.clientId,
            timestamp: new Date().toISOString()
          })

          for (const client of connectedClients) {
            if (client.data?.authenticated) {
              client.send(chatMessage)
            }
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error)
      }
    },

    close(ws) {
      console.log(`Client ${ws.data.clientId} disconnected`)
      connectedClients.delete(ws)
    }
  }
})

console.log(`Server running at http://${server.hostname}:${server.port}`)