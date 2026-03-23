import { useState } from 'react';
import { useSessionAwareness, GameCard } from 'activity-hub-sdk';
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
      <div className="ah-container ah-container--narrow ah-text-center ah-mt-lg">
        <div className={connectionStatus === 'failed' ? 'ah-banner ah-banner--error' : ''}>
          {getConnectionMessage()}
        </div>
        {connectionStatus === 'failed' && (
          <>
            <button className="ah-btn-primary ah-mt" onClick={retry}>
              Tap to Retry
            </button>
            <div className="ah-mt">
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
          <div className="ah-banner ah-banner--error ah-mt">{error}</div>
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
      <GameCard>
          {/* Header with scores - compact centered */}
          <div className="ah-mb-lg">
            <div className="ah-flex-center">
              <div className={`ah-badge ttt-player-score ${isMyTurn && !gameEnded ? 'ah-badge--primary' : ''}`}>
                <span className="ttt-symbol">{mySymbol}</span>
                <span className="ttt-player-name">{myName}</span>
                <span className="ttt-score">{myScore}</span>
              </div>
              <div className="ah-meta ttt-vs">
                <div>vs</div>
                <div className="ttt-round-info">R{game.currentRound} • First to {game.firstTo}</div>
              </div>
              <div className={`ah-badge ttt-player-score ${!isMyTurn && !gameEnded ? 'ah-badge--primary' : ''}`}>
                <span className="ttt-score">{opponentScore}</span>
                <span className="ttt-player-name">{opponentName}</span>
                <span className="ttt-symbol">{isPlayer1 ? game.player2Symbol : game.player1Symbol}</span>
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
          <div className="ah-flex-col-center ah-mt-lg">
            {/* Status message */}
            <div className={`ah-status-indicator ${isMyTurn && !gameEnded ? 'ah-status--success' : ''} ${gameEnded ? (iWon ? 'ah-status--success' : 'ah-status--error') : ''} ${opponentDisconnected || connectionStatus === 'reconnecting' ? 'ah-status--warning' : ''}`}>
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
        </GameCard>

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
