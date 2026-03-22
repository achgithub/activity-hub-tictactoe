import { useSearchParams } from 'react-router-dom';
import TicTacToeGame from './components/TicTacToeGame';

function App() {
  const [searchParams] = useSearchParams();

  const gameId = searchParams.get('gameId');
  const userId = searchParams.get('userId');
  const userName = searchParams.get('userName');
  const token = searchParams.get('token');

  if (!userId || !token) {
    return (
      <div className="ah-container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
        <h2>Authentication Required</h2>
        <p className="ah-meta">Missing user credentials</p>
      </div>
    );
  }

  if (!gameId) {
    return (
      <div className="ah-container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
        <h2>Game ID Required</h2>
        <p className="ah-meta">No game specified</p>
      </div>
    );
  }

  const user = {
    email: userId,
    name: userName || userId,
  };

  return <TicTacToeGame gameId={gameId} user={user} token={token} />;
}

export default App;
