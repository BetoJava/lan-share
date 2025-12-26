#!/bin/bash

# LAN Share - Multi-OS startup script
# This script automatically detects your machine's IP address according to the OS

set -e

# Function to detect OS
detect_os() {
    case "$(uname -s)" in
        Darwin)
            echo "macos"
            ;;
        Linux)
            echo "linux"
            ;;
        CYGWIN*|MINGW32*|MSYS*|MINGW*)
            echo "windows"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

# Function to detect IP on macOS
detect_ip_macos() {
    # Try different network interfaces
    local ip

    # WiFi interface
    ip=$(ipconfig getifaddr en0 2>/dev/null)
    if [[ -n "$ip" && "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "$ip"
        return 0
    fi

    # Ethernet interface
    ip=$(ipconfig getifaddr en1 2>/dev/null)
    if [[ -n "$ip" && "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "$ip"
        return 0
    fi

    # Alternative WiFi interface
    ip=$(ipconfig getifaddr en2 2>/dev/null)
    if [[ -n "$ip" && "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "$ip"
        return 0
    fi

    # Fallback: use hostname -I
    ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    if [[ -n "$ip" && "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "$ip"
        return 0
    fi

    return 1
}

# Function to detect IP on Linux
detect_ip_linux() {
    local ip

    # Try different methods
    ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    if [[ -n "$ip" && "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "$ip"
        return 0
    fi

    # Use ip route
    ip=$(ip route get 1 2>/dev/null | awk '{print $7; exit}')
    if [[ -n "$ip" && "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "$ip"
        return 0
    fi

    return 1
}

# Function to detect IP on Windows
detect_ip_windows() {
    local ip

    # Use ipconfig and parse the output
    ip=$(ipconfig 2>/dev/null | grep -A 10 "Wireless LAN adapter" | grep "IPv4 Address" | head -1 | awk '{print $NF}' | tr -d '\r\n')
    if [[ -n "$ip" && "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "$ip"
        return 0
    fi

    # Try with hostname
    ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    if [[ -n "$ip" && "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "$ip"
        return 0
    fi

    return 1
}

# Main IP detection function
detect_host_ip() {
    local os=$(detect_os)
    local ip=""

    case "$os" in
        macos)
            if ip=$(detect_ip_macos); then
                echo "$ip"
                return 0
            fi
            ;;
        linux)
            if ip=$(detect_ip_linux); then
                echo "$ip"
                return 0
            fi
            ;;
        windows)
            if ip=$(detect_ip_windows); then
                echo "$ip"
                return 0
            fi
            ;;
    esac

    echo "Error: Impossible to detect automatically the network IP" >&2
    echo "" >&2
    echo "Alternative solutions:" >&2
    echo "- macOS: ipconfig getifaddr en0" >&2
    echo "- Linux: hostname -I" >&2
    echo "- Windows: ipconfig" >&2
    echo "" >&2
    echo "Or specify manually: HOST_IP=your_ip $0" >&2
    return 1
}

# Function to validate an IP
validate_ip() {
    local ip=$1
    if [[ $ip =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        return 0
    else
        return 1
    fi
}

# Main function
main() {
    local host_ip=""
    local port="${PORT:-3009}"

    echo "🚀 LAN Share - Automatic startup"
    echo ""

    # Check if HOST_IP is already defined
    if [[ -n "${HOST_IP:-}" ]]; then
        if validate_ip "$HOST_IP"; then
            host_ip="$HOST_IP"
            echo "✓ IP specified manually: $host_ip"
        else
            echo "❌ Invalid IP: $HOST_IP" >&2
            exit 1
        fi
    else
        # Detect automatically the network IP
        echo "🔍 Detecting network IP..."
        if host_ip=$(detect_host_ip); then
            echo "✓ IP detected: $host_ip"
        else
            exit 1
        fi
    fi

    echo ""
    echo "📋 Configuration:"
    echo "  IP: $host_ip"
    echo "  Port: $port"
    echo ""
    echo "🌐 Access URLs:"
    echo "  Computer: http://localhost:$port (QR Code)"
    echo "  Mobile: http://$host_ip:$port?token=<auto>"
    echo ""

    # Export environment variables for Docker
    export HOST_IP="$host_ip"
    export PIN="$pin"
    export PORT="$port"

    # Start Docker Compose
    echo "🐳 Starting Docker containers..."
    docker-compose up -d --build

    # Wait for container to be ready
    echo ""
    echo "⏳ Waiting for server startup..."
    sleep 3

    # Check that the container is running
    if docker-compose ps | grep -q "Up"; then
        echo ""
        echo "✅ LAN Share is ready!"
        echo ""
        echo "Open http://localhost:$port"
        echo "Connect to the same WiFi network and scan the displayed QR code"
        echo ""
        echo "🛑 To stop: docker-compose down"
    else
        echo "❌ Error: Container is not starting correctly"
        echo "Logs: docker-compose logs"
        exit 1
    fi
}

# Check that Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install it first." >&2
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install it first." >&2
    exit 1
fi

# Execute the main function
main "$@"
