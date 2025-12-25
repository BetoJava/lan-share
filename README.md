# LAN Share

File sharing and real-time chat application for local WiFi networks.

<table align="center" width="100%">
  <tr>
    <td align="center" width="33%">
      <img src="readme/qrcode.png" alt="QR Code Auth" width="230"/><br/>
    </td>
    <td align="center" width="33%">
      <img src="readme/chat.png" alt="Chat" width="230"/><br/>
    </td>
    <td align="center" width="33%">
      <img src="readme/files.png" alt="File Transfer" width="230"/><br/>
    </td>
  </tr>
</table>

## Features

- 🔐 **QR Code UUID Authentication** (automatically generated unique token)
- 💬 Real-time chat between connected devices
- 📁 File transfer

## Quick Start

### Automatic Installation (recommended)

The `start.sh` script automatically detects your network IP according to your OS:

```bash
cd file-share
./start.sh
```

#### Script Options

```bash
# Use a specific IP (if automatic detection fails)
HOST_IP=192.168.1.100 ./start.sh

# Change port (default: 3000)
PORT=8080 ./start.sh
```

### Manual Installation

If automatic detection doesn't work:

```bash
cd file-share
HOST_IP=your_ip_here docker-compose up --build
```

To find your IP:
- **macOS**: `ipconfig getifaddr en0`
- **Linux**: `hostname -I`
- **Windows**: `ipconfig` (look for "IPv4 Address")

### Environment Variables

- `HOST_IP`: Your machine's IP for the QR code (auto-detected by script)
- `PORT`: Listening port (default: `3000`)
- `AUTH_TOKEN`: Automatically generated token (UUID4) - no need to set it

## Usage

1. **Start**: `./start.sh`
2. **On your Computer**: Open `http://localhost:3000`
3. **On your mobile**: Scan the QR code displayed on the Computer
4. **Chat & Files**: Exchange text or files

## Architecture

- **Backend**: Hono with WebSocket
- **Frontend**: React + Vite
- **Runtime**: Bun

## Security

- Mandatory authentication with unique token
- Connection limited to local network
- No persistent data storage (memory only)