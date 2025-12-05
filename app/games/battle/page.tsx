'use client'

import { useState, useEffect } from "react";
import Link from 'next/link';
import GameNav from '@/app/components/GameNav';
import { calculateScore, letterPoints } from '@/app/components/wordValidation';
import { useWordValidation } from '@/app/components/useWordValidation';

// Letter frequency groups based on English usage
const commonLetters = ['E', 'T', 'A', 'O', 'I', 'N', 'S', 'H', 'R'];  // ~60% chance
const uncommonLetters = ['D', 'L', 'C', 'U', 'M', 'W', 'F', 'G', 'Y', 'P', 'B']; // ~30% chance
const rareLetters = ['V', 'K', 'J', 'X', 'Q', 'Z']; // ~10% chance

// Generate random letter with weighted probability
function getRandomLetter(): string {
  const rand = Math.random();

  if (rand < 0.6) {
    // 60% chance - common letters
    return commonLetters[Math.floor(Math.random() * commonLetters.length)];
  } else if (rand < 0.9) {
    // 30% chance - uncommon letters
    return uncommonLetters[Math.floor(Math.random() * uncommonLetters.length)];
  } else {
    // 10% chance - rare letters
    return rareLetters[Math.floor(Math.random() * rareLetters.length)];
  }
}

// Generate 8x8 grid with random letters
function generateRandomGrid(): string[][] {
  return Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => getRandomLetter())
  );
}

export default function SecondPage() {
  const [w, setW] = useState('');
  const [grid, setGrid] = useState<string[][]>([]);
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [player1Health, setPlayer1Health] = useState(20);
  const [player2Health, setPlayer2Health] = useState(20);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [turnNumber, setTurnNumber] = useState(1);
  const [submittedWords, setSubmittedWords] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<1 | 2 | null>(null);

  // Use the custom validation hook
  const { isValid, score: currentDamage } = useWordValidation(w);

  // Generate grid only on client side to avoid hydration mismatch
  useEffect(() => {
    setGrid(generateRandomGrid());
  }, []);

  // Check for game over
  useEffect(() => {
    if (player1Health <= 0) {
      setGameOver(true);
      setWinner(2);
    } else if (player2Health <= 0) {
      setGameOver(true);
      setWinner(1);
    }
  }, [player1Health, player2Health]);

  // Restart game
  const restartGame = () => {
    setPlayer1Health(20);
    setPlayer2Health(20);
    setCurrentPlayer(1);
    setTurnNumber(1);
    setW('');
    setSelectedTiles([]);
    setSubmittedWords([]);
    setGameOver(false);
    setWinner(null);
    setGrid(generateRandomGrid());
  };

  // Drop tiles and refill grid
  const dropTiles = (tilesToRemove: string[]) => {
    const newGrid = grid.map(row => [...row]);

    // Get columns that need to be processed
    const columnsToProcess = new Set<number>();
    tilesToRemove.forEach(tile => {
      const [, col] = tile.split('-').map(Number);
      columnsToProcess.add(col);
    });

    // For each column, drop tiles and add new ones at the top
    columnsToProcess.forEach(col => {
      // Get all tiles to remove in this column
      const rowsToRemove = tilesToRemove
        .filter(tile => {
          const [, c] = tile.split('-').map(Number);
          return c === col;
        })
        .map(tile => {
          const [r] = tile.split('-').map(Number);
          return r;
        })
        .sort((a, b) => a - b); // Sort from top to bottom

      // Remove tiles and shift down
      rowsToRemove.forEach(() => {
        // Remove tiles at specified positions and shift everything down
        for (let row = 7; row >= 0; row--) {
          if (rowsToRemove.includes(row)) {
            // Shift all tiles above this position down
            for (let r = row; r > 0; r--) {
              newGrid[r][col] = newGrid[r - 1][col];
            }
            // Add new tile at top
            newGrid[0][col] = getRandomLetter();
          }
        }
      });
    });

    setGrid(newGrid);
  };

  // Submit word and deal damage to opponent
  const handleSubmit = () => {
    if (isValid && w.length >= 3) {
      // Deal damage to opponent
      if (currentPlayer === 1) {
        setPlayer2Health(Math.max(0, player2Health - currentDamage));
      } else {
        setPlayer1Health(Math.max(0, player1Health - currentDamage));
      }

      setSubmittedWords([...submittedWords, w.toUpperCase()]);
      // Drop tiles and refill
      dropTiles(selectedTiles);
      setW('');
      setSelectedTiles([]);

      // Switch to next player
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
      if (currentPlayer === 2) {
        setTurnNumber(turnNumber + 1);
      }
    }
  };

  // Check if two tiles are adjacent (within 8 surrounding tiles)
  const areAdjacent = (tile1: string, tile2: string): boolean => {
    const [row1, col1] = tile1.split('-').map(Number);
    const [row2, col2] = tile2.split('-').map(Number);
    const rowDiff = Math.abs(row1 - row2);
    const colDiff = Math.abs(col1 - col2);
    return rowDiff <= 1 && colDiff <= 1 && (rowDiff + colDiff > 0);
  };

  const handleTileClick = (letter: string, rowIndex: number, colIndex: number) => {
    const tileKey = `${rowIndex}-${colIndex}`;

    // If already selected, ignore
    if (selectedTiles.includes(tileKey)) return;

    // Check if adjacent to last selected tile (or first tile)
    if (selectedTiles.length === 0 || areAdjacent(selectedTiles[selectedTiles.length - 1], tileKey)) {
      setW(w + letter);
      setSelectedTiles([...selectedTiles, tileKey]);
    }
  };

  const handleMouseDown = (letter: string, rowIndex: number, colIndex: number) => {
    setIsDragging(true);
    handleTileClick(letter, rowIndex, colIndex);
  };

  const handleMouseEnter = (letter: string, rowIndex: number, colIndex: number) => {
    if (isDragging) {
      handleTileClick(letter, rowIndex, colIndex);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div>
      {/* Game Over Modal */}
      {gameOver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md text-center shadow-2xl">
            <h2 className="text-4xl font-bold mb-4">Game Over!</h2>
            <p className="text-2xl mb-6">
              <span className={winner === 1 ? 'text-blue-600' : 'text-red-600'}>
                Player {winner} Wins!
              </span>
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={restartGame}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold text-lg"
              >
                Restart Game
              </button>
              <Link
                href="/"
                className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-semibold text-lg"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      )}

      <GameNav currentGame="battle" />

      <div className="text-center p-4 pt-20">
        <div className="mb-4">
          <p className="text-xl font-semibold">Turn: {turnNumber}</p>
          <p className="text-2xl font-bold mt-2">
            {currentPlayer === 1 ? "Player 1's Turn" : "Player 2's Turn"}
          </p>
        </div>

        <p className="text-xl">
          Current Word: <span className="font-bold">{w || '(empty)'}</span>
          {isValid !== null && (
            <span className={`ml-3 text-lg ${isValid ? 'text-green-600' : 'text-red-600'}`}>
              {isValid ? '✓ Valid' : '✗ Invalid'}
            </span>
          )}
        </p>
        <p className="text-lg font-semibold mt-2">
          Damage: {currentDamage}
        </p>

        <div className="flex gap-2 justify-center mt-3">
          <button
            onClick={handleSubmit}
            disabled={!isValid || w.length < 3 || gameOver}
            className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
          >
            Attack!
          </button>
          <button
            onClick={() => {
              setW('');
              setSelectedTiles([]);
            }}
            disabled={gameOver}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Clear
          </button>
          <button
            onClick={restartGame}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-semibold"
          >
            Restart
          </button>
        </div>

        {submittedWords.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold mb-2">Submitted Words:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {submittedWords.map((word, idx) => (
                <span key={idx} className="px-3 py-1 bg-blue-100 rounded text-sm">
                  {word} ({calculateScore(word)})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center justify-center gap-4" onMouseUp={handleMouseUp}>
        {/* Player health bars above grid */}
        <div className="flex gap-4 w-[500px] justify-between px-8">
          {/* Player 1 - Blue */}
          <div className="w-32">
            <div className={`w-32 h-32 bg-blue-500 rounded-lg shadow-lg flex items-center justify-center ${
              currentPlayer === 1 ? 'ring-4 ring-yellow-400' : ''
            }`}>
              <span className="text-white font-bold text-2xl">{player1Health}</span>
            </div>
            <div className="mt-2 w-full bg-gray-300 h-4 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${(player1Health / 20) * 100}%` }}
              ></div>
            </div>
            <p className="text-center mt-1 font-semibold text-sm">Player 1</p>
          </div>

          {/* Player 2 - Red */}
          <div className="w-32">
            <div className={`w-32 h-32 bg-red-500 rounded-lg shadow-lg flex items-center justify-center ${
              currentPlayer === 2 ? 'ring-4 ring-yellow-400' : ''
            }`}>
              <span className="text-white font-bold text-2xl">{player2Health}</span>
            </div>
            <div className="mt-2 w-full bg-gray-300 h-4 rounded-full overflow-hidden">
              <div
                className="bg-red-600 h-full transition-all duration-300"
                style={{ width: `${(player2Health / 20) * 100}%` }}
              ></div>
            </div>
            <p className="text-center mt-1 font-semibold text-sm">Player 2</p>
          </div>
        </div>

        <div className="grid grid-cols-8 gap-2 p-1 w-[500px] select-none">
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const tileKey = `${rowIndex}-${colIndex}`;
              const isSelected = selectedTiles.includes(tileKey);

              return (
                <div
                  key={tileKey}
                  onMouseDown={() => handleMouseDown(cell, rowIndex, colIndex)}
                  onMouseEnter={() => handleMouseEnter(cell, rowIndex, colIndex)}
                  className={`border aspect-square flex flex-col items-center justify-center relative cursor-pointer transition-all duration-500 ${isSelected
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-blue-100 active:bg-blue-200'
                    }`}
                >
                  <span className="text-2xl font-bold">{cell}</span>
                  <span className="text-xs absolute bottom-1 right-1">
                    {letterPoints[cell]}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
