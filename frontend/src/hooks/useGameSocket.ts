import { useState, useEffect, useCallback } from 'react';
import { Game, SSEEvent, User } from '../types/game';

interface UseGameSocketReturn {
  game: Game | null;
  connected: boolean;
  ready: boolean;
  error: string | null;
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'failed';
  retryCount: number;
  makeMove: (position: number) => Promise<void>;
  forfeit: () => Promise<void>;
  claimWin: () => Promise<void>;
  retry: () => void;
}

export function useGameSocket(
  gameId: string,
  user: User,
  token: string
): UseGameSocketReturn {
  const [game, setGame] = useState<Game | null>(null);
  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'reconnecting' | 'failed'
  >('connecting');
  const [retryCount, setRetryCount] = useState(0);

  // SSE URL - RELATIVE (Activity Hub proxies to Unix socket)
  const sseUrl = `/api/game/${gameId}/stream?token=${encodeURIComponent(token)}`;

  // API calls - RELATIVE URLs
  const makeMove = useCallback(
    async (position: number) => {
      const response = await fetch('/api/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gameId,
          playerId: user.email,
          position,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Move failed');
      }
    },
    [gameId, user.email, token]
  );

  const forfeit = useCallback(async () => {
    const response = await fetch(`/api/game/${gameId}/forfeit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ playerId: user.email }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Forfeit failed');
    }
  }, [gameId, user.email, token]);

  const claimWin = useCallback(async () => {
    const response = await fetch(`/api/game/${gameId}/claim-win`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ playerId: user.email }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Claim win failed');
    }
  }, [gameId, user.email, token]);

  // SSE connection with reconnection logic
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      setConnectionStatus(retryCount > 0 ? 'reconnecting' : 'connecting');

      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        setConnected(true);
        setConnectionStatus('connected');
        setRetryCount(0);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        const msg: SSEEvent = JSON.parse(event.data);

        switch (msg.type) {
          case 'connected':
            setGame(msg.payload as Game);
            setReady(true);
            break;

          case 'move_update':
            setGame(msg.payload.game as Game);
            break;

          case 'game_ended':
            setGame(msg.payload.game as Game);
            break;

          case 'ping':
            // Keepalive
            break;
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        setConnected(false);

        if (retryCount < 5) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 16000);
          reconnectTimeout = setTimeout(() => {
            setRetryCount((prev) => prev + 1);
          }, delay);
        } else {
          setConnectionStatus('failed');
          setError('Connection failed after 5 attempts');
        }
      };
    };

    connect();

    return () => {
      eventSource?.close();
      clearTimeout(reconnectTimeout);
    };
  }, [sseUrl, retryCount]);

  return {
    game,
    connected,
    ready,
    error,
    connectionStatus,
    retryCount,
    makeMove,
    forfeit,
    claimWin,
    retry: () => setRetryCount(0),
  };
}
