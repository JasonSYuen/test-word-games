'use client'

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from 'next/navigation';
import GameNav from '@/app/components/GameNav';
import WordDefinition from '@/app/components/WordDefinition';
import { calculateScore, letterPoints } from '@/app/components/wordValidation';
import { useWordValidation } from '@/app/components/useWordValidation';
import Peer, { DataConnection } from 'peerjs';

// Letter frequency groups
const commonLetters = ['E', 'T', 'A', 'O', 'I', 'N', 'S', 'H', 'R'];
const uncommonLetters = ['D', 'L', 'C', 'U', 'M', 'W', 'F', 'G', 'Y', 'P', 'B'];
const rareLetters = ['V', 'K', 'J', 'X', 'Q', 'Z'];

function getRandomLetter(): string {
  const rand = Math.random();
  if (rand < 0.6) {
    return commonLetters[Math.floor(Math.random() * commonLetters.length)];
  } else if (rand < 0.9) {
    return uncommonLetters[Math.floor(Math.random() * uncommonLetters.length)];
  } else {
    return rareLetters[Math.floor(Math.random() * rareLetters.length)];
  }
}

function generateRandomGrid(): string[][] {
  return Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => getRandomLetter())
  );
}

type GamePhase = 'connecting' | 'waiting' | 'playing' | 'ended';

export default function BlackoutOnlineGame() {
  const params = useParams();
  const searchParams = useSearchParams();
  const gameId = params.gameId as string;
  const isHost = searchParams.get('host') === 'true';

  const [w, setW] = useState('');
  const [grid, setGrid] = useState<string[][]>([]);
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [turnNumber, setTurnNumber] = useState(1);
  const [moveCount, setMoveCount] = useState(0);
  const [submittedWords, setSubmittedWords] = useState<Array<{ word: string, player: 1 | 2, tiles: string[], turnTime: number, isPassed?: boolean }>>([]);
  const [usedTiles, setUsedTiles] = useState<Set<string>>(new Set());
  const [tileOwners, setTileOwners] = useState<Map<string, 1 | 2>>(new Map());

  // Timer state
  const [turnStartTime, setTurnStartTime] = useState<number>(Date.now());
  const [currentTurnTime, setCurrentTurnTime] = useState<number>(0);
  const [player1TotalTime, setPlayer1TotalTime] = useState<number>(0);
  const [player2TotalTime, setPlayer2TotalTime] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [pausedTime, setPausedTime] = useState<number>(0);
  const [player1Turns, setPlayer1Turns] = useState<number>(0);
  const [player2Turns, setPlayer2Turns] = useState<number>(0);
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const maxTurnsPerPlayer = 6;

  // Multiplayer state
  const [gamePhase, setGamePhase] = useState<GamePhase>('connecting');
  const [myPlayerNumber, setMyPlayerNumber] = useState<1 | 2 | null>(null);
  const [shareableLink, setShareableLink] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');

  // Definition popup state
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);

  // WebRTC state
  const peerRef = useRef<Peer | null>(null);
  const connectionRef = useRef<DataConnection | null>(null);

  // Use the custom validation hook
  const { isValid, score: currentScore } = useWordValidation(w);

  // Copy link to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    alert('Link copied! Share it with your opponent.');
  };

  // Initialize PeerJS
  useEffect(() => {
    setShareableLink(window.location.href);

    // Create peer with gameId as the peer ID (for host) or random ID (for guest)
    const peer = isHost ? new Peer(gameId) : new Peer();

    peerRef.current = peer;

    peer.on('open', (id) => {
      console.log('My peer ID:', id);

      if (isHost) {
        setMyPlayerNumber(1);
        setGamePhase('waiting');
        setConnectionStatus('Waiting for opponent to join...');
      } else {
        setMyPlayerNumber(2);
        setConnectionStatus('Connecting to opponent...');

        // Guest connects to host
        const conn = peer.connect(gameId);
        connectionRef.current = conn;

        conn.on('open', () => {
          console.log('Connected to host!');
          setConnectionStatus('Connected! Waiting for game start...');

          // Notify host that guest has joined
          conn.send({ type: 'player-joined' });
        });

        conn.on('data', handlePeerData);

        conn.on('close', () => {
          setConnectionStatus('Connection lost');
        });

        conn.on('error', (err) => {
          console.error('Connection error:', err);
          setConnectionStatus('Connection error');
        });
      }
    });

    // Host listens for incoming connections
    if (isHost) {
      peer.on('connection', (conn) => {
        console.log('Guest connected!');
        connectionRef.current = conn;
        setConnectionStatus('Opponent connected!');

        conn.on('data', handlePeerData);

        conn.on('open', () => {
          // Start the game - host generates the grid
          const newGrid = generateRandomGrid();
          setGrid(newGrid);
          setGamePhase('playing');
          setTurnStartTime(Date.now());

          // Send grid to guest
          conn.send({
            type: 'game-start',
            grid: newGrid
          });
        });

        conn.on('close', () => {
          setConnectionStatus('Opponent disconnected');
        });
      });
    }

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      setConnectionStatus(`Error: ${err.type}`);
    });

    return () => {
      connectionRef.current?.close();
      peer.destroy();
    };
  }, [gameId, isHost]);

  // Handle incoming data from peer
  const handlePeerData = (data: any) => {
    console.log('Received data:', data);

    if (data.type === 'game-start') {
      setGrid(data.grid);
      setGamePhase('playing');
      setTurnStartTime(Date.now());
    } else if (data.type === 'player-move') {
      // Update game state from opponent's move
      setSubmittedWords(prev => [...prev, {
        word: data.word,
        player: data.player,
        tiles: data.selectedTiles,
        turnTime: data.turnTime,
        isPassed: data.isPassed
      }]);
      setUsedTiles(new Set(data.usedTiles));
      setTileOwners(new Map(data.tileOwners));
      setMoveCount(data.moveCount);
      setTurnNumber(data.turnNumber);
      setCurrentPlayer(data.currentPlayer);
      setPlayer1Score(data.player1Score);
      setPlayer2Score(data.player2Score);
      setPlayer1Turns(data.player1Turns);
      setPlayer2Turns(data.player2Turns);
      setPlayer1TotalTime(data.player1TotalTime);
      setPlayer2TotalTime(data.player2TotalTime);

      // Reset for next turn
      setW('');
      setSelectedTiles([]);
      setTurnStartTime(Date.now());
      setCurrentTurnTime(0);

      // Check for game end
      if (data.player1Turns >= maxTurnsPerPlayer && data.player2Turns >= maxTurnsPerPlayer) {
        setGameEnded(true);
        setGamePhase('ended');
      }
    }
  };

  // Send move to opponent
  const sendMove = (moveData: any) => {
    if (connectionRef.current) {
      connectionRef.current.send({
        type: 'player-move',
        ...moveData
      });
    }
  };

  // Update current turn time every 100ms
  useEffect(() => {
    if (isPaused || gameEnded || gamePhase !== 'playing') return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - turnStartTime;
      setCurrentTurnTime(elapsed);

      // Auto-pass after 60 seconds
      if (elapsed >= 60000 && myPlayerNumber === currentPlayer) {
        handlePassTurn();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [turnStartTime, isPaused, gameEnded, gamePhase, myPlayerNumber, currentPlayer]);

  // Format time
  const formatTime = (ms: number): string => {
    return (ms / 1000).toFixed(1) + 's';
  };

  // Submit word
  const handleSubmit = () => {
    if (isValid && myPlayerNumber === currentPlayer) {
      const lengthBonus = w.length;
      const totalScore = currentScore + lengthBonus;
      const turnTime = Date.now() - turnStartTime;

      let newPlayer1Turns = player1Turns;
      let newPlayer2Turns = player2Turns;
      let newPlayer1Score = player1Score;
      let newPlayer2Score = player2Score;
      let newPlayer1TotalTime = player1TotalTime;
      let newPlayer2TotalTime = player2TotalTime;

      if (currentPlayer === 1) {
        newPlayer1Score += totalScore;
        newPlayer1TotalTime += turnTime;
        newPlayer1Turns += 1;
      } else {
        newPlayer2Score += totalScore;
        newPlayer2TotalTime += turnTime;
        newPlayer2Turns += 1;
      }

      const newUsedTiles = new Set([...usedTiles, ...selectedTiles]);
      const newTileOwners = new Map(tileOwners);
      selectedTiles.forEach(tile => {
        newTileOwners.set(tile, currentPlayer);
      });

      const newMoveCount = moveCount + 1;
      const pairIndex = Math.floor(newMoveCount / 2);
      const nextPlayer = pairIndex % 2 === 0
        ? (newMoveCount % 2 === 0 ? 1 : 2)
        : (newMoveCount % 2 === 0 ? 2 : 1);

      // Send to opponent
      sendMove({
        player: currentPlayer,
        word: w.toUpperCase(),
        selectedTiles,
        score: totalScore,
        usedTiles: Array.from(newUsedTiles),
        tileOwners: Array.from(newTileOwners.entries()),
        moveCount: newMoveCount,
        turnNumber: currentPlayer === 2 ? turnNumber + 1 : turnNumber,
        currentPlayer: nextPlayer,
        player1Score: newPlayer1Score,
        player2Score: newPlayer2Score,
        player1Turns: newPlayer1Turns,
        player2Turns: newPlayer2Turns,
        player1TotalTime: newPlayer1TotalTime,
        player2TotalTime: newPlayer2TotalTime,
        turnTime
      });

      // Update local state
      setPlayer1Score(newPlayer1Score);
      setPlayer2Score(newPlayer2Score);
      setPlayer1TotalTime(newPlayer1TotalTime);
      setPlayer2TotalTime(newPlayer2TotalTime);
      setPlayer1Turns(newPlayer1Turns);
      setPlayer2Turns(newPlayer2Turns);
      setSubmittedWords([...submittedWords, { word: w.toUpperCase(), player: currentPlayer, tiles: [...selectedTiles], turnTime }]);
      setUsedTiles(newUsedTiles);
      setTileOwners(newTileOwners);
      setW('');
      setSelectedTiles([]);
      setMoveCount(newMoveCount);
      setCurrentPlayer(nextPlayer);

      if (currentPlayer === 2) {
        setTurnNumber(turnNumber + 1);
      }

      if (newPlayer1Turns >= maxTurnsPerPlayer && newPlayer2Turns >= maxTurnsPerPlayer) {
        setGameEnded(true);
        setGamePhase('ended');
      }

      setTurnStartTime(Date.now());
      setCurrentTurnTime(0);
    }
  };

  // Pass turn
  const handlePassTurn = () => {
    if (myPlayerNumber !== currentPlayer) return;

    const turnTime = Date.now() - turnStartTime;

    let newPlayer1Turns = player1Turns;
    let newPlayer2Turns = player2Turns;
    let newPlayer1TotalTime = player1TotalTime;
    let newPlayer2TotalTime = player2TotalTime;

    if (currentPlayer === 1) {
      newPlayer1TotalTime += turnTime;
      newPlayer1Turns += 1;
    } else {
      newPlayer2TotalTime += turnTime;
      newPlayer2Turns += 1;
    }

    const newMoveCount = moveCount + 1;
    const pairIndex = Math.floor(newMoveCount / 2);
    const nextPlayer = pairIndex % 2 === 0
      ? (newMoveCount % 2 === 0 ? 1 : 2)
      : (newMoveCount % 2 === 0 ? 2 : 1);

    sendMove({
      player: currentPlayer,
      word: 'PASS',
      selectedTiles: [],
      score: 0,
      usedTiles: Array.from(usedTiles),
      tileOwners: Array.from(tileOwners.entries()),
      moveCount: newMoveCount,
      turnNumber: currentPlayer === 2 ? turnNumber + 1 : turnNumber,
      currentPlayer: nextPlayer,
      player1Score,
      player2Score,
      player1Turns: newPlayer1Turns,
      player2Turns: newPlayer2Turns,
      player1TotalTime: newPlayer1TotalTime,
      player2TotalTime: newPlayer2TotalTime,
      turnTime,
      isPassed: true
    });

    setPlayer1TotalTime(newPlayer1TotalTime);
    setPlayer2TotalTime(newPlayer2TotalTime);
    setPlayer1Turns(newPlayer1Turns);
    setPlayer2Turns(newPlayer2Turns);
    setSubmittedWords([...submittedWords, { word: 'PASS', player: currentPlayer, tiles: [], turnTime, isPassed: true }]);
    setW('');
    setSelectedTiles([]);
    setMoveCount(newMoveCount);
    setCurrentPlayer(nextPlayer);

    if (currentPlayer === 2) {
      setTurnNumber(turnNumber + 1);
    }

    if (newPlayer1Turns >= maxTurnsPerPlayer && newPlayer2Turns >= maxTurnsPerPlayer) {
      setGameEnded(true);
      setGamePhase('ended');
    }

    setTurnStartTime(Date.now());
    setCurrentTurnTime(0);
  };

  // Check if two tiles are adjacent
  const areAdjacent = (tile1: string, tile2: string): boolean => {
    const [row1, col1] = tile1.split('-').map(Number);
    const [row2, col2] = tile2.split('-').map(Number);
    const rowDiff = Math.abs(row1 - row2);
    const colDiff = Math.abs(col1 - col2);
    return rowDiff <= 1 && colDiff <= 1 && (rowDiff + colDiff > 0);
  };

  const handleTileClick = (letter: string, rowIndex: number, colIndex: number) => {
    if (isPaused || myPlayerNumber !== currentPlayer) return;

    const tileKey = `${rowIndex}-${colIndex}`;
    if (usedTiles.has(tileKey)) return;
    if (selectedTiles.includes(tileKey)) return;

    if (selectedTiles.length === 0 || areAdjacent(selectedTiles[selectedTiles.length - 1], tileKey)) {
      setW(w + letter);
      setSelectedTiles([...selectedTiles, tileKey]);
    }
  };

  const handleMouseDown = (letter: string, rowIndex: number, colIndex: number) => {
    if (isPaused || myPlayerNumber !== currentPlayer) return;
    setIsDragging(true);
    handleTileClick(letter, rowIndex, colIndex);
  };

  const handleMouseEnter = (letter: string, rowIndex: number, colIndex: number) => {
    if (isDragging && !isPaused && myPlayerNumber === currentPlayer) {
      handleTileClick(letter, rowIndex, colIndex);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClickOutside = () => {
    if (selectedTiles.length > 0) {
      setW('');
      setSelectedTiles([]);
    }
  };

  const winner = player1Score > player2Score ? 1 : player1Score < player2Score ? 2 : 0;
  const timerProgress = gameEnded || isPaused ? 0 : Math.min(currentTurnTime / 60000, 1);

  // Connecting UI
  if (gamePhase === 'connecting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-500">
        <GameNav currentGame="blackout-online" />

        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 md:p-12 max-w-2xl w-full text-center shadow-2xl">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              {connectionStatus}
            </h1>
            <div className="animate-pulse">
              <div className="w-16 h-16 bg-purple-500 rounded-full mx-auto mb-4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Waiting room UI
  if (gamePhase === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-500">
        <GameNav currentGame="blackout-online" />

        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 md:p-12 max-w-2xl w-full text-center shadow-2xl">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Waiting for Opponent...
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              You are Player {myPlayerNumber}
            </p>

            <div className="bg-blue-50 dark:bg-blue-950 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-6 mb-6">
              <p className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Share this link with your opponent:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareableLink}
                  readOnly
                  className="flex-1 px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-6 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 font-semibold"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="animate-pulse">
              <div className="w-16 h-16 bg-purple-500 rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">{connectionStatus}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" onClick={handleClickOutside}>
      <div className="relative z-50">
        <GameNav currentGame="blackout-online" />
      </div>

      {/* Title */}
      {!gameEnded && (
        <div className="text-center pt-16 pb-4 relative" style={{ zIndex: 6 }}>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Blackout Online
            <span className="text-sm ml-3 text-purple-600 dark:text-purple-400">
              You are Player {myPlayerNumber}
            </span>
          </h1>
        </div>
      )}

      {/* Player Scores - Mobile */}
      {!gameEnded && (
        <div className="md:hidden flex justify-around px-4 pb-2 relative" style={{ zIndex: 6 }}>
          <div className={`p-3 rounded-lg shadow flex-1 mr-2 ${myPlayerNumber === 1 ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <p className={`text-sm font-bold ${currentPlayer === 1 ? 'text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
              P1 {myPlayerNumber === 1 && '(You)'} {currentPlayer === 1 && '⭐'}
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{player1Score}</p>
            <p className="text-xs font-mono mt-1 text-gray-600 dark:text-gray-400">Total: {formatTime(player1TotalTime)}</p>
          </div>
          <div className={`p-3 rounded-lg shadow flex-1 ml-2 ${myPlayerNumber === 2 ? 'bg-red-100 dark:bg-red-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <p className={`text-sm font-bold ${currentPlayer === 2 ? 'text-red-600 dark:text-red-300' : 'text-gray-600 dark:text-gray-400'}`}>
              P2 {myPlayerNumber === 2 && '(You)'} {currentPlayer === 2 && '⭐'}
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{player2Score}</p>
            <p className="text-xs font-mono mt-1 text-gray-600 dark:text-gray-400">Total: {formatTime(player2TotalTime)}</p>
          </div>
        </div>
      )}

      {/* Player Scores - Desktop */}
      {!gameEnded && (
        <>
          <div className={`hidden md:block absolute top-20 left-4 p-4 rounded-lg shadow ${myPlayerNumber === 1 ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-800'}`} style={{ zIndex: 6 }}>
            <p className={`text-lg font-bold ${currentPlayer === 1 ? 'text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
              Player 1 {myPlayerNumber === 1 && '(You)'} {currentPlayer === 1 && '⭐'}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{player1Score}</p>
            <p className="text-sm font-mono mt-1 text-gray-600 dark:text-gray-400">Total: {formatTime(player1TotalTime)}</p>
          </div>

          <div className={`hidden md:block absolute top-20 right-4 p-4 rounded-lg shadow ${myPlayerNumber === 2 ? 'bg-red-100 dark:bg-red-900' : 'bg-gray-100 dark:bg-gray-800'}`} style={{ zIndex: 6 }}>
            <p className={`text-lg font-bold ${currentPlayer === 2 ? 'text-red-600 dark:text-red-300' : 'text-gray-600 dark:text-gray-400'}`}>
              Player 2 {myPlayerNumber === 2 && '(You)'} {currentPlayer === 2 && '⭐'}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{player2Score}</p>
            <p className="text-sm font-mono mt-1 text-gray-600 dark:text-gray-400">Total: {formatTime(player2TotalTime)}</p>
          </div>
        </>
      )}

      {/* Game End Panel */}
      {gameEnded && (
        <div className="flex justify-center px-4 pt-16 pb-6 relative" style={{ zIndex: 7 }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 max-w-md w-full text-center shadow-2xl border-4 border-purple-500">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900 dark:text-gray-100">Game Over!</h2>
            {winner === 0 ? (
              <p className="text-xl md:text-2xl mb-4 text-gray-700 dark:text-gray-300">It's a Tie!</p>
            ) : (
              <p className="text-xl md:text-2xl mb-4 text-gray-700 dark:text-gray-300">
                Player {winner} Wins! {winner === myPlayerNumber && '(You!)'}
              </p>
            )}
            <div className="mb-4 space-y-2">
              <p className="text-lg md:text-xl text-gray-900 dark:text-gray-100">
                <span className="font-bold text-blue-600 dark:text-blue-400">Player 1:</span> {player1Score} points
              </p>
              <p className="text-lg md:text-xl text-gray-900 dark:text-gray-100">
                <span className="font-bold text-red-600 dark:text-red-400">Player 2:</span> {player2Score} points
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Turn Info */}
      {!gameEnded && (
        <div className="text-center p-2 relative" style={{ zIndex: 6 }}>
          <div className="mb-3 flex items-center justify-center gap-4 md:gap-8 text-lg md:text-2xl">
            <p className="font-bold text-gray-900 dark:text-gray-100">
              {currentPlayer === myPlayerNumber ? 'Your Turn' : `Player ${currentPlayer}'s Turn`}
            </p>
            <p className="font-semibold text-gray-700 dark:text-gray-300">
              <span className={`font-mono ${currentTurnTime >= 50000 ? 'text-red-600 dark:text-red-400' : ''}`}>
                {formatTime(currentTurnTime)}
              </span>
              {currentTurnTime >= 50000 && currentTurnTime < 60000 && (
                <span className="ml-1 text-sm md:text-base text-red-600 dark:text-red-400">
                  ({Math.ceil((60000 - currentTurnTime) / 1000)}s)
                </span>
              )}
            </p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">Turn {turnNumber}</p>
          </div>

          <p className="text-base md:text-xl text-gray-900 dark:text-gray-100">
            Current Word: <span className="font-bold">{w || '(empty)'}</span>
            {isValid !== null && (
              <span className={`ml-2 md:ml-3 text-sm md:text-lg ${isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isValid ? '✓ Valid' : '✗ Invalid'}
              </span>
            )}
          </p>
          <p className="text-sm md:text-lg font-semibold mt-2 text-gray-800 dark:text-gray-200">
            Word Score: {currentScore} points
            {w.length >= 3 && (
              <span className="text-green-600 dark:text-green-400 ml-2 block md:inline">
                +{w.length} length bonus = {currentScore + w.length} total
              </span>
            )}
          </p>

          <div className="flex gap-2 justify-center mt-3 flex-wrap">
            <button
              onClick={handleSubmit}
              disabled={!isValid || w.length < 3 || isPaused || myPlayerNumber !== currentPlayer}
              className="px-4 md:px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-sm md:text-base"
            >
              Submit Word
            </button>
            <button
              onClick={() => {
                setW('');
                setSelectedTiles([]);
              }}
              disabled={isPaused || myPlayerNumber !== currentPlayer}
              className="px-3 md:px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm md:text-base"
            >
              Clear
            </button>
            <button
              onClick={handlePassTurn}
              disabled={isPaused || myPlayerNumber !== currentPlayer}
              className="px-3 md:px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-sm md:text-base"
            >
              Pass Turn
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="flex items-center justify-center px-2 md:px-0 relative" style={{ zIndex: 6 }} onMouseUp={handleMouseUp}>
        <div className="relative w-full max-w-[500px]" onClick={(e) => e.stopPropagation()}>
          {/* Circular timer */}
          {!gameEnded && !isPaused && timerProgress > 0 && (
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} viewBox="0 0 100 100">
              <path
                d={`M 50 50 L 50 1 A 49 49 0 ${timerProgress > 0.5 ? 1 : 0} 1 ${
                  50 + 49 * Math.sin(timerProgress * 2 * Math.PI)
                } ${
                  50 - 49 * Math.cos(timerProgress * 2 * Math.PI)
                } Z`}
                fill="rgb(168, 85, 247)"
                opacity="0.3"
              />
            </svg>
          )}

          {/* SVG overlay for lines */}
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            {submittedWords.map((wordData, idx) => {
              const color = wordData.player === 1 ? '#3b82f6' : '#ef4444';
              const lines = [];

              for (let i = 0; i < wordData.tiles.length - 1; i++) {
                const [row1, col1] = wordData.tiles[i].split('-').map(Number);
                const [row2, col2] = wordData.tiles[i + 1].split('-').map(Number);

                const containerWidth = typeof window !== 'undefined' ? Math.min(500, window.innerWidth - 16) : 500;
                const gap = 8;
                const tileSize = (containerWidth - 7 * gap - 8) / 8;
                const x1 = col1 * (tileSize + gap) + tileSize / 2 + 4;
                const y1 = row1 * (tileSize + gap) + tileSize / 2 + 4;
                const x2 = col2 * (tileSize + gap) + tileSize / 2 + 4;
                const y2 = row2 * (tileSize + gap) + tileSize / 2 + 4;

                lines.push(
                  <line
                    key={`${idx}-${i}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={color}
                    strokeWidth="3"
                    opacity="0.6"
                  />
                );
              }

              return lines;
            })}
          </svg>

          <div className="grid grid-cols-8 gap-2 p-1 select-none" style={{ position: 'relative', zIndex: 2 }}>
            {grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const tileKey = `${rowIndex}-${colIndex}`;
                const isSelected = selectedTiles.includes(tileKey);
                const isUsed = usedTiles.has(tileKey);
                const owner = tileOwners.get(tileKey);

                return (
                  <div
                    key={tileKey}
                    onMouseDown={() => handleMouseDown(cell, rowIndex, colIndex)}
                    onMouseEnter={() => handleMouseEnter(cell, rowIndex, colIndex)}
                    className={`border border-gray-300 dark:border-gray-600 aspect-square flex flex-col items-center justify-center relative ${isUsed
                        ? owner === 1
                          ? 'bg-blue-600 dark:bg-blue-700 cursor-not-allowed'
                          : 'bg-red-600 dark:bg-red-700 cursor-not-allowed'
                        : isSelected
                          ? 'bg-green-400 dark:bg-green-500 text-white cursor-pointer'
                          : myPlayerNumber === currentPlayer
                            ? 'bg-white dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900 active:bg-blue-200 dark:active:bg-blue-800 cursor-pointer text-gray-900 dark:text-gray-100'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 cursor-not-allowed opacity-70'
                      }`}
                  >
                    <span className={`text-xl md:text-2xl font-bold ${isUsed
                        ? owner === 1
                          ? 'text-blue-200 opacity-40'
                          : 'text-red-200 opacity-40'
                        : ''
                      }`}>{cell}</span>
                    <span className={`text-[10px] md:text-xs absolute bottom-0.5 md:bottom-1 right-0.5 md:right-1 ${isUsed
                        ? owner === 1
                          ? 'text-blue-200 opacity-40'
                          : 'text-red-200 opacity-40'
                        : ''
                      }`}>
                      {letterPoints[cell]}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Records section */}
      <div className="mt-6 pb-20 text-center relative" style={{ zIndex: 20 }}>
        <p className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-200">Records:</p>
        <div id="records-container" className="flex flex-wrap gap-2 justify-center items-start px-4 py-2">
          {submittedWords.map((item, idx) => {
            const baseScore = item.isPassed ? 0 : calculateScore(item.word);
            const lengthBonus = item.isPassed ? 0 : item.word.length;
            const totalScore = baseScore + lengthBonus;

            return (
              <div key={idx} className="relative">
                <span
                  onClick={() => !item.isPassed && setSelectedWordIndex(selectedWordIndex === idx ? null : idx)}
                  style={{ height: '32px', display: 'inline-flex', alignItems: 'center' }}
                  className={`px-3 py-1 rounded text-sm border-2 ${!item.isPassed ? 'cursor-pointer hover:opacity-80' : ''} ${item.isPassed
                      ? item.player === 1
                        ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-600 text-gray-700 dark:text-gray-400 italic'
                        : 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-600 text-gray-700 dark:text-gray-400 italic'
                      : item.player === 1
                        ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 dark:border-blue-400 text-gray-900 dark:text-gray-100'
                        : 'bg-red-100 dark:bg-red-900 border-red-500 dark:border-red-400 text-gray-900 dark:text-gray-100'
                    }`}
                >
                  {item.isPassed ? (
                    <>PASS <span className="font-mono text-xs opacity-75">{formatTime(item.turnTime)}</span></>
                  ) : (
                    <>{item.word} ({totalScore}) <span className="font-mono text-xs opacity-75">{formatTime(item.turnTime)}</span></>
                  )}
                </span>

                {!item.isPassed && selectedWordIndex === idx && (
                  <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 w-64 sm:w-80 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-3 z-50">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-lg text-gray-900 dark:text-gray-100">{item.word}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWordIndex(null);
                        }}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl leading-none"
                      >
                        ×
                      </button>
                    </div>
                    <WordDefinition word={item.word} showAllMeanings={false} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
