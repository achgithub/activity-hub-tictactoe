import { useState } from 'react';
import { useSessionAwareness } from 'activity-hub-sdk';
import { useGameSocket } from '../hooks/useGameSocket';
import { User } from '../types/game';
import TicTacToeBoard from './TicTacToeBoard';

interface TicTacToeGameProps {
  gameId: string;
  user: User;
  token: string;
}

export default function TicTacToeGame({ gameId, user, token }: TicTacToeGameProps) {
  const [error, setError] = useState<string | null>(null);

  const {
    game,
    connected,
    ready,
    error: socketError,
    connectionStatus,
    retryCount,
    makeMove,
    forfeit,
    claimWin,
    retry,
  } = useGameSocket(gameId, user, token);

  // Get opponent ID
  const opponentId =
    game && (user.email === game.player1Id ? game.player2Id : game.player1Id);

  // Use Activity Hub awareness to track opponent presence
  const { participants } = useSessionAwareness(
    user.email,
    user.name,
    'tictactoe',
    gameId
  );
  const opponentPresent = opponentId
    ? participants.some((p) => p.userId === opponentId)
    : false;

  const handleCellClick = async (position: number) => {
    try {
      setError(null);
      await makeMove(position);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to make move');
    }
  };

  const handleForfeit = async () => {
    if (window.confirm('Are you sure you want to forfeit this game?')) {
      try {
        setError(null);
        await forfeit();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to forfeit');
      }
    }
  };

  const handleClaimWin = async () => {
    try {
      setError(null);
      await claimWin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim win');
    }
  };

  if (!ready) {
    return (
      <div className="ah-container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
        <h2>
          {connectionStatus === 'connecting' && 'Connecting...'}
          {connectionStatus === 'reconnecting' && `Reconnecting (attempt ${retryCount})...`}
          {connectionStatus === 'failed' && 'Connection Failed'}
        </h2>
        {socketError && <p className="ah-meta">{socketError}</p>}
        {connectionStatus === 'failed' && (
          <button className="ah-btn-primary" onClick={retry}>
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!game) {
    return (
      <div className="ah-container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
        <h2>Game not found</h2>
      </div>
    );
  }

  const isPlayer1 = user.email === game.player1Id;
  const mySymbol = isPlayer1 ? game.player1Symbol : game.player2Symbol;
  const opponentName = isPlayer1 ? game.player2Name : game.player1Name;
  const isMyTurn =
    (game.currentTurn === 1 && isPlayer1) || (game.currentTurn === 2 && !isPlayer1);
  const gameActive = game.status === 'active';

  return (
    <div className="ah-container ah-container--narrow" style={{ paddingTop: '2rem' }}>
      {/* Header */}
      <div className="ah-flex-between" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Tic Tac Toe</h1>
        {!connected && (
          <span className="ah-badge ah-badge--warning">Reconnecting...</span>
        )}
      </div>

      {/* Scores */}
      <div className="ah-flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div className="ah-meta" style={{ marginBottom: '0.25rem' }}>
            {game.player1Name} ({game.player1Symbol})
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {game.player1Score}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="ah-meta" style={{ marginBottom: '0.25rem' }}>
            First to {game.firstTo}
          </div>
          <div className="ah-meta">Round {game.currentRound}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="ah-meta" style={{ marginBottom: '0.25rem' }}>
            {game.player2Name} ({game.player2Symbol})
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {game.player2Score}
          </div>
        </div>
      </div>

      {/* Opponent Status */}
      {gameActive && (
        <div className="ah-flex-between" style={{ marginBottom: '1rem' }}>
          <div className="ah-meta">
            Opponent:{' '}
            {opponentPresent ? (
              <span className="ah-status-dot ah-status-dot--online">Online</span>
            ) : (
              <span className="ah-status-dot ah-status-dot--offline">Offline</span>
            )}
          </div>
        </div>
      )}

      {/* Status Message */}
      {gameActive && isMyTurn && (
        <div className="ah-status-indicator ah-status--success" style={{ marginBottom: '1rem' }}>
          Your turn!
        </div>
      )}

      {gameActive && !isMyTurn && (
        <div className="ah-status-indicator" style={{ marginBottom: '1rem' }}>
          Waiting for {opponentName}...
        </div>
      )}

      {!gameActive && game.winnerId && (
        <div
          className={`ah-status-indicator ${
            game.winnerId === user.email ? 'ah-status--success' : 'ah-status--error'
          }`}
          style={{ marginBottom: '1rem' }}
        >
          {game.winnerId === user.email
            ? `You won the series ${game.player1Score}-${game.player2Score}!`
            : `${opponentName} won the series ${game.player1Score}-${game.player2Score}`}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="ah-status-indicator ah-status--error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Board */}
      <TicTacToeBoard
        board={game.board}
        onCellClick={handleCellClick}
        disabled={!gameActive || !isMyTurn}
        currentPlayerSymbol={mySymbol}
      />

      {/* Actions */}
      {gameActive && (
        <div className="ah-flex-between" style={{ marginTop: '2rem' }}>
          <button className="ah-btn-outline" onClick={handleForfeit}>
            Forfeit
          </button>

          {!opponentPresent && (
            <button className="ah-btn-danger" onClick={handleClaimWin}>
              Claim Win (Opponent Disconnected)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
