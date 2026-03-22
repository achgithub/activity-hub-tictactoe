# Tic Tac Toe - Activity Hub Integration

Classic 3x3 grid game integrated with Activity Hub. First multiplayer game migration testing Unix sockets, awareness service, Redis pub/sub, and SSE reconnection handling.

## Features

- **Multiplayer**: Real-time 2-player game
- **Series Mode**: Play best-of-N series (configurable: 1, 2, 3, or 5 wins)
- **Real-time Updates**: SSE-based game state synchronization
- **Opponent Awareness**: Activity Hub awareness service tracks player presence
- **Reconnection**: Automatic reconnection with exponential backoff
- **Disconnect Handling**: Claim win if opponent disconnects for 15+ seconds
- **Game Stats**: Track wins, losses, and game history in PostgreSQL

## Architecture

### Backend (Go)
- **Unix Socket**: Listens on `/tmp/activity-hub-tictactoe.sock`
- **Auth**: `github.com/achgithub/activity-hub-auth` package
- **Game State**: Redis for live games
- **Persistence**: PostgreSQL `tictactoe` database
- **Real-time**: SSE + Redis pub/sub for game events

### Frontend (React + TypeScript)
- **SDK**: `activity-hub-sdk` npm package for awareness
- **Styling**: Activity Hub shared `.ah-*` classes + custom board CSS
- **Build**: Vite

## Prerequisites

### On Raspberry Pi
- Go 1.25+
- Node.js 18+
- PostgreSQL
- Redis
- Activity Hub platform running

## Setup Instructions

### On Mac (Development)

1. **Clone repository**
   ```bash
   cd ~/Documents/Projects
   git clone https://github.com/achgithub/activity-hub-tictactoe.git
   cd activity-hub-tictactoe
   ```

2. **Commit and push** (after making changes)
   ```bash
   git add .
   git commit -m "Initial Tic Tac Toe migration"
   git push origin main
   ```

### On Raspberry Pi (Deployment)

1. **Clone repository**
   ```bash
   cd ~
   git clone https://github.com/achgithub/activity-hub-tictactoe.git
   cd activity-hub-tictactoe
   ```

2. **Create database**
   ```bash
   sudo -u postgres createdb tictactoe
   sudo -u postgres psql -d tictactoe -f database/schema.sql
   ```

3. **Build backend**
   ```bash
   cd backend
   go mod download
   go build -o tictactoe-backend .
   cd ..
   ```

4. **Build frontend**
   ```bash
   cd frontend
   npm install
   npm run build
   cd ..
   ```

5. **Register app with Activity Hub**
   ```bash
   curl -X POST http://localhost:3001/api/admin/apps/register \
     -H "Authorization: Bearer demo-token-admin@activity-hub.com" \
     -H "Content-Type: application/json" \
     -d @MANIFEST.json
   ```

6. **Restart Activity Hub**
   ```bash
   cd ~/activity-hub
   ./stop_services.sh
   ./start_services.sh
   ```

## Testing

### 1. Launch Game
- Login to Activity Hub
- Navigate to lobby
- Find "Tic Tac Toe" card
- Click to launch

### 2. Multiplayer Test
- Open two browser windows
- Login as different users
- User 1: Create challenge
- User 2: Accept challenge
- Verify both see game board
- Make moves from each side
- Verify real-time updates

### 3. Disconnect/Reconnect
- Start game
- Refresh browser (should reconnect)
- Close tab for 10 seconds, reopen
- Verify grace period handling
- Wait 15+ seconds
- Opponent should see "Claim Win" button

### 4. Series Mode
- Create challenge with "Best of 3"
- Play first game to completion
- Verify scores update
- Board resets for next round
- Play until series complete

### 5. Verify Database
```bash
sudo -u postgres psql -d tictactoe -c "SELECT * FROM games ORDER BY created_at DESC LIMIT 5;"
sudo -u postgres psql -d tictactoe -c "SELECT * FROM player_stats;"
```

## Configuration

Environment variables (set by Activity Hub launcher):
- `SOCKET_PATH`: Unix socket path
- `STATIC_PATH`: Frontend build directory
- `REDIS_HOST`: Redis host
- `REDIS_PORT`: Redis port
- `DB_HOST`: PostgreSQL host
- `DB_PORT`: PostgreSQL port
- `DB_USER`: PostgreSQL user
- `DB_PASS`: PostgreSQL password
- `DB_NAME`: Tic Tac Toe database name (`tictactoe`)
- `IDENTITY_DB_NAME`: Activity Hub database name (`activity_hub`)

## Development Workflow

1. **Write code on Mac** using Claude Code
2. **Commit to Git** on Mac
3. **Push manually** when ready
4. **Pull on Pi** to get changes
5. **Build and test on Pi** (all Go/npm commands run here)

## Project Structure

```
activity-hub-tictactoe/
├── backend/
│   ├── main.go              # Unix socket server
│   ├── models.go            # Game, Move, PlayerStats types
│   ├── handlers.go          # HTTP endpoints
│   ├── game_logic.go        # Win detection, move validation
│   ├── redis.go             # Game state + pub/sub
│   ├── database.go          # PostgreSQL operations
│   ├── go.mod
│   └── go.sum
├── frontend/
│   ├── src/
│   │   ├── index.tsx        # Entry point
│   │   ├── App.tsx          # Auth check & routing
│   │   ├── components/
│   │   │   ├── TicTacToeGame.tsx    # Main game component
│   │   │   └── TicTacToeBoard.tsx   # Board display
│   │   ├── hooks/
│   │   │   └── useGameSocket.ts     # SSE game state hook
│   │   ├── styles/
│   │   │   └── tictactoe-board.css  # ONLY board styling
│   │   └── types/
│   │       └── game.ts      # TypeScript types
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── database/
│   └── schema.sql           # Database initialization
├── MANIFEST.json            # App registration config
└── README.md
```

## Key Differences from pub-games-v3

| Aspect | pub-games-v3 | Activity Hub |
|--------|--------------|--------------|
| **Socket** | TCP port 4001 | Unix socket |
| **Awareness** | Custom port 6001 | Activity Hub service |
| **Frontend SDK** | None | activity-hub-sdk npm |
| **Auth** | activity-hub-common | activity-hub-auth |
| **CSS** | Custom | Shared .ah-* + board CSS |
| **Leaderboard** | External service | None (removed) |

## Troubleshooting

### Backend won't start
- Check logs: `journalctl -u activity-hub -n 50`
- Verify Unix socket path is writable
- Ensure Redis is running: `redis-cli ping`
- Check database connection: `psql -d tictactoe`

### Frontend not loading
- Verify build completed: `ls frontend/build`
- Check static path in MANIFEST.json
- Ensure Activity Hub proxy is working

### SSE disconnects
- Check Redis pub/sub: `redis-cli PSUBSCRIBE *`
- Verify awareness service: `curl http://localhost:3001/api/health`
- Check browser console for errors

### Game state not syncing
- Verify both players connected via SSE
- Check Redis for game state: `redis-cli GET game:{gameId}`
- Monitor backend logs for errors

## License

MIT
