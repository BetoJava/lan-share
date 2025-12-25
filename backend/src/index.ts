import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/bun'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { networkInterfaces } from 'os'

const app = new Hono()
const PORT = parseInt(process.env.PORT || '3000')
const AUTH_TOKEN = randomUUID() // Token UUID4 généré au démarrage

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

// #region agent log
  fetch('http://127.0.0.1:7244/ingest/848e389f-a149-4d02-97a5-84e3bca32d1c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backend/src/index.ts:76',message:'Upload request received',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
// #endregion
app.post('/api/files', async (c) => {
  try {
    const formData = await c.req.formData()
    const authToken = formData.get('token') as string

    // Get all files from the form data (support multiple files)
    const files = formData.getAll('files') as File[]
    const singleFile = formData.get('file') as File

    // Support both single file (backward compatibility) and multiple files
    const filesToUpload = files.length > 0 ? files : (singleFile ? [singleFile] : [])

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/848e389f-a149-4d02-97a5-84e3bca32d1c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backend/src/index.ts:81',message:'Upload data extracted',data:{fileCount: filesToUpload.length, tokenReceived: authToken, expectedToken: AUTH_TOKEN},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    if (filesToUpload.length === 0 || authToken !== AUTH_TOKEN) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/848e389f-a149-4d02-97a5-84e3bca32d1c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backend/src/index.ts:84',message:'Invalid files or token',data:{fileCount: filesToUpload.length, tokenReceived: authToken, expectedToken: AUTH_TOKEN},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      return c.json({ error: 'Invalid files or token' }, 400)
    }

    const uploadedFiles = []

    // Process each file
    for (const file of filesToUpload) {
      const fileId = randomUUID()
      const filePath = join(tmpdir(), `lan-share-${fileId}-${file.name}`)

      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/848e389f-a149-4d02-97a5-84e3bca32d1c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backend/src/index.ts:91',message:'Saving file',data:{fileId, fileName: file.name, filePath},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion

      // Save the file
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      await Bun.write(filePath, buffer)

      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/848e389f-a149-4d02-97a5-84e3bca32d1c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backend/src/index.ts:98',message:'File saved successfully',data:{fileId, fileName: file.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion

      fileStorage.set(fileId, {
        filename: file.name,
        size: file.size,
        path: filePath,
        uploadedAt: new Date()
      })

      uploadedFiles.push({
        fileId,
        filename: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString()
      })

      // Notify all connected clients about each file
      const notification = JSON.stringify({
        type: 'file_uploaded',
        fileId,
        filename: file.name,
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
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/848e389f-a149-4d02-97a5-84e3bca32d1c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backend/src/index.ts:117',message:'Upload error',data:{error: error.message, stack: error.stack},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
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

  c.header('Content-Type', 'application/octet-stream')
  c.header('Content-Disposition', `attachment; filename="${fileInfo.filename}"`)

  return new Response(Bun.file(fileInfo.path).stream())
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
app.use('*', serveStatic({ root: './dist' }))

// Démarrage du serveur
console.log(`Starting LAN Share server on port ${PORT}`)
console.log(`Auth Token: ${AUTH_TOKEN.substring(0, 8)}...`)

const server = Bun.serve<WSData>({
  port: PORT,
  hostname: '0.0.0.0',

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