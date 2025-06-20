import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { configs } from '../constants';

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
        socketRef.current.disconnect();
      }
      return;
    }

    // Don't reconnect if already connected with the same token
    if (socketRef.current?.connected) {
      return;
    }

    const socket = io(configs.BASE_SERVER_URL, {
      auth: {
        token: sessionToken
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['polling'],
      timeout: 20000,
      path: configs.SOCKET_ENDPOINT
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      onDisconnect?.(reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.io connection error:', error);
      onError?.(error);
    });

    // Message events
    if (onMessage) {
      socket.on('message', onMessage);
    }

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionToken]);

  return {
    isConnected: socketRef.current?.connected || false,
    socket: socketRef.current
  };
}