'use client'

import { useState, useEffect } from "react";
import Link from 'next/link';
import GameNav from '@/app/components/GameNav';
import { calculateScore, letterPoints, isValidWord } from '@/app/components/wordValidation';
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

// Generate array of 25 random letters
function generateDeck(): string[] {
  return Array.from({ length: 25 }, () => getRandomLetter());
}

// Extract all horizontal words from the grid
function getHorizontalWords(grid: string[][]): Array<{word: string, row: number, startCol: number, endCol: number}> {
  const words: Array<{word: string, row: number, startCol: number, endCol: number}> = [];

  for (let row = 0; row < 5; row++) {
    let currentWord = '';
    let startCol = 0;

    for (let col = 0; col < 5; col++) {
      if (grid[row][col] !== '') {
        if (currentWord === '') {
          startCol = col;
        }
        currentWord += grid[row][col];
      } else {
        if (currentWord.length >= 2) {
          words.push({ word: currentWord, row, startCol, endCol: col - 1 });
        }
        currentWord = '';
      }
    }

    // Check for word at end of row
    if (currentWord.length >= 2) {
      words.push({ word: currentWord, row, startCol, endCol: 4 });
    }
  }

  return words;
}

// Extract all vertical words from the grid
function getVerticalWords(grid: string[][]): Array<{word: string, col: number, startRow: number, endRow: number}> {
  const words: Array<{word: string, col: number, startRow: number, endRow: number}> = [];

  for (let col = 0; col < 5; col++) {
    let currentWord = '';
    let startRow = 0;

    for (let row = 0; row < 5; row++) {
      if (grid[row][col] !== '') {
        if (currentWord === '') {
          startRow = row;
        }
        currentWord += grid[row][col];
      } else {
        if (currentWord.length >= 2) {
          words.push({ word: currentWord, col, startRow, endRow: row - 1 });
        }
        currentWord = '';
      }
    }

    // Check for word at end of column
    if (currentWord.length >= 2) {
      words.push({ word: currentWord, col, startRow, endRow: 4 });
    }
  }

  return words;
}

// Check if a letter at position (row, col) is part of a valid word
function isLetterPartOfWord(grid: string[][], row: number, col: number, horizontalWords: any[], verticalWords: any[]): boolean {
  // Check if this position is part of any horizontal word
  const inHorizontalWord = horizontalWords.some(w =>
    w.row === row && col >= w.startCol && col <= w.endCol
  );

  // Check if this position is part of any vertical word
  const inVerticalWord = verticalWords.some(w =>
    w.col === col && row >= w.startRow && row <= w.endRow
  );

  return inHorizontalWord || inVerticalWord;
}

// Validate all words in the grid
function validateGrid(grid: string[][]): { isValid: boolean, invalidWords: string[], totalScore: number, validWords: string[] } {
  const horizontalWords = getHorizontalWords(grid);
  const verticalWords = getVerticalWords(grid);
  const allWords = [...horizontalWords.map(w => w.word), ...verticalWords.map(w => w.word)];

  // Filter out words that are invalid (2+ letters but not in dictionary)
  // Use minLength of 2 for Word Cross to allow 2-letter words
  const invalidWords = allWords.filter(word => word.length >= 2 && !isValidWord(word, 2));
  const validWords = allWords.filter(word => word.length >= 2 && isValidWord(word, 2));

  // Check for isolated single letters (not part of any 2+ letter word)
  const isolatedLetters: string[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (grid[row][col] !== '' && !isLetterPartOfWord(grid, row, col, horizontalWords, verticalWords)) {
        isolatedLetters.push(grid[row][col]);
      }
    }
  }

  // Calculate total score from all letters in the grid
  let totalScore = 0;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (grid[row][col] !== '') {
        totalScore += letterPoints[grid[row][col]] || 0;
      }
    }
  }

  return {
    isValid: invalidWords.length === 0 && isolatedLetters.length === 0 && allWords.length > 0,
    invalidWords: [...invalidWords, ...isolatedLetters.map(letter => `[${letter}]`)], // Wrap isolated letters in brackets
    totalScore,
    validWords
  };
}

export default function WordCrossPage() {
  const [deck, setDeck] = useState<string[]>([]);
  const [grid, setGrid] = useState<string[][]>(Array(5).fill(null).map(() => Array(5).fill('')));
  const [bench, setBench] = useState<string[]>(Array(10).fill(''));
  const [usedDeckIndices, setUsedDeckIndices] = useState<Set<number>>(new Set());
  const [draggedFrom, setDraggedFrom] = useState<{type: 'deck' | 'grid' | 'bench', deckIndex?: number, gridPos?: {row: number, col: number}, benchIndex?: number} | null>(null);
  // Map grid position to deck index to track which deck card is where
  const [gridToDeck, setGridToDeck] = useState<Map<string, number>>(new Map());
  // Map bench position to deck index
  const [benchToDeck, setBenchToDeck] = useState<Map<number, number>>(new Map());
  const [submittedWords, setSubmittedWords] = useState<string[]>([]);
  const [gridValidation, setGridValidation] = useState<{ isValid: boolean, invalidWords: string[], totalScore: number, validWords: string[] }>({
    isValid: true,
    invalidWords: [],
    totalScore: 0,
    validWords: []
  });

  // Generate deck only on client side to avoid hydration mismatch
  useEffect(() => {
    setDeck(generateDeck());
  }, []);

  // Validate grid whenever it changes
  useEffect(() => {
    const validation = validateGrid(grid);
    setGridValidation(validation);
  }, [grid]);

  // Move letter from deck to grid
  const moveDeckToGrid = (deckIndex: number, row: number, col: number) => {
    // Check if this deck card has already been used
    if (usedDeckIndices.has(deckIndex)) return;

    const newGrid = grid.map(r => [...r]);
    const newUsedIndices = new Set(usedDeckIndices);
    const newGridMapping = new Map(gridToDeck);

    // If grid position is occupied, free up that tile's deck card
    if (grid[row][col] !== '') {
      const oldDeckIndex = gridToDeck.get(`${row}-${col}`);
      if (oldDeckIndex !== undefined) {
        newUsedIndices.delete(oldDeckIndex);
        newGridMapping.delete(`${row}-${col}`);
      }
    }

    // Place new tile
    newGrid[row][col] = deck[deckIndex];
    newUsedIndices.add(deckIndex);
    newGridMapping.set(`${row}-${col}`, deckIndex);

    // Update all state
    setGrid(newGrid);
    setUsedDeckIndices(newUsedIndices);
    setGridToDeck(newGridMapping);
  };

  // Move letter from deck to bench
  const moveDeckToBench = (deckIndex: number, benchIndex: number) => {
    // Check if this deck card has already been used
    if (usedDeckIndices.has(deckIndex)) return;

    const newBench = [...bench];
    const newUsedIndices = new Set(usedDeckIndices);
    const newBenchMapping = new Map(benchToDeck);

    // If bench position is occupied, free up that tile's deck card
    if (bench[benchIndex] !== '') {
      const oldDeckIndex = benchToDeck.get(benchIndex);
      if (oldDeckIndex !== undefined) {
        newUsedIndices.delete(oldDeckIndex);
        newBenchMapping.delete(benchIndex);
      }
    }

    // Place new tile
    newBench[benchIndex] = deck[deckIndex];
    newUsedIndices.add(deckIndex);
    newBenchMapping.set(benchIndex, deckIndex);

    // Update all state
    setBench(newBench);
    setUsedDeckIndices(newUsedIndices);
    setBenchToDeck(newBenchMapping);
  };

  // Move letter from bench to grid
  const moveBenchToGrid = (benchIndex: number, row: number, col: number) => {
    if (bench[benchIndex] === '') return;

    const newGrid = grid.map(r => [...r]);
    const newBench = [...bench];
    const newUsedIndices = new Set(usedDeckIndices);
    const newGridMapping = new Map(gridToDeck);
    const newBenchMapping = new Map(benchToDeck);

    // Get the deck index from bench
    const movingDeckIndex = benchToDeck.get(benchIndex);

    // If grid position is occupied, free up that tile's deck card
    if (grid[row][col] !== '') {
      const oldDeckIndex = gridToDeck.get(`${row}-${col}`);
      if (oldDeckIndex !== undefined) {
        newUsedIndices.delete(oldDeckIndex);
        newGridMapping.delete(`${row}-${col}`);
      }
    }

    // Move tile from bench to grid
    newGrid[row][col] = bench[benchIndex];
    newBench[benchIndex] = '';

    // Update mappings
    newBenchMapping.delete(benchIndex);
    if (movingDeckIndex !== undefined) {
      newGridMapping.set(`${row}-${col}`, movingDeckIndex);
    }

    // Update all state
    setGrid(newGrid);
    setBench(newBench);
    setUsedDeckIndices(newUsedIndices);
    setGridToDeck(newGridMapping);
    setBenchToDeck(newBenchMapping);
  };

  // Remove letter from bench (send back to deck)
  const removeFromBench = (benchIndex: number) => {
    if (bench[benchIndex] === '') return;

    // Find which deck card this was
    const deckIndex = benchToDeck.get(benchIndex);

    const newBench = [...bench];
    newBench[benchIndex] = '';
    setBench(newBench);

    // Ungray the deck card
    if (deckIndex !== undefined) {
      const newUsedIndices = new Set(usedDeckIndices);
      newUsedIndices.delete(deckIndex);
      setUsedDeckIndices(newUsedIndices);

      // Remove mapping
      const newMapping = new Map(benchToDeck);
      newMapping.delete(benchIndex);
      setBenchToDeck(newMapping);
    }
  };

  // Move letter from one grid position to another
  const shiftGridLetter = (fromRow: number, fromCol: number, toRow: number, toCol: number) => {
    if (grid[fromRow][fromCol] === '') return; // No letter to move

    const newGrid = grid.map(r => [...r]);
    const letter = newGrid[fromRow][fromCol];
    const newMapping = new Map(gridToDeck);

    // If target position is empty, just move it there
    if (newGrid[toRow][toCol] === '') {
      newGrid[toRow][toCol] = letter;
      newGrid[fromRow][fromCol] = '';

      // Update mapping
      const deckIndex = gridToDeck.get(`${fromRow}-${fromCol}`);
      if (deckIndex !== undefined) {
        newMapping.delete(`${fromRow}-${fromCol}`);
        newMapping.set(`${toRow}-${toCol}`, deckIndex);
      }
    } else {
      // Swap with existing letter
      const targetLetter = newGrid[toRow][toCol];
      newGrid[toRow][toCol] = letter;
      newGrid[fromRow][fromCol] = targetLetter;

      // Update mapping - swap the deck indices
      const fromDeckIndex = gridToDeck.get(`${fromRow}-${fromCol}`);
      const toDeckIndex = gridToDeck.get(`${toRow}-${toCol}`);
      if (fromDeckIndex !== undefined) {
        newMapping.set(`${toRow}-${toCol}`, fromDeckIndex);
      }
      if (toDeckIndex !== undefined) {
        newMapping.set(`${fromRow}-${fromCol}`, toDeckIndex);
      }
    }

    setGrid(newGrid);
    setGridToDeck(newMapping);
  };

  // Remove letter from grid (send back to available pool)
  const removeFromGrid = (row: number, col: number) => {
    if (grid[row][col] === '') return;

    // Find which deck card this was
    const deckIndex = gridToDeck.get(`${row}-${col}`);

    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = '';
    setGrid(newGrid);

    // Ungray the deck card
    if (deckIndex !== undefined) {
      const newUsedIndices = new Set(usedDeckIndices);
      newUsedIndices.delete(deckIndex);
      setUsedDeckIndices(newUsedIndices);

      // Remove mapping
      const newMapping = new Map(gridToDeck);
      newMapping.delete(`${row}-${col}`);
      setGridToDeck(newMapping);
    }
  };

  // Refresh deck - re-randomize unused cards
  const refreshDeck = () => {
    const newDeck = [...deck];
    for (let i = 0; i < newDeck.length; i++) {
      // Only re-randomize cards that aren't in use
      if (!usedDeckIndices.has(i)) {
        newDeck[i] = getRandomLetter();
      }
    }
    setDeck(newDeck);
  };

  // Drag and drop handlers (desktop)
  const handleDragStart = (type: 'deck' | 'grid' | 'bench', deckIndex?: number, row?: number, col?: number, benchIndex?: number) => {
    if (type === 'deck' && deckIndex !== undefined) {
      setDraggedFrom({ type: 'deck', deckIndex });
    } else if (type === 'grid' && row !== undefined && col !== undefined) {
      setDraggedFrom({ type: 'grid', gridPos: { row, col } });
    } else if (type === 'bench' && benchIndex !== undefined) {
      setDraggedFrom({ type: 'bench', benchIndex });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };

  const handleDropOnGrid = (targetRow: number, targetCol: number) => {
    if (!draggedFrom) return;

    if (draggedFrom.type === 'deck' && draggedFrom.deckIndex !== undefined) {
      // Dragging from deck to grid
      moveDeckToGrid(draggedFrom.deckIndex, targetRow, targetCol);
    } else if (draggedFrom.type === 'grid' && draggedFrom.gridPos) {
      // Dragging within grid
      shiftGridLetter(draggedFrom.gridPos.row, draggedFrom.gridPos.col, targetRow, targetCol);
    } else if (draggedFrom.type === 'bench' && draggedFrom.benchIndex !== undefined) {
      // Dragging from bench to grid
      moveBenchToGrid(draggedFrom.benchIndex, targetRow, targetCol);
    }

    setDraggedFrom(null);
  };

  const handleDropOnBench = (targetIndex: number) => {
    if (!draggedFrom) return;

    if (draggedFrom.type === 'deck' && draggedFrom.deckIndex !== undefined) {
      // Dragging from deck to bench
      moveDeckToBench(draggedFrom.deckIndex, targetIndex);
    }

    setDraggedFrom(null);
  };

  // Touch handlers (mobile)
  const handleTouchStart = (type: 'deck' | 'grid' | 'bench', deckIndex?: number, row?: number, col?: number, benchIndex?: number) => {
    if (type === 'deck' && deckIndex !== undefined && !usedDeckIndices.has(deckIndex)) {
      setDraggedFrom({ type: 'deck', deckIndex });
    } else if (type === 'grid' && row !== undefined && col !== undefined && grid[row][col] !== '') {
      setDraggedFrom({ type: 'grid', gridPos: { row, col } });
    } else if (type === 'bench' && benchIndex !== undefined && bench[benchIndex] !== '') {
      setDraggedFrom({ type: 'bench', benchIndex });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Note: preventDefault is handled via touch-action CSS instead
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!draggedFrom) return;

    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);

    if (element) {
      // Check for grid cell
      const gridRow = element.getAttribute('data-grid-row');
      const gridCol = element.getAttribute('data-grid-col');
      if (gridRow !== null && gridCol !== null) {
        handleDropOnGrid(parseInt(gridRow), parseInt(gridCol));
        return;
      }

      // Check for bench slot
      const benchIndex = element.getAttribute('data-bench-index');
      if (benchIndex !== null) {
        handleDropOnBench(parseInt(benchIndex));
        return;
      }
    }

    setDraggedFrom(null);
  };

  return (
    <div className="min-h-screen p-8">
      <GameNav currentGame="wordcross" />

      <div className="text-center pt-20">
        <h1 className="text-4xl font-bold mb-8">Word Cross</h1>

        {/* Grid Validation Status */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-4 mb-2">
            <p className="text-xl font-semibold">
              Grid Status:
              <span className={`ml-2 ${gridValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                {gridValidation.isValid ? '✓ All Valid' : '✗ Invalid Words'}
              </span>
            </p>
          </div>
          <p className="text-2xl font-bold text-purple-600">
            Total Score: {gridValidation.totalScore} points
          </p>

          {/* Valid Words */}
          {gridValidation.validWords.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-green-600 font-semibold">Valid words in grid:</p>
              <div className="flex flex-wrap gap-2 justify-center mt-1">
                {gridValidation.validWords.map((word, idx) => (
                  <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                    {word.toUpperCase()} ({calculateScore(word)})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Invalid Words */}
          {gridValidation.invalidWords.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-red-600 font-semibold">Invalid words:</p>
              <div className="flex flex-wrap gap-2 justify-center mt-1">
                {gridValidation.invalidWords.map((word, idx) => (
                  <span key={idx} className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm">
                    {word.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submitted Words History */}
        {submittedWords.length > 0 && (
          <div className="mb-6">
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

        {/* Grid and Bench Layout */}
        <div className="mb-12 flex justify-center gap-8 items-start">
          {/* Bench - 2x5 on the left */}
          <div>
            <p className="text-lg font-semibold mb-3 text-center">Bench</p>
            <div className="grid grid-cols-2 gap-2">
              {bench.map((letter, index) => (
                <div
                  key={index}
                  data-bench-index={index}
                  draggable={letter !== ''}
                  onDragStart={() => handleDragStart('bench', undefined, undefined, undefined, index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDropOnBench(index)}
                  onTouchStart={() => handleTouchStart('bench', undefined, undefined, undefined, index)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onClick={() => {
                    // Click to remove
                    if (letter !== '') {
                      removeFromBench(index);
                    }
                  }}
                  className={`w-14 h-14 rounded border-2 flex flex-col items-center justify-center relative touch-none ${
                    letter === ''
                      ? 'bg-gray-100 border-gray-400 border-dashed'
                      : 'bg-white border-green-400 cursor-move hover:shadow-lg hover:scale-105 transition-all'
                  }`}
                >
                  <span className="text-2xl font-bold text-gray-800">{letter}</span>
                  {letter && (
                    <span className="text-xs absolute bottom-1 right-1 text-gray-600">
                      {letterPoints[letter]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 5x5 Grid */}
          <div>
            <p className="text-lg font-semibold mb-3 text-center">Grid</p>
            <div className="grid grid-cols-5 gap-2">
              {grid.map((row, rowIndex) =>
                row.map((letter, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    data-grid-row={rowIndex}
                    data-grid-col={colIndex}
                    draggable={letter !== ''}
                    onDragStart={() => handleDragStart('grid', undefined, rowIndex, colIndex)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDropOnGrid(rowIndex, colIndex)}
                    onTouchStart={() => handleTouchStart('grid', undefined, rowIndex, colIndex)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => {
                      // Click to remove
                      if (letter !== '') {
                        removeFromGrid(rowIndex, colIndex);
                      }
                    }}
                    className={`w-16 h-16 rounded border-2 flex flex-col items-center justify-center relative touch-none ${
                      letter === ''
                        ? 'bg-gray-100 border-gray-400 border-dashed'
                        : 'bg-white border-blue-400 cursor-move hover:shadow-lg hover:scale-105 transition-all'
                    }`}
                  >
                    <span className="text-2xl font-bold text-gray-800">{letter}</span>
                    {letter && (
                      <span className="text-xs absolute bottom-1 right-1 text-gray-600">
                        {letterPoints[letter]}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Deck - 25 letter cards */}
        <div>
          <p className="text-lg font-semibold mb-3">Your Deck (drag to grid or bench)</p>
          <div className="flex flex-wrap gap-3 justify-center items-center max-w-4xl mx-auto">
            {deck.map((letter, index) => {
              const isUsed = usedDeckIndices.has(index);
              return (
                <div
                  key={index}
                  draggable={!isUsed}
                  onDragStart={() => handleDragStart('deck', index)}
                  onTouchStart={() => handleTouchStart('deck', index)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className={`w-16 h-24 rounded-lg shadow-lg flex flex-col items-center justify-center relative border-2 transition-all touch-none ${
                    isUsed
                      ? 'bg-gray-300 border-gray-400 opacity-50 cursor-not-allowed'
                      : 'bg-white border-gray-300 cursor-move hover:shadow-xl hover:scale-105'
                  }`}
                >
                  <span className="text-3xl font-bold text-gray-800">{letter}</span>
                  <span className="text-xs absolute bottom-1 right-1 text-gray-600">
                    {letterPoints[letter]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-4 justify-center mt-8">
          <button
            onClick={refreshDeck}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold"
          >
            Refresh Deck
          </button>
          <button
            onClick={() => {
              setDeck(generateDeck());
              setGrid(Array(5).fill(null).map(() => Array(5).fill('')));
              setBench(Array(10).fill(''));
              setUsedDeckIndices(new Set());
              setGridToDeck(new Map());
              setBenchToDeck(new Map());
              setSubmittedWords([]);
            }}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
          >
            New Game
          </button>
        </div>
      </div>
    </div>
  );
}
