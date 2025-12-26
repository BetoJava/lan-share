#!/bin/bash

# LAN Share - macOS startup script for standalone build
# This script automatically detects your machine's IP address and starts the standalone executable

set -e

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
    local executable_path="dist/lan-share"

    echo "🚀 LAN Share - Standalone startup (macOS)"
    echo ""

    # Check if executable exists
    if [ ! -f "$executable_path" ]; then
        echo "❌ Standalone executable not found at $executable_path"
        echo "Please run ./build.sh first to create the executable in dist/."
        exit 1
    fi

    # Check if executable is runnable
    if [ ! -x "$executable_path" ]; then
        echo "❌ Executable is not executable. Running chmod +x..."
        chmod +x "$executable_path"
    fi

    # Detect IP
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
        if host_ip=$(detect_ip_macos); then
            echo "✓ IP detected: $host_ip"
        else
            echo "❌ Impossible to detect automatically the network IP" >&2
            echo "" >&2
            echo "Alternative solutions:" >&2
            echo "- macOS: ipconfig getifaddr en0" >&2
            echo "- Or specify manually: HOST_IP=your_ip ./start-build.sh" >&2
            exit 1
        fi
    fi

    echo ""
    echo "📋 Configuration:"
    echo "  IP: $host_ip"
    echo "  Port: $port"
    echo "  Executable: $executable_path"
    echo ""

    # Set environment variables
    export HOST_IP="$host_ip"
    export PORT="$port"

    echo "🌐 Access URLs:"
    echo "  Computer: http://localhost:$port"
    echo "  Mobile: http://$host_ip:$port"
    echo ""

    echo "🚀 Starting LAN Share server..."
    echo ""

    # Start the executable with environment variables
    exec "$executable_path"
}

# Execute the main function
main "$@"
