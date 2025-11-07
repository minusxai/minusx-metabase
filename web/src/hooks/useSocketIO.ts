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

  // Store callbacks in refs to avoid stale closures
  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    onErrorRef.current = onError;
  }, [onMessage, onConnect, onDisconnect, onError]);

  useEffect(() => {
    // Only connect if we have a session token
    if (!sessionToken) {
      // Disconnect if we're connected but no longer have a token
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Don't reconnect if a socket already exists (connected or connecting)
    if (socketRef.current) {
      return;
    }

    const socket = io(configs.BASE_SERVER_URL, {
      auth: {
        token: sessionToken
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      transports: ['websocket'],
      timeout: 5000,
      path: configs.SOCKET_ENDPOINT
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      onConnectRef.current?.();
    });

    socket.on('disconnect', (reason) => {
      onDisconnectRef.current?.(reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.io connection error:', error);
      onErrorRef.current?.(error);
    });

    // Message events - always register listener with ref
    socket.on('message', (message) => {
      onMessageRef.current?.(message);
    });

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