import { useSearchParams } from 'react-router-dom';
import { useActivityHubContext } from 'activity-hub-sdk';
import TicTacToeGame from './components/TicTacToeGame';

function App() {
  const [searchParams] = useSearchParams();
  const { user, roles } = useActivityHubContext();

  const gameId = searchParams.get('gameId');

  // Check authentication
  if (!user || user.isGuest) {
    return (
      <div className="ah-container ah-container--narrow ah-mt-lg ah-text-center">
        <h2>Authentication Required</h2>
        <p className="ah-meta">Please access this game through Activity Hub</p>
      </div>
    );
  }

  // Check player role (should be auto-assigned as default role)
  if (!roles.hasApp('player')) {
    return (
      <div className="ah-container ah-container--narrow ah-mt-lg ah-text-center">
        <h2>Access Denied</h2>
        <p className="ah-meta">
          You don't have permission to play Tic-Tac-Toe.
        </p>
        <p className="ah-meta">Contact an administrator to request access.</p>
      </div>
    );
  }

  // Game ID required
  if (!gameId) {
    return (
      <div className="ah-container ah-container--narrow ah-mt-lg ah-text-center">
        <h2>Game ID Required</h2>
        <p className="ah-meta">No game specified</p>
      </div>
    );
  }

  return <TicTacToeGame gameId={gameId} user={user} />;
}

export default App;
