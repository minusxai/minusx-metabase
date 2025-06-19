import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketIOOptions {
  sessionToken?: string;
  onMessage?: (message: any) => void;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
}

export function useSocketIO({
  sessionToken,
  onMessage,
  onConnect,
  onDisconnect,
  onError
}: UseSocketIOOptions = {}) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Only connect if we have a session token
    if (!sessionToken) {
      // Disconnect if we're connected but no longer have a token
      if (socketRef.current?.connected) {
        console.log('Session token cleared, disconnecting socket');
        socketRef.current.disconnect();
      }
      return;
    }

    // Don't reconnect if already connected with the same token
    if (socketRef.current?.connected) {
      return;
    }

    console.log('Connecting to Socket.io server...');

    // Create socket connection with built-in reconnection
    const socket = io(process.env.REACT_APP_SOCKET_URL || 'ws://localhost:8000', {
      auth: {
        token: sessionToken
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('Socket.io connected');
      onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket.io disconnected:', reason);
      onDisconnect?.(reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.io connection error:', error);
      onError?.(error);
    });

    // Message events
    socket.on('message', onMessage);
    socket.on('notification', onMessage);
    socket.on('alert', onMessage);
    socket.on('error_message', onMessage);

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionToken, onMessage, onConnect, onDisconnect, onError]);

  return {
    isConnected: socketRef.current?.connected || false,
    socket: socketRef.current
  };
}