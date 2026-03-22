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
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);

  const {
    game,
    connected,
    ready,
    error,
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
  const opponentDisconnected = opponentId
    ? !participants.some((p) => p.userId === opponentId)
    : false;

  // Loading/connecting state
  if (!game) {
    const getConnectionMessage = () => {
      switch (connectionStatus) {
        case 'connecting':
          return 'Connecting to game...';
        case 'reconnecting':
          return `Reconnecting... (attempt ${retryCount}/5)`;
        case 'failed':
          return 'Connection failed';
        default:
          return 'Connecting...';
      }
    };

    return (
      <div className="ah-container ah-container--narrow" style={{ textAlign: 'center', marginTop: '40px' }}>
        <div className={connectionStatus === 'failed' ? 'ah-banner ah-banner--error' : ''} style={{ fontSize: '18px', padding: '20px' }}>
          {getConnectionMessage()}
        </div>
        {connectionStatus === 'failed' && (
          <>
            <button className="ah-btn-primary" onClick={retry} style={{ marginTop: '20px' }}>
              Tap to Retry
            </button>
            <div style={{ marginTop: 15 }}>
              <button
                className="ah-btn-outline"
                onClick={() => {
                  window.location.href = '/lobby';
                }}
              >
                Back to Lobby
              </button>
            </div>
          </>
        )}
        {error && connectionStatus !== 'failed' && (
          <div className="ah-banner ah-banner--error" style={{ marginTop: '10px' }}>{error}</div>
        )}
      </div>
    );
  }

  // Determine player info
  const isPlayer1 = user.email === game.player1Id;
  const mySymbol = isPlayer1 ? game.player1Symbol : game.player2Symbol;
  const myName = isPlayer1 ? game.player1Name : game.player2Name;
  const opponentName = isPlayer1 ? game.player2Name : game.player1Name;
  const myScore = isPlayer1 ? game.player1Score : game.player2Score;
  const opponentScore = isPlayer1 ? game.player2Score : game.player1Score;

  // Determine turn
  const myPlayerNumber = isPlayer1 ? 1 : 2;
  const isMyTurn = game.currentTurn === myPlayerNumber;

  // Game status
  const gameEnded = game.status === 'completed';
  const iWon = game.winnerId === user.email;
  const isDraw = gameEnded && game.winnerId === null;

  // Status message
  const getStatusMessage = () => {
    if (opponentDisconnected) {
      return 'Opponent disconnected';
    }
    if (connectionStatus === 'reconnecting') {
      return `Reconnecting... (${retryCount}/5)`;
    }
    if (!connected) {
      return 'Reconnecting...';
    }
    if (!ready) {
      return 'Waiting for opponent...';
    }
    if (gameEnded) {
      if (isDraw) {
        return "It's a draw!";
      }
      return iWon ? 'You won!' : 'You lost!';
    }
    return isMyTurn ? 'Your turn' : "Opponent's turn";
  };

  const handleConfirmForfeit = () => {
    forfeit();
    setShowForfeitConfirm(false);
  };

  return (
    <>
      {/* App Header Bar */}
      <div className="ah-app-header">
        <div className="ah-app-header-left">
          <span style={{ fontSize: '1.5rem' }}>⭕</span>
          <h1 className="ah-app-title">Tic-Tac-Toe</h1>
        </div>
        <div className="ah-app-header-right">
          <button
            className="ah-lobby-btn"
            onClick={() => {
              window.location.href = '/lobby';
            }}
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Main content card */}
      <div className="ah-container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div className="ah-card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          {/* Header with scores - compact centered */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <div className={`ah-badge ${isMyTurn && !gameEnded ? 'ah-badge--primary' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', fontWeight: 600, padding: '8px 14px' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{mySymbol}</span>
                <span style={{ fontSize: '14px', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{myName}</span>
                <span style={{ fontSize: '18px', fontWeight: 'bold', minWidth: '20px' }}>{myScore}</span>
              </div>
              <div style={{ fontSize: '14px', color: '#999', fontWeight: 500, textAlign: 'center' }}>
                <div>vs</div>
                <div style={{ fontSize: '11px', color: '#adb5bd' }}>R{game.currentRound} • First to {game.firstTo}</div>
              </div>
              <div className={`ah-badge ${!isMyTurn && !gameEnded ? 'ah-badge--primary' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', fontWeight: 600, padding: '8px 14px' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold', minWidth: '20px' }}>{opponentScore}</span>
                <span style={{ fontSize: '14px', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opponentName}</span>
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{isPlayer1 ? game.player2Symbol : game.player1Symbol}</span>
              </div>
            </div>
          </div>

          {/* Game board */}
          <TicTacToeBoard
            board={game.board}
            onCellClick={makeMove}
            myTurn={isMyTurn}
            mySymbol={mySymbol}
            disabled={!ready || !connected || gameEnded || opponentDisconnected}
          />

          {/* Everything below the board */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '1.5rem' }}>
            {/* Status message */}
            <div className={`ah-status-indicator ${isMyTurn && !gameEnded ? 'ah-status--success' : ''} ${gameEnded ? (iWon ? 'ah-status--success' : 'ah-status--error') : ''} ${opponentDisconnected || connectionStatus === 'reconnecting' ? 'ah-status--warning' : ''}`} style={{ fontSize: '18px', fontWeight: 500, padding: '10px 20px' }}>
              {getStatusMessage()}
            </div>

            {/* Claim Win button */}
            {opponentDisconnected && !gameEnded && (
              <button className="ah-btn-primary" onClick={claimWin}>
                Claim Win
              </button>
            )}

            {error && <div className="ah-banner ah-banner--error">{error}</div>}

            {/* Game actions */}
            {!gameEnded && connected && ready && (
              <button className="ah-btn-outline" onClick={() => setShowForfeitConfirm(true)}>
                Leave Game
              </button>
            )}

            {/* Back to Lobby - shown when game ends */}
            {gameEnded && (
              <button
                className="ah-btn-primary"
                onClick={() => {
                  window.location.href = '/lobby';
                }}
              >
                Back to Lobby
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Forfeit confirmation modal */}
      {showForfeitConfirm && (
        <div className="ah-modal-overlay" onClick={() => setShowForfeitConfirm(false)}>
          <div className="ah-modal ah-modal--small" onClick={(e) => e.stopPropagation()}>
            <div className="ah-modal-header">
              <h3 className="ah-modal-title">Leave Game?</h3>
            </div>
            <div className="ah-modal-body">
              <p>If you leave, your opponent wins.</p>
            </div>
            <div className="ah-modal-footer">
              <button className="ah-btn-outline" onClick={() => setShowForfeitConfirm(false)}>
                Stay
              </button>
              <button className="ah-btn-danger" onClick={handleConfirmForfeit}>
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
