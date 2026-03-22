package main

import (
	"database/sql"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"

	auth "github.com/achgithub/activity-hub-auth"
	"github.com/go-redis/redis/v8"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
)

var (
	db         *sql.DB // Tic Tac Toe database
	identityDB *sql.DB // Activity Hub identity database (for auth)
)

func main() {
	log.Println("🎮 Tic Tac Toe backend starting...")

	// Get environment variables from Activity Hub launcher
	socketPath := os.Getenv("SOCKET_PATH")
	if socketPath == "" {
		log.Fatal("SOCKET_PATH environment variable not set")
	}

	staticPath := os.Getenv("STATIC_PATH")
	if staticPath == "" {
		staticPath = "./static"
	}

	// Initialize Redis (shared instance)
	redisHost := getEnv("REDIS_HOST", "127.0.0.1")
	redisPort := getEnv("REDIS_PORT", "6379")
	redisPassword := getEnv("REDIS_PASSWORD", "")

	redisClient = redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", redisHost, redisPort),
		Password: redisPassword,
		DB:       0,
	})

	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	log.Printf("✅ Connected to Redis at %s:%s", redisHost, redisPort)

	// Initialize Tic Tac Toe database
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPass := getEnv("DB_PASS", "")
	dbName := getEnv("DB_NAME", "tictactoe")

	var err error
	db, err = sql.Open("postgres", fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPass, dbName,
	))
	if err != nil {
		log.Fatalf("Failed to connect to Tic Tac Toe database: %v", err)
	}

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping Tic Tac Toe database: %v", err)
	}
	log.Printf("✅ Connected to Tic Tac Toe database: %s", dbName)

	// Initialize identity database (for auth)
	identityDBName := getEnv("IDENTITY_DB_NAME", "activity_hub")
	identityDB, err = sql.Open("postgres", fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPass, identityDBName,
	))
	if err != nil {
		log.Fatalf("Failed to connect to identity database: %v", err)
	}

	if err := identityDB.Ping(); err != nil {
		log.Fatalf("Failed to ping identity database: %v", err)
	}
	log.Printf("✅ Connected to identity database: %s", identityDBName)

	// Setup router
	r := mux.NewRouter()

	// Public endpoints
	r.HandleFunc("/api/health", handleHealth).Methods("GET")
	r.HandleFunc("/api/config", handleGetConfig).Methods("GET")

	// SSE stream (query param auth for EventSource limitation)
	r.HandleFunc("/api/game/{gameId}/stream", handleGameStream).Methods("GET")

	// Authenticated endpoints (Bearer token required)
	api := r.PathPrefix("/api").Subrouter()
	api.Use(auth.Middleware(identityDB))
	api.HandleFunc("/game", handleCreateGame).Methods("POST")
	api.HandleFunc("/game/{gameId}", handleGetGame).Methods("GET")
	api.HandleFunc("/move", handleMakeMove).Methods("POST")
	api.HandleFunc("/game/{gameId}/forfeit", handleForfeit).Methods("POST")
	api.HandleFunc("/game/{gameId}/claim-win", handleClaimWin).Methods("POST")
	api.HandleFunc("/stats/{userId}", handleGetStats).Methods("GET")

	// Serve static files (built React app)
	r.PathPrefix("/").Handler(http.FileServer(http.Dir(staticPath)))

	// CORS
	corsHandler := handlers.CORS(
		handlers.AllowedOrigins([]string{"*"}),
		handlers.AllowedMethods([]string{"GET", "POST", "OPTIONS"}),
		handlers.AllowedHeaders([]string{"Content-Type", "Authorization"}),
	)

	// Remove stale socket if exists
	if err := os.Remove(socketPath); err != nil && !os.IsNotExist(err) {
		log.Printf("Warning: Failed to remove stale socket: %v", err)
	}

	// Create Unix socket listener
	listener, err := net.Listen("unix", socketPath)
	if err != nil {
		log.Fatalf("Failed to create Unix socket listener: %v", err)
	}
	defer listener.Close()

	// Set socket permissions
	if err := os.Chmod(socketPath, 0777); err != nil {
		log.Printf("Warning: Failed to set socket permissions: %v", err)
	}

	log.Printf("🎮 Tic Tac Toe backend listening on Unix socket: %s", socketPath)
	log.Printf("📁 Serving static files from: %s", staticPath)
	log.Fatal(http.Serve(listener, corsHandler(r)))
}

// getEnv retrieves an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
