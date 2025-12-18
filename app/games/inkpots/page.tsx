'use client'

import { useState, useEffect } from "react";
import GameNav from '@/app/components/GameNav';
import { letterPoints } from '@/app/components/wordValidation';
import { useWordValidation } from '@/app/components/useWordValidation';

// Letter frequency groups based on English usage
const commonLetters = ['E', 'T', 'A', 'O', 'I', 'N', 'S', 'H', 'R'];  // ~60% chance
const uncommonLetters = ['D', 'L', 'C', 'U', 'M', 'W', 'F', 'G', 'Y', 'P', 'B']; // ~30% chance
const rareLetters = ['V', 'K', 'J', 'X', 'Q', 'Z']; // ~10% chance

// Card types and attributes
type CardType = 'attack' | 'shield' | 'heal';
type ElementType = 'fire' | 'ice' | 'rock';

interface LetterCard {
  letter: string;
  cardType: CardType;
  elementType?: ElementType; // undefined for heal cards
  value: number; // attack value (3-6), shield value (2-4), or heal value (1-3)
}

// Get random element type
function getRandomElement(): ElementType {
  const elements: ElementType[] = ['fire', 'ice', 'rock'];
  return elements[Math.floor(Math.random() * elements.length)];
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

// Generate a letter card with attributes
function generateLetterCard(): LetterCard {
  const letter = getRandomLetter();
  const rand = Math.random();

  if (rand < 0.6) {
    // 60% chance - Attack card
    return {
      letter,
      cardType: 'attack',
      elementType: getRandomElement(),
      value: Math.floor(Math.random() * 3) + 4 // 4-6
    };
  } else if (rand < 0.9) {
    // 30% chance - Shield card
    return {
      letter,
      cardType: 'shield',
      elementType: getRandomElement(),
      value: Math.floor(Math.random() * 3) + 3 // 3-5
    };
  } else {
    // 10% chance - Heal card
    return {
      letter,
      cardType: 'heal',
      value: Math.floor(Math.random() * 3) + 1 // 1-3
    };
  }
}

// Generate a choice of 3 random letter cards
function generateChoices(): LetterCard[] {
  return [generateLetterCard(), generateLetterCard(), generateLetterCard()];
}

// Get color class based on card type and element
function getCardColor(card: LetterCard): string {
  // Different border styles for each card type
  let borderStyle = '';
  let extraClasses = '';

  if (card.cardType === 'attack') {
    borderStyle = 'border-4 border-solid'; // Solid border for attack
    extraClasses = 'jagged-border'; // Custom jagged border class
  } else if (card.cardType === 'shield') {
    borderStyle = 'border-4 border-solid'; // Thick solid border for shield
    extraClasses = 'shield-stripes'; // Add diagonal stripes
  } else if (card.cardType === 'heal') {
    borderStyle = 'border-4 border-dashed'; // Dashed border for heal
  }

  // Background and border color based on element/type
  if (card.cardType === 'heal') {
    return `bg-green-100 dark:bg-green-900 border-green-500 dark:border-green-500 ${borderStyle} ${extraClasses}`;
  }

  if (card.elementType === 'fire') {
    return `bg-red-100 dark:bg-red-900 border-red-500 dark:border-red-500 ${borderStyle} ${extraClasses}`;
  } else if (card.elementType === 'ice') {
    return `bg-blue-100 dark:bg-blue-900 border-blue-500 dark:border-blue-500 ${borderStyle} ${extraClasses}`;
  } else if (card.elementType === 'rock') {
    return `bg-amber-100 dark:bg-amber-900 border-amber-600 dark:border-amber-600 ${borderStyle} ${extraClasses}`;
  }

  return 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600';
}

// Attribute breakdown for a word
interface AttributeBreakdown {
  totalAttack: number;
  totalShield: number;
  totalHeal: number;
  fireAttack: number;
  iceAttack: number;
  rockAttack: number;
  fireShield: number;
  iceShield: number;
  rockShield: number;
}

// Calculate attribute breakdown for cards in word
function calculateAttributes(cards: LetterCard[]): AttributeBreakdown {
  const breakdown: AttributeBreakdown = {
    totalAttack: 0,
    totalShield: 0,
    totalHeal: 0,
    fireAttack: 0,
    iceAttack: 0,
    rockAttack: 0,
    fireShield: 0,
    iceShield: 0,
    rockShield: 0,
  };

  for (const card of cards) {
    if (card.cardType === 'attack') {
      breakdown.totalAttack += card.value;
      if (card.elementType === 'fire') breakdown.fireAttack += card.value;
      else if (card.elementType === 'ice') breakdown.iceAttack += card.value;
      else if (card.elementType === 'rock') breakdown.rockAttack += card.value;
    } else if (card.cardType === 'shield') {
      breakdown.totalShield += card.value;
      if (card.elementType === 'fire') breakdown.fireShield += card.value;
      else if (card.elementType === 'ice') breakdown.iceShield += card.value;
      else if (card.elementType === 'rock') breakdown.rockShield += card.value;
    } else if (card.cardType === 'heal') {
      breakdown.totalHeal += card.value;
    }
  }

  return breakdown;
}

export default function InkpotsPage() {
  const [player1Deck, setPlayer1Deck] = useState<LetterCard[]>([]);
  const [player2Deck, setPlayer2Deck] = useState<LetterCard[]>([]);
  const [currentChoices, setCurrentChoices] = useState<LetterCard[]>([]);
  const [gamePhase, setGamePhase] = useState<'draft-p1' | 'draft-p2' | 'play'>('draft-p1');
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [wordBar, setWordBar] = useState<(LetterCard | null)[]>(Array(10).fill(null));
  const [usedDeckIndices, setUsedDeckIndices] = useState<Set<number>>(new Set());
  const [draggedFrom, setDraggedFrom] = useState<{type: 'deck' | 'wordBar', index: number} | null>(null);
  const [wordBarToDeck, setWordBarToDeck] = useState<Map<number, number>>(new Map());
  const [player1Words, setPlayer1Words] = useState<Array<{word: string, attributes: AttributeBreakdown}>>([]);
  const [player2Words, setPlayer2Words] = useState<Array<{word: string, attributes: AttributeBreakdown}>>([]);
  const [currentWord, setCurrentWord] = useState('');
  const [player1HandIndices, setPlayer1HandIndices] = useState<number[]>([]);
  const [player2HandIndices, setPlayer2HandIndices] = useState<number[]>([]);
  const [player1Health, setPlayer1Health] = useState(30);
  const [player2Health, setPlayer2Health] = useState(30);

  // Use the custom validation hook
  const { isValid } = useWordValidation(currentWord);

  // Generate initial choices on client side only to avoid hydration mismatch
  useEffect(() => {
    setCurrentChoices(generateChoices());
  }, []);

  // Generate a random hand of 10 cards from the deck
  const generateHand = (player: 1 | 2) => {
    const availableIndices = Array.from({ length: 26 }, (_, i) => i);
    const shuffled = availableIndices.sort(() => Math.random() - 0.5);
    if (player === 1) {
      setPlayer1HandIndices(shuffled.slice(0, 10));
    } else {
      setPlayer2HandIndices(shuffled.slice(0, 10));
    }
  };

  // Update current word whenever word bar changes
  useEffect(() => {
    const word = wordBar.filter(card => card !== null).map(card => card.letter).join('');
    setCurrentWord(word);
  }, [wordBar]);

  const handleChooseLetter = (card: LetterCard) => {
    if (gamePhase === 'draft-p1') {
      const newDeck = [...player1Deck, card];
      setPlayer1Deck(newDeck);

      if (newDeck.length >= 26) {
        setGamePhase('draft-p2');
        setCurrentChoices(generateChoices());
      } else {
        setCurrentChoices(generateChoices());
      }
    } else if (gamePhase === 'draft-p2') {
      const newDeck = [...player2Deck, card];
      setPlayer2Deck(newDeck);

      if (newDeck.length >= 26) {
        setGamePhase('play');
        setCurrentPlayer(1);
        // Generate initial hands for both players
        setTimeout(() => {
          generateHand(1);
          generateHand(2);
        }, 0);
      } else {
        setCurrentChoices(generateChoices());
      }
    }
  };

  const handleRestart = () => {
    setPlayer1Deck([]);
    setPlayer2Deck([]);
    setCurrentChoices(generateChoices());
    setGamePhase('draft-p1');
    setCurrentPlayer(1);
    setWordBar(Array(10).fill(null));
    setUsedDeckIndices(new Set());
    setWordBarToDeck(new Map());
    setPlayer1Words([]);
    setPlayer2Words([]);
    setCurrentWord('');
    setPlayer1HandIndices([]);
    setPlayer2HandIndices([]);
    setPlayer1Health(30);
    setPlayer2Health(30);
  };

  // Move card from deck to word bar
  const moveDeckToWordBar = (deckIndex: number) => {
    if (usedDeckIndices.has(deckIndex)) return;

    const firstEmptyIndex = wordBar.findIndex(card => card === null);
    if (firstEmptyIndex === -1) return;

    const currentDeck = currentPlayer === 1 ? player1Deck : player2Deck;
    const newWordBar = [...wordBar];
    newWordBar[firstEmptyIndex] = currentDeck[deckIndex];
    setWordBar(newWordBar);

    setUsedDeckIndices(new Set([...usedDeckIndices, deckIndex]));
    const newMapping = new Map(wordBarToDeck);
    newMapping.set(firstEmptyIndex, deckIndex);
    setWordBarToDeck(newMapping);
  };

  // Remove card from word bar
  const removeFromWordBar = (wordBarIndex: number) => {
    if (wordBar[wordBarIndex] === null) return;

    const deckIndex = wordBarToDeck.get(wordBarIndex);

    const newWordBar = [...wordBar];
    newWordBar[wordBarIndex] = null;
    setWordBar(newWordBar);

    if (deckIndex !== undefined) {
      const newUsedIndices = new Set(usedDeckIndices);
      newUsedIndices.delete(deckIndex);
      setUsedDeckIndices(newUsedIndices);

      const newMapping = new Map(wordBarToDeck);
      newMapping.delete(wordBarIndex);
      setWordBarToDeck(newMapping);
    }
  };

  // Calculate combat damage
  const calculateCombat = (attackerAttribs: AttributeBreakdown, defenderAttribs: AttributeBreakdown): number => {
    // Calculate damage for each element type (attack - shield for that element)
    const fireDamage = Math.max(0, attackerAttribs.fireAttack - defenderAttribs.fireShield);
    const iceDamage = Math.max(0, attackerAttribs.iceAttack - defenderAttribs.iceShield);
    const rockDamage = Math.max(0, attackerAttribs.rockAttack - defenderAttribs.rockShield);

    // Total damage is sum of all elemental damage
    return fireDamage + iceDamage + rockDamage;
  };

  // Submit word
  const submitWord = () => {
    if (isValid && currentWord.length >= 3) {
      const usedCards = wordBar.filter(card => card !== null);
      const attributes = calculateAttributes(usedCards);

      if (currentPlayer === 1) {
        setPlayer1Words([...player1Words, { word: currentWord.toUpperCase(), attributes }]);
      } else {
        setPlayer2Words([...player2Words, { word: currentWord.toUpperCase(), attributes }]);
      }

      // Clear the word bar and reset
      setWordBar(Array(10).fill(null));
      setUsedDeckIndices(new Set());
      setWordBarToDeck(new Map());

      // Check if both players have submitted a word for this round
      const bothPlayersReady = currentPlayer === 1
        ? player2Words.length > player1Words.length
        : player1Words.length === player2Words.length + 1;

      if (bothPlayersReady) {
        // Both players have submitted - resolve combat
        const p1LastWord = currentPlayer === 1
          ? attributes
          : player1Words[player1Words.length - 1].attributes;
        const p2LastWord = currentPlayer === 2
          ? attributes
          : player2Words[player2Words.length - 1].attributes;

        // Calculate damage dealt to each player
        const damageToP2 = calculateCombat(p1LastWord, p2LastWord);
        const damageToP1 = calculateCombat(p2LastWord, p1LastWord);

        // Apply damage
        setPlayer2Health(prev => Math.max(0, prev - damageToP2));
        setPlayer1Health(prev => Math.max(0, prev - damageToP1));

        // Apply healing after damage
        setPlayer1Health(prev => Math.min(30, prev + p1LastWord.totalHeal));
        setPlayer2Health(prev => Math.min(30, prev + p2LastWord.totalHeal));
      }

      // Switch to other player
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (type: 'deck' | 'wordBar', index: number) => {
    setDraggedFrom({ type, index });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnWordBar = (targetIndex: number) => {
    if (!draggedFrom) return;

    if (draggedFrom.type === 'deck') {
      if (usedDeckIndices.has(draggedFrom.index)) return;

      const currentDeck = currentPlayer === 1 ? player1Deck : player2Deck;
      const newWordBar = [...wordBar];
      const newUsedIndices = new Set(usedDeckIndices);
      const newMapping = new Map(wordBarToDeck);

      if (wordBar[targetIndex] !== null) {
        const oldDeckIndex = wordBarToDeck.get(targetIndex);
        if (oldDeckIndex !== undefined) {
          newUsedIndices.delete(oldDeckIndex);
          newMapping.delete(targetIndex);
        }
      }

      newWordBar[targetIndex] = currentDeck[draggedFrom.index];
      newUsedIndices.add(draggedFrom.index);
      newMapping.set(targetIndex, draggedFrom.index);

      setWordBar(newWordBar);
      setUsedDeckIndices(newUsedIndices);
      setWordBarToDeck(newMapping);
    }

    setDraggedFrom(null);
  };

  // Get current deck and hand based on phase and player
  const currentDeck = gamePhase === 'draft-p1' ? player1Deck : gamePhase === 'draft-p2' ? player2Deck : currentPlayer === 1 ? player1Deck : player2Deck;
  const currentHandIndices = currentPlayer === 1 ? player1HandIndices : player2HandIndices;
  const otherPlayer = currentPlayer === 1 ? 2 : 1;
  const otherHandIndices = otherPlayer === 1 ? player1HandIndices : player2HandIndices;
  const otherDeck = otherPlayer === 1 ? player1Deck : player2Deck;

  // Calculate current attributes for display
  const currentAttributes = wordBar.filter(card => card !== null).length > 0
    ? calculateAttributes(wordBar.filter(card => card !== null))
    : null;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <GameNav currentGame="inkpots" />

      <div className="text-center pt-20 px-2">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Inkpots</h1>

        {gamePhase === 'draft-p1' && (
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Player 1: Draft your deck ({player1Deck.length}/26)
          </p>
        )}

        {gamePhase === 'draft-p2' && (
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Player 2: Draft your deck ({player2Deck.length}/26)
          </p>
        )}

        {gamePhase === 'play' && (
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Player {currentPlayer}'s Turn
          </p>
        )}

        {/* Draft Phase - Current Choices */}
        {(gamePhase === 'draft-p1' || gamePhase === 'draft-p2') && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Choose a card:</h2>
            <div className="flex gap-4 justify-center">
              {currentChoices.map((card, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChooseLetter(card)}
                  className={`w-32 h-44 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer flex flex-col items-center justify-between p-3 ${getCardColor(card)}`}
                >
                  <div className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">
                    {card.cardType}
                  </div>
                  <span className="text-5xl font-bold text-gray-800 dark:text-gray-100">{card.letter}</span>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {card.elementType && <div className="text-xs capitalize mb-1">{card.elementType}</div>}
                    <div>{card.value}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Play Phase - Score Display and Word Bar */}
        {gamePhase === 'play' && (
          <>
            {/* Other Player's Hand (displayed at top) */}
            <div className="mb-8">
              <h2 className="text-sm font-semibold mb-2 text-gray-500 dark:text-gray-400">
                Player {otherPlayer}'s Hand
              </h2>
              <div className="flex gap-2 justify-center items-center">
                {otherHandIndices.map((deckIdx, handIdx) => {
                  const card = otherDeck[deckIdx];
                  return (
                    <div
                      key={handIdx}
                      className={`w-16 h-24 rounded-lg flex flex-col items-center justify-between p-2 ${getCardColor(card)}`}
                    >
                      <div className="text-[8px] font-bold uppercase text-gray-700 dark:text-gray-300">
                        {card.cardType}
                      </div>
                      <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">{card.letter}</span>
                      <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {card.elementType && <div className="text-[7px] capitalize">{card.elementType}</div>}
                        <div>{card.value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inkpot Soldiers - positioned between opposing player's hand and word area */}
            <div className="mb-8 flex justify-center gap-24 items-end">
              {/* Player 1 Soldier with Spell */}
              <div className="flex flex-col items-center">
                {/* Player 1's Last Spell */}
                <div className="text-center mb-2">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Spell Cast:
                  </p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {player1Words.length > 0 && player2Words.length > 0
                      ? player1Words[player1Words.length - 1].word
                      : '???'}
                  </p>
                </div>
                <img
                  src="/inkpots-art/inkpot-soldier.png"
                  alt="Inkpot Soldier"
                  className="h-96 w-auto object-contain"
                />
                {/* Player 1 Health Bar */}
                <div className="w-48 mt-3">
                  <div className="flex justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    <span>HP</span>
                    <span>{player1Health}/30</span>
                  </div>
                  <div className="w-full h-6 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden border-2 border-gray-400 dark:border-gray-500">
                    <div
                      className="h-full bg-red-600 transition-all duration-300"
                      style={{ width: `${(player1Health / 30) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Player 2 Soldier with Spell */}
              <div className="flex flex-col items-center">
                {/* Player 2's Last Spell */}
                <div className="text-center mb-2">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Spell Cast:
                  </p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {player1Words.length > 0 && player2Words.length > 0
                      ? player2Words[player2Words.length - 1].word
                      : '???'}
                  </p>
                </div>
                <img
                  src="/inkpots-art/inkpot-soldier.png"
                  alt="Inkpot Soldier"
                  className="h-96 w-auto object-contain"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {/* Player 2 Health Bar */}
                <div className="w-48 mt-3">
                  <div className="flex justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    <span>HP</span>
                    <span>{player2Health}/30</span>
                  </div>
                  <div className="w-full h-6 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden border-2 border-gray-400 dark:border-gray-500">
                    <div
                      className="h-full bg-red-600 transition-all duration-300"
                      style={{ width: `${(player2Health / 30) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Word and Attributes */}
            <div className="mb-6">
              <p className="text-xl mb-2">
                Current Word: <span className="font-bold">{currentWord || '(empty)'}</span>
                {isValid !== null && (
                  <span className={`ml-3 text-lg ${isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isValid ? '✓ Valid' : '✗ Invalid'}
                  </span>
                )}
              </p>

              {/* Attribute Breakdown */}
              {currentAttributes && (
                <div className="mt-4 inline-block bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                  <p className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Attributes:</p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    {currentAttributes.totalAttack > 0 && (
                      <div className="text-left">
                        <p className="font-semibold text-red-600 dark:text-red-400">Attack: {currentAttributes.totalAttack}</p>
                        {currentAttributes.fireAttack > 0 && <p className="text-xs">Fire: {currentAttributes.fireAttack}</p>}
                        {currentAttributes.iceAttack > 0 && <p className="text-xs">Ice: {currentAttributes.iceAttack}</p>}
                        {currentAttributes.rockAttack > 0 && <p className="text-xs">Rock: {currentAttributes.rockAttack}</p>}
                      </div>
                    )}
                    {currentAttributes.totalShield > 0 && (
                      <div className="text-left">
                        <p className="font-semibold text-blue-600 dark:text-blue-400">Shield: {currentAttributes.totalShield}</p>
                        {currentAttributes.fireShield > 0 && <p className="text-xs">Fire: {currentAttributes.fireShield}</p>}
                        {currentAttributes.iceShield > 0 && <p className="text-xs">Ice: {currentAttributes.iceShield}</p>}
                        {currentAttributes.rockShield > 0 && <p className="text-xs">Rock: {currentAttributes.rockShield}</p>}
                      </div>
                    )}
                    {currentAttributes.totalHeal > 0 && (
                      <div className="text-left">
                        <p className="font-semibold text-green-600 dark:text-green-400">Heal: {currentAttributes.totalHeal}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="mb-6">
              <button
                onClick={submitWord}
                disabled={!isValid || currentWord.length < 3}
                className="px-8 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-lg"
              >
                Submit Word
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
                        : `cursor-move hover:shadow-lg hover:scale-105 transition-all ${getCardColor(card)}`
                    }`}
                  >
                    {card !== null && (
                      <>
                        <div className="text-[8px] font-bold uppercase text-gray-700 dark:text-gray-300">
                          {card.cardType}
                        </div>
                        <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">{card.letter}</span>
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {card.elementType && <div className="text-[7px] capitalize">{card.elementType}</div>}
                          <div>{card.value}</div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Deck Display */}
        <div className="mb-8">
          {(gamePhase === 'draft-p1' || gamePhase === 'draft-p2') && (
            <>
              <h2 className="text-xl font-semibold mb-4">
                Your Deck ({currentDeck.length} cards)
              </h2>
              {currentDeck.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 italic">No cards chosen yet</p>
              ) : (
                <div className="flex flex-wrap gap-3 justify-center max-w-4xl mx-auto">
                  {currentDeck.map((card, idx) => (
                    <div
                      key={idx}
                      className={`w-20 h-28 rounded-lg flex flex-col items-center justify-between p-2 ${getCardColor(card)}`}
                    >
                      <div className="text-[9px] font-bold uppercase text-gray-700 dark:text-gray-300">
                        {card.cardType}
                      </div>
                      <span className="text-3xl font-bold text-gray-800 dark:text-gray-100">{card.letter}</span>
                      <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {card.elementType && <div className="text-[8px] capitalize">{card.elementType}</div>}
                        <div>{card.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {gamePhase === 'play' && (
            <>
              <h2 className="text-lg font-semibold mb-3">
                Player {currentPlayer}'s Hand (drag to word bar or click to add)
              </h2>
              <div className="flex gap-3 justify-center items-center">
                {currentHandIndices.map((deckIdx, handIdx) => {
                  const card = currentDeck[deckIdx];
                  const isUsed = usedDeckIndices.has(deckIdx);
                  return (
                    <div
                      key={handIdx}
                      draggable={!isUsed}
                      onDragStart={() => handleDragStart('deck', deckIdx)}
                      onClick={() => moveDeckToWordBar(deckIdx)}
                      className={`w-20 h-28 rounded-lg flex flex-col items-center justify-between p-2 transition-all ${getCardColor(card)} ${
                        isUsed
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-move hover:shadow-xl hover:scale-105 touch-none'
                      }`}
                    >
                      <div className="text-[9px] font-bold uppercase text-gray-700 dark:text-gray-300">
                        {card.cardType}
                      </div>
                      <span className="text-3xl font-bold text-gray-800 dark:text-gray-100">{card.letter}</span>
                      <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {card.elementType && <div className="text-[8px] capitalize">{card.elementType}</div>}
                        <div>{card.value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleRestart}
            className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
          >
            {gamePhase === 'play' ? 'New Game' : 'Restart Draft'}
          </button>
        </div>
      </div>
    </div>
  );
}
