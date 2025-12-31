'use client'

import { useState, useEffect } from "react";
import GameNav from '@/app/components/GameNav';
import { useWordValidation } from '@/app/components/useWordValidation';

// All letters (consonants and vowels) - for drafting
const commonLetters = ['E', 'T', 'A', 'O', 'I', 'N', 'S', 'H', 'R'];  // ~60% chance, 1 coin
const uncommonLetters = ['D', 'L', 'C', 'U', 'M', 'W', 'F', 'G', 'Y', 'P', 'B']; // ~30% chance, 2 coins
const rareLetters = ['V', 'K', 'J', 'X', 'Q', 'Z']; // ~10% chance, 3 coins

interface LetterCard {
  letter: string;
  coinValue: number; // 1-3 based on rarity
}

// Get coin value based on letter
function getCoinValue(letter: string): number {
  if (commonLetters.includes(letter)) return 1;
  if (uncommonLetters.includes(letter)) return 2;
  if (rareLetters.includes(letter)) return 3;
  return 1; // default
}

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

// Generate a letter card with coin value
function generateLetterCard(): LetterCard {
  const letter = getRandomLetter();
  return {
    letter,
    coinValue: getCoinValue(letter)
  };
}

// Generate a choice of 3 random letter cards
function generateChoices(): LetterCard[] {
  return [generateLetterCard(), generateLetterCard(), generateLetterCard()];
}

// Get color class - gold for all letter cards
function getCardColor(isVowel: boolean = false): string {
  // All letters get gold styling with dashed border (like heal cards)
  return 'bg-yellow-100 dark:bg-yellow-900 border-yellow-600 dark:border-yellow-500 border-4 border-dashed';
}

export default function Inkpots2Page() {
  const [player1Letters, setPlayer1Letters] = useState<LetterCard[]>([]);
  const [player2Letters, setPlayer2Letters] = useState<LetterCard[]>([]);
  const [currentChoices, setCurrentChoices] = useState<LetterCard[]>([]);
  const [gamePhase, setGamePhase] = useState<'draft-p1' | 'draft-p2' | 'play' | 'cleanup' | 'redraft-p1' | 'redraft-p2'>('draft-p1');
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [wordBar, setWordBar] = useState<(LetterCard | null)[]>(Array(7).fill(null));
  const [usedLetterIndices, setUsedLetterIndices] = useState<Set<number>>(new Set());
  const [draggedFrom, setDraggedFrom] = useState<{type: 'letter' | 'wordBar', index: number} | null>(null);
  const [wordBarToSource, setWordBarToSource] = useState<Map<number, {type: 'letter', index: number}>>(new Map());
  const [player1Words, setPlayer1Words] = useState<Array<{word: string, coins: number, isPassed?: boolean}>>([]);
  const [player2Words, setPlayer2Words] = useState<Array<{word: string, coins: number, isPassed?: boolean}>>([]);
  const [currentWord, setCurrentWord] = useState('');
  const [player1BookLetters, setPlayer1BookLetters] = useState(0);
  const [player2BookLetters, setPlayer2BookLetters] = useState(0);
  const [player1Coins, setPlayer1Coins] = useState(0);
  const [player2Coins, setPlayer2Coins] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [showContinueButton, setShowContinueButton] = useState(false);
  const [showShop, setShowShop] = useState(false);

  // Use the custom validation hook
  const { isValid } = useWordValidation(currentWord);

  // Generate initial draft choices on client side only
  useEffect(() => {
    setCurrentChoices(generateChoices());
  }, []);

  // Update current word whenever word bar changes
  useEffect(() => {
    const word = wordBar.filter(card => card !== null).map(card => card!.letter).join('');
    setCurrentWord(word);
  }, [wordBar]);

  const handleChooseLetter = (card: LetterCard) => {
    if (gamePhase === 'draft-p1') {
      const newLetters = [...player1Letters, card];
      setPlayer1Letters(newLetters);

      if (newLetters.length >= 5) {
        // Player 1 done, switch to Player 2 with new choices
        setGamePhase('draft-p2');
        setCurrentChoices(generateChoices());
      } else {
        // Generate new choices for next pick
        setCurrentChoices(generateChoices());
      }
    } else if (gamePhase === 'draft-p2') {
      const newLetters = [...player2Letters, card];
      setPlayer2Letters(newLetters);

      if (newLetters.length >= 5) {
        setGamePhase('play');
        setCurrentPlayer(1);
      } else {
        // Generate new choices for next pick
        setCurrentChoices(generateChoices());
      }
    } else if (gamePhase === 'redraft-p1') {
      const newLetters = [...player1Letters, card];
      setPlayer1Letters(newLetters);

      if (newLetters.length >= 5) {
        // Player 1 done, switch to Player 2 with new choices
        setGamePhase('redraft-p2');
        setCurrentChoices(generateChoices());
      } else {
        // Generate new choices for next pick
        setCurrentChoices(generateChoices());
      }
    } else if (gamePhase === 'redraft-p2') {
      const newLetters = [...player2Letters, card];
      setPlayer2Letters(newLetters);

      if (newLetters.length >= 5) {
        setGamePhase('play');
        setCurrentPlayer(1);
      } else {
        // Generate new choices for next pick
        setCurrentChoices(generateChoices());
      }
    }
  };

  const handleRestart = () => {
    setPlayer1Letters([]);
    setPlayer2Letters([]);
    setCurrentChoices(generateChoices());
    setGamePhase('draft-p1');
    setCurrentPlayer(1);
    setWordBar(Array(7).fill(null));
    setUsedLetterIndices(new Set());
    setWordBarToSource(new Map());
    setPlayer1Words([]);
    setPlayer2Words([]);
    setCurrentWord('');
    setPlayer1BookLetters(0);
    setPlayer2BookLetters(0);
    setPlayer1Coins(0);
    setPlayer2Coins(0);
    setGameOver(false);
    setWinner(null);
    setShowContinueButton(false);
  };

  // Move letter card to word bar
  const moveLetterToWordBar = (letterIndex: number) => {
    if (usedLetterIndices.has(letterIndex)) return;

    const firstEmptyIndex = wordBar.findIndex(card => card === null);
    if (firstEmptyIndex === -1) return;

    const currentLetters = currentPlayer === 1 ? player1Letters : player2Letters;
    const newWordBar = [...wordBar];
    newWordBar[firstEmptyIndex] = currentLetters[letterIndex];
    setWordBar(newWordBar);

    setUsedLetterIndices(new Set([...usedLetterIndices, letterIndex]));
    const newMapping = new Map(wordBarToSource);
    newMapping.set(firstEmptyIndex, {type: 'letter', index: letterIndex});
    setWordBarToSource(newMapping);
  };

  // Remove card from word bar and return it to available letters
  const removeFromWordBar = (wordBarIndex: number) => {
    if (wordBar[wordBarIndex] === null) return;

    const source = wordBarToSource.get(wordBarIndex);

    const newWordBar = [...wordBar];
    newWordBar[wordBarIndex] = null;
    setWordBar(newWordBar);

    if (source !== undefined && source.type === 'letter') {
      const newUsedIndices = new Set(usedLetterIndices);
      newUsedIndices.delete(source.index);
      setUsedLetterIndices(newUsedIndices);

      const newMapping = new Map(wordBarToSource);
      newMapping.delete(wordBarIndex);
      setWordBarToSource(newMapping);
    }
  };

  // Compact word bar (move all tiles to the left, removing gaps)
  const compactWordBar = () => {
    const newWordBar: (LetterCard | null)[] = Array(7).fill(null);
    const newMapping = new Map<number, {type: 'letter', index: number}>();

    let writeIndex = 0;
    for (let i = 0; i < wordBar.length; i++) {
      if (wordBar[i] !== null) {
        newWordBar[writeIndex] = wordBar[i];
        const source = wordBarToSource.get(i);
        if (source !== undefined) {
          newMapping.set(writeIndex, source);
        }
        writeIndex++;
      }
    }

    setWordBar(newWordBar);
    setWordBarToSource(newMapping);
  };

  // Calculate coins from word
  const calculateCoins = (cards: LetterCard[]): number => {
    return cards.reduce((total, card) => total + card.coinValue, 0);
  };

  // Skip turn without playing a word
  const handleSkipTurn = () => {
    if (currentPlayer === 1) {
      setPlayer1Words([...player1Words, { word: 'PASS', coins: 0, isPassed: true }]);
    } else {
      setPlayer2Words([...player2Words, { word: 'PASS', coins: 0, isPassed: true }]);
    }

    // Clear the word bar and reset
    setWordBar(Array(7).fill(null));
    setUsedLetterIndices(new Set());
    setWordBarToSource(new Map());

    // Check if both players have submitted a word for this round
    const bothPlayersReady = currentPlayer === 1
      ? player2Words.length > player1Words.length
      : player1Words.length === player2Words.length + 1;

    if (bothPlayersReady && !gameOver) {
      // Both players submitted - enter cleanup phase
      setGamePhase('cleanup');
    } else if (!gameOver) {
      // Switch to other player if round hasn't completed yet
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  };

  // Submit word
  const submitWord = () => {
    if (isValid && currentWord.length >= 3) {
      const usedCards = wordBar.filter(card => card !== null) as LetterCard[];
      const coins = calculateCoins(usedCards);
      const letterCount = currentWord.length;

      if (currentPlayer === 1) {
        setPlayer1Words([...player1Words, { word: currentWord.toUpperCase(), coins }]);
        setPlayer1BookLetters(player1BookLetters + letterCount);
        setPlayer1Coins(player1Coins + coins);

        // Check for win condition
        if (player1BookLetters + letterCount >= 50) {
          setGameOver(true);
          setWinner(1);
        }
      } else {
        setPlayer2Words([...player2Words, { word: currentWord.toUpperCase(), coins }]);
        setPlayer2BookLetters(player2BookLetters + letterCount);
        setPlayer2Coins(player2Coins + coins);

        // Check for win condition
        if (player2BookLetters + letterCount >= 50) {
          setGameOver(true);
          setWinner(2);
        }
      }

      // Clear the word bar and reset
      setWordBar(Array(7).fill(null));
      setUsedLetterIndices(new Set());
      setWordBarToSource(new Map());

      // Check if both players have submitted a word for this round
      const bothPlayersReady = currentPlayer === 1
        ? player2Words.length > player1Words.length
        : player1Words.length === player2Words.length + 1;

      if (bothPlayersReady && !gameOver) {
        // Both players submitted - enter cleanup phase
        setGamePhase('cleanup');
      } else if (!gameOver) {
        // Switch to other player if round hasn't completed yet
        setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
      }
    }
  };

  // Drag and drop handlers
  const handleDragStart = (type: 'letter' | 'wordBar', index: number) => {
    setDraggedFrom({ type, index });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnWordBar = (targetIndex: number) => {
    if (!draggedFrom) return;

    if (draggedFrom.type === 'letter') {
      if (usedLetterIndices.has(draggedFrom.index)) return;

      const currentLetters = currentPlayer === 1 ? player1Letters : player2Letters;
      const newWordBar = [...wordBar];
      const newUsedLetters = new Set(usedLetterIndices);
      const newMapping = new Map(wordBarToSource);

      if (wordBar[targetIndex] !== null) {
        const oldSource = wordBarToSource.get(targetIndex);
        if (oldSource) {
          newUsedLetters.delete(oldSource.index);
          newMapping.delete(targetIndex);
        }
      }

      newWordBar[targetIndex] = currentLetters[draggedFrom.index];
      newUsedLetters.add(draggedFrom.index);
      newMapping.set(targetIndex, {type: 'letter', index: draggedFrom.index});

      setWordBar(newWordBar);
      setUsedLetterIndices(newUsedLetters);
      setWordBarToSource(newMapping);
    } else if (draggedFrom.type === 'wordBar') {
      // Dragging within word bar - allow rearranging
      const fromIndex = draggedFrom.index;

      // Don't do anything if dropping on the same position
      if (fromIndex === targetIndex) {
        setDraggedFrom(null);
        return;
      }

      const newWordBar = [...wordBar];
      const newMapping = new Map(wordBarToSource);

      // If target position is empty, just move it there
      if (newWordBar[targetIndex] === null) {
        newWordBar[targetIndex] = newWordBar[fromIndex];
        newWordBar[fromIndex] = null;

        // Update mapping
        const source = wordBarToSource.get(fromIndex);
        if (source !== undefined) {
          newMapping.delete(fromIndex);
          newMapping.set(targetIndex, source);
        }
      } else {
        // Swap with existing letter
        const temp = newWordBar[targetIndex];
        newWordBar[targetIndex] = newWordBar[fromIndex];
        newWordBar[fromIndex] = temp;

        // Update mapping - swap the sources
        const fromSource = wordBarToSource.get(fromIndex);
        const toSource = wordBarToSource.get(targetIndex);
        if (fromSource !== undefined) {
          newMapping.set(targetIndex, fromSource);
        } else {
          newMapping.delete(targetIndex);
        }
        if (toSource !== undefined) {
          newMapping.set(fromIndex, toSource);
        } else {
          newMapping.delete(fromIndex);
        }
      }

      setWordBar(newWordBar);
      setWordBarToSource(newMapping);
    }

    setDraggedFrom(null);
  };

  // Get current letters based on phase and player
  const currentLetters = (gamePhase === 'draft-p1' || gamePhase === 'redraft-p1')
    ? player1Letters
    : (gamePhase === 'draft-p2' || gamePhase === 'redraft-p2')
      ? player2Letters
      : currentPlayer === 1 ? player1Letters : player2Letters;

  // Calculate current coins for display
  const currentCoins = wordBar.filter(card => card !== null).length > 0
    ? calculateCoins(wordBar.filter(card => card !== null) as LetterCard[])
    : 0;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <GameNav currentGame="inkpots2" />

      {/* Shop Icon - Top Right */}
      {gamePhase === 'play' && !gameOver && (
        <button
          onClick={() => setShowShop(true)}
          className="fixed top-4 right-4 z-50 w-12 h-12 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl font-bold transition-all hover:scale-110"
          title="Open Shop"
        >
          🛒
        </button>
      )}

      {/* Shop Modal */}
      {showShop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowShop(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Shop</h2>
              <button
                onClick={() => setShowShop(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-3xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <p className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                Your Coins: {currentPlayer === 1 ? player1Coins : player2Coins}
              </p>
            </div>

            <div className="space-y-4">
              {/* Item 1 */}
              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:border-yellow-500 transition-colors">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Item 1</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Description coming soon</p>
                  </div>
                  <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold cursor-not-allowed">
                    ? coins
                  </button>
                </div>
              </div>

              {/* Item 2 */}
              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:border-yellow-500 transition-colors">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Item 2</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Description coming soon</p>
                  </div>
                  <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold cursor-not-allowed">
                    ? coins
                  </button>
                </div>
              </div>

              {/* Item 3 */}
              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:border-yellow-500 transition-colors">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Item 3</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Description coming soon</p>
                  </div>
                  <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold cursor-not-allowed">
                    ? coins
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowShop(false)}
                className="w-full px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center pt-20 px-2">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Inkpots 2</h1>

        {gamePhase === 'draft-p1' && (
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Player 1: Draft your letters ({player1Letters.length}/5)
          </p>
        )}

        {gamePhase === 'draft-p2' && (
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Player 2: Draft your letters ({player2Letters.length}/5)
          </p>
        )}

        {gamePhase === 'redraft-p1' && (
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Player 1: Re-draft your letters ({player1Letters.length}/5)
          </p>
        )}

        {gamePhase === 'redraft-p2' && (
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Player 2: Re-draft your letters ({player2Letters.length}/5)
          </p>
        )}

        {gamePhase === 'play' && !gameOver && (
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Player {currentPlayer}'s Turn
          </p>
        )}

        {gamePhase === 'cleanup' && (
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Resolving Round...
          </p>
        )}

        {/* Game Over Panel */}
        {gameOver && (
          <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 max-w-md mx-auto text-center shadow-2xl border-4 border-purple-500">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900 dark:text-gray-100">Game Over!</h2>
            <p className="text-xl md:text-2xl mb-4 text-gray-700 dark:text-gray-300">
              Player {winner} Wins!
            </p>
            <div className="mb-4 space-y-2">
              <p className="text-lg md:text-xl text-gray-900 dark:text-gray-100">
                <span className="font-bold text-blue-600 dark:text-blue-400">Player 1:</span> {player1BookLetters} letters, {player1Coins} coins
              </p>
              <p className="text-lg md:text-xl text-gray-900 dark:text-gray-100">
                <span className="font-bold text-orange-600 dark:text-orange-400">Player 2:</span> {player2BookLetters} letters, {player2Coins} coins
              </p>
            </div>
            <button
              onClick={handleRestart}
              className="px-6 md:px-8 py-2 md:py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-semibold text-base md:text-lg"
            >
              Play Again
            </button>
          </div>
        )}

        {/* Draft Phase - Current Choices */}
        {(gamePhase === 'draft-p1' || gamePhase === 'draft-p2' || gamePhase === 'redraft-p1' || gamePhase === 'redraft-p2') && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Choose a letter:</h2>
            <div className="flex gap-4 justify-center mb-4">
              {currentChoices.map((card, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChooseLetter(card)}
                  className={`w-32 h-44 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer flex flex-col items-center justify-between p-3 ${getCardColor()}`}
                >
                  <div className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">
                    {card.coinValue} {card.coinValue === 1 ? 'Coin' : 'Coins'}
                  </div>
                  <span className="text-5xl font-bold text-gray-800 dark:text-gray-100">{card.letter}</span>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">{card.coinValue}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cleanup Phase - Show only book progress and continue button */}
        {gamePhase === 'cleanup' && (
          <>
            {/* Book Progress Bars */}
            <div className="mb-8 flex justify-center gap-12 items-start">
              {/* Player 1 Book */}
              <div className="flex flex-col items-center">
                {/* Player 1 Words */}
                {player1Words.length > 0 && (
                  <div className="mb-4">
                    <p className="font-semibold text-blue-600 dark:text-blue-400 mb-2 text-sm">Words Played</p>
                    <div className="space-y-1">
                      {player1Words.map((wordData, idx) => (
                        <div key={idx} className={`text-sm text-gray-800 dark:text-gray-200 ${wordData.isPassed ? 'italic' : ''}`}>
                          {wordData.word}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                  Player 1's Book
                </p>
                <div className="w-48">
                  <div className="flex justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    <span>Letters</span>
                    <span>{player1BookLetters}/50</span>
                  </div>
                  <div className="w-full h-6 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden border-2 border-gray-400 dark:border-gray-500">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${(player1BookLetters / 50) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mt-2">
                    {player1Coins} coins
                  </p>
                </div>
              </div>

              {/* Player 2 Book */}
              <div className="flex flex-col items-center">
                {/* Player 2 Words */}
                {player2Words.length > 0 && (
                  <div className="mb-4">
                    <p className="font-semibold text-orange-600 dark:text-orange-400 mb-2 text-sm">Words Played</p>
                    <div className="space-y-1">
                      {player2Words.map((wordData, idx) => (
                        <div key={idx} className={`text-sm text-gray-800 dark:text-gray-200 ${wordData.isPassed ? 'italic' : ''}`}>
                          {wordData.word}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-2">
                  Player 2's Book
                </p>
                <div className="w-48">
                  <div className="flex justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    <span>Letters</span>
                    <span>{player2BookLetters}/50</span>
                  </div>
                  <div className="w-full h-6 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden border-2 border-gray-400 dark:border-gray-500">
                    <div
                      className="h-full bg-orange-600 transition-all duration-300"
                      style={{ width: `${(player2BookLetters / 50) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mt-2">
                    {player2Coins} coins
                  </p>
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <div className="mb-6">
              <button
                onClick={() => {
                  // Clear letters and start re-draft
                  setPlayer1Letters([]);
                  setPlayer2Letters([]);
                  setCurrentChoices(generateChoices());
                  setGamePhase('redraft-p1');
                }}
                className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold text-lg"
              >
                Continue to Re-Draft
              </button>
            </div>
          </>
        )}

        {/* Play Phase - Book Progress */}
        {gamePhase === 'play' && !gameOver && (
          <>
            {/* Book Progress Bars */}
            <div className="mb-8 flex justify-center gap-12 items-start">
              {/* Player 1 Book */}
              <div className="flex flex-col items-center">
                {/* Player 1 Words */}
                {player1Words.length > 0 && (
                  <div className="mb-4">
                    <p className="font-semibold text-blue-600 dark:text-blue-400 mb-2 text-sm">Words Played</p>
                    <div className="space-y-1">
                      {player1Words.map((wordData, idx) => (
                        <div key={idx} className={`text-sm text-gray-800 dark:text-gray-200 ${wordData.isPassed ? 'italic' : ''}`}>
                          {wordData.word}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                  Player 1's Book
                </p>
                <div className="w-48">
                  <div className="flex justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    <span>Letters</span>
                    <span>{player1BookLetters}/50</span>
                  </div>
                  <div className="w-full h-6 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden border-2 border-gray-400 dark:border-gray-500">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${(player1BookLetters / 50) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mt-2">
                    {player1Coins} coins
                  </p>
                </div>
              </div>

              {/* Player 2 Book */}
              <div className="flex flex-col items-center">
                {/* Player 2 Words */}
                {player2Words.length > 0 && (
                  <div className="mb-4">
                    <p className="font-semibold text-orange-600 dark:text-orange-400 mb-2 text-sm">Words Played</p>
                    <div className="space-y-1">
                      {player2Words.map((wordData, idx) => (
                        <div key={idx} className={`text-sm text-gray-800 dark:text-gray-200 ${wordData.isPassed ? 'italic' : ''}`}>
                          {wordData.word}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-2">
                  Player 2's Book
                </p>
                <div className="w-48">
                  <div className="flex justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    <span>Letters</span>
                    <span>{player2BookLetters}/50</span>
                  </div>
                  <div className="w-full h-6 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden border-2 border-gray-400 dark:border-gray-500">
                    <div
                      className="h-full bg-orange-600 transition-all duration-300"
                      style={{ width: `${(player2BookLetters / 50) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mt-2">
                    {player2Coins} coins
                  </p>
                </div>
              </div>
            </div>

            {/* Current Word Display */}
            <div className="mb-6">
              <p className="text-xl mb-2">
                Current Word: <span className="font-bold">{currentWord || '(empty)'}</span>
                {isValid !== null && (
                  <span className={`ml-3 text-lg ${isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isValid ? '✓ Valid' : '✗ Invalid'}
                  </span>
                )}
              </p>

              {/* Coin Display */}
              {currentCoins > 0 && (
                <div className="mt-4 inline-block bg-yellow-100 dark:bg-yellow-900 rounded-lg p-4 border-2 border-yellow-600">
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    This word will earn: {currentCoins} {currentCoins === 1 ? 'coin' : 'coins'}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {currentWord.length} {currentWord.length === 1 ? 'letter' : 'letters'} for your book
                  </p>
                </div>
              )}
            </div>

            {/* Submit and Skip Buttons */}
            <div className="mb-6 flex gap-3 justify-center">
              <button
                onClick={submitWord}
                disabled={!isValid || currentWord.length < 3}
                className="px-8 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-lg"
              >
                Submit Word
              </button>
              <button
                onClick={handleSkipTurn}
                className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-semibold text-lg"
              >
                Skip Turn
              </button>
            </div>

            {/* Word Bar */}
            <div className="mb-12">
              <p className="text-lg font-semibold mb-3">Word Bar (drag cards here or click to remove)</p>
              <div className="flex gap-2 justify-center items-center">
                {wordBar.map((card, index) => (
                  <div
                    key={index}
                    data-wordbar-index={index}
                    draggable={card !== null}
                    onDragStart={() => handleDragStart('wordBar', index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDropOnWordBar(index)}
                    onClick={() => {
                      if (card !== null) {
                        removeFromWordBar(index);
                      }
                    }}
                    className={`w-16 h-24 rounded-lg flex flex-col items-center justify-between p-2 touch-none ${
                      card === null
                        ? 'bg-gray-100 dark:bg-gray-700 border-4 border-gray-400 dark:border-gray-600 border-dashed'
                        : `cursor-move hover:shadow-lg hover:scale-105 transition-all ${getCardColor()}`
                    }`}
                  >
                    {card !== null && (
                      <>
                        <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          {card.coinValue}
                        </div>
                        <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">{card.letter}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Letters Display */}
        <div className="mb-8">
          {(gamePhase === 'draft-p1' || gamePhase === 'draft-p2' || gamePhase === 'redraft-p1' || gamePhase === 'redraft-p2') && (
            <>
              <h2 className="text-xl font-semibold mb-4">
                Your Letters ({currentLetters.length} cards)
              </h2>
              {currentLetters.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 italic">No cards chosen yet</p>
              ) : (
                <div className="flex flex-wrap gap-3 justify-center max-w-4xl mx-auto">
                  {currentLetters.map((card, idx) => (
                    <div
                      key={idx}
                      className={`w-20 h-28 rounded-lg flex flex-col items-center justify-between p-2 ${getCardColor()}`}
                    >
                      <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                        {card.coinValue}
                      </div>
                      <span className="text-3xl font-bold text-gray-800 dark:text-gray-100">{card.letter}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {gamePhase === 'play' && !gameOver && (
            <>
              {/* Letters */}
              <h2 className="text-lg font-semibold mb-3">
                Your Letters
              </h2>
              <div className="flex gap-3 justify-center items-center mb-6">
                {currentLetters.map((card, idx) => {
                  const isUsed = usedLetterIndices.has(idx);
                  return (
                    <div
                      key={idx}
                      draggable={!isUsed}
                      onDragStart={() => handleDragStart('letter', idx)}
                      onClick={() => moveLetterToWordBar(idx)}
                      className={`w-20 h-28 rounded-lg flex flex-col items-center justify-between p-2 transition-all ${getCardColor()} ${
                        isUsed
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-move hover:shadow-xl hover:scale-105 touch-none'
                      }`}
                    >
                      <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                        {card.coinValue}
                      </div>
                      <span className="text-3xl font-bold text-gray-800 dark:text-gray-100">{card.letter}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>


      </div>
    </div>
  );
}
