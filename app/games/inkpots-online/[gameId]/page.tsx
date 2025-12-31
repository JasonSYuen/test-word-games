'use client'

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from 'next/navigation';
import GameNav from '@/app/components/GameNav';
import { useWordValidation } from '@/app/components/useWordValidation';
import { ItemId, ITEMS } from '../items';
import Peer, { DataConnection } from 'peerjs';

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
    return commonLetters[Math.floor(Math.random() * commonLetters.length)];
  } else if (rand < 0.9) {
    return uncommonLetters[Math.floor(Math.random() * uncommonLetters.length)];
  } else {
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

// Generate a choice of random letter cards
function generateChoices(count: number = 3): LetterCard[] {
  const choices: LetterCard[] = [];
  for (let i = 0; i < count; i++) {
    choices.push(generateLetterCard());
  }
  return choices;
}

// Get color class - gold for all letter cards
function getCardColor(): string {
  return 'bg-yellow-100 dark:bg-yellow-900 border-yellow-600 dark:border-yellow-500 border-4 border-dashed';
}

type GamePhase = 'connecting' | 'waiting' | 'draft' | 'play' | 'cleanup' | 'redraft' | 'ended';

export default function InkpotsOnlineGame() {
  const params = useParams();
  const searchParams = useSearchParams();
  const gameId = params.gameId as string;
  const isHost = searchParams.get('host') === 'true';

  // My state
  const [myLetters, setMyLetters] = useState<LetterCard[]>([]);
  const [myChoices, setMyChoices] = useState<LetterCard[]>([]);
  const [myWordBar, setMyWordBar] = useState<(LetterCard | null)[]>(Array(7).fill(null));
  const [myUsedLetterIndices, setMyUsedLetterIndices] = useState<Set<number>>(new Set());
  const [myWordBarToSource, setMyWordBarToSource] = useState<Map<number, {type: 'letter', index: number}>>(new Map());
  const [myWords, setMyWords] = useState<Array<{word: string, coins: number, isPassed?: boolean}>>([]);
  const [myBookLetters, setMyBookLetters] = useState(0);
  const [myCoins, setMyCoins] = useState(0);
  const [myItems, setMyItems] = useState<Set<ItemId>>(new Set());
  const [myActiveItems, setMyActiveItems] = useState<Set<ItemId>>(new Set());
  const [myDraftComplete, setMyDraftComplete] = useState(false);
  const [myPlayComplete, setMyPlayComplete] = useState(false);
  const [myCleanupReady, setMyCleanupReady] = useState(false);
  const [mySpeedWritingFirstWord, setMySpeedWritingFirstWord] = useState<string | null>(null);
  const [mySpeedWritingWordsPlayed, setMySpeedWritingWordsPlayed] = useState(0);

  // Opponent state (limited info during draft/play, full info during cleanup)
  const [opponentBookLetters, setOpponentBookLetters] = useState(0);
  const [opponentCoins, setOpponentCoins] = useState(0);
  const [opponentWords, setOpponentWords] = useState<Array<{word: string, coins: number, isPassed?: boolean}>>([]);
  const [opponentDraftComplete, setOpponentDraftComplete] = useState(false);
  const [opponentPlayComplete, setOpponentPlayComplete] = useState(false);
  const [opponentCleanupReady, setOpponentCleanupReady] = useState(false);
  const [opponentItems, setOpponentItems] = useState<Set<ItemId>>(new Set());
  const [opponentActiveItems, setOpponentActiveItems] = useState<Set<ItemId>>(new Set());

  const [currentWord, setCurrentWord] = useState('');
  const [gamePhase, setGamePhase] = useState<GamePhase>('connecting');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [showShop, setShowShop] = useState(false);
  const [draggedFrom, setDraggedFrom] = useState<{type: 'letter' | 'wordBar', index: number} | null>(null);

  // Multiplayer state
  const [myPlayerNumber, setMyPlayerNumber] = useState<1 | 2 | null>(null);
  const [shareableLink, setShareableLink] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');

  // WebRTC state
  const peerRef = useRef<Peer | null>(null);
  const connectionRef = useRef<DataConnection | null>(null);

  // Use the custom validation hook
  const { isValid } = useWordValidation(currentWord);

  // Copy link to clipboard
  const handleCopyLink = () => {
    const guestLink = shareableLink.replace('host=true', 'host=false');
    navigator.clipboard.writeText(guestLink);
    alert('Link copied! Share it with your opponent.');
  };

  // Initialize PeerJS
  useEffect(() => {
    const link = window.location.href;
    setShareableLink(isHost ? link.replace('host=true', 'host=false') : link);

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

        setTimeout(() => {
          console.log('Attempting to connect to host with ID:', gameId);
          const conn = peer.connect(gameId, { reliable: true });
          connectionRef.current = conn;

          conn.on('open', () => {
            console.log('Connected to host!');
            setConnectionStatus('Connected! Waiting for game start...');
            conn.send({ type: 'player-joined' });
          });

          conn.on('data', handlePeerData);

          conn.on('close', () => {
            setConnectionStatus('Connection lost');
          });

          conn.on('error', (err) => {
            console.error('Connection error:', err);
            setConnectionStatus(`Connection failed: ${err.type}`);
          });
        }, 1000);
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
          // Start the game - both players start drafting
          const initialChoices = generateChoices(3);
          setMyChoices(initialChoices);
          setGamePhase('draft');

          conn.send({
            type: 'game-start'
          });
        });

        conn.on('close', () => {
          setConnectionStatus('Opponent disconnected');
        });
      });
    }

    peer.on('error', (err) => {
      console.error('Peer error:', err);

      if (err.type === 'unavailable-id' && isHost) {
        setConnectionStatus('Game ID already in use, generating new one...');
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 7);
        const newGameId = `${timestamp}-${random}`;
        window.location.href = `/games/inkpots-online/${newGameId}?host=true`;
      } else if (err.type === 'peer-unavailable') {
        setConnectionStatus('Host not found. Please check the game ID.');
      } else {
        setConnectionStatus(`Error: ${err.type}`);
      }
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
      const initialChoices = generateChoices(3);
      setMyChoices(initialChoices);
      setGamePhase('draft');
    } else if (data.type === 'draft-complete') {
      setOpponentDraftComplete(true);
      setOpponentActiveItems(new Set(data.activeItems));
    } else if (data.type === 'play-complete') {
      setOpponentPlayComplete(true);
      setOpponentWords(data.words);
      setOpponentBookLetters(data.bookLetters);
      setOpponentCoins(data.coins);
      setOpponentActiveItems(new Set(data.activeItems));
    } else if (data.type === 'cleanup-sync') {
      // During cleanup, sync full game state
      setOpponentBookLetters(data.bookLetters);
      setOpponentCoins(data.coins);
      setOpponentWords(data.words);
      setOpponentActiveItems(new Set(data.activeItems));
      setOpponentItems(new Set(data.items));

      if (data.gameOver) {
        setGameOver(true);
        setWinner(data.winner);
        setGamePhase('ended');
      }
    } else if (data.type === 'item-update') {
      setOpponentItems(new Set(data.items));
      setOpponentActiveItems(new Set(data.activeItems));
    } else if (data.type === 'cleanup-ready') {
      setOpponentCleanupReady(true);
    }
  };

  // Send draft complete notification
  const notifyDraftComplete = () => {
    if (connectionRef.current) {
      connectionRef.current.send({
        type: 'draft-complete',
        activeItems: Array.from(myActiveItems)
      });
    }
  };

  // Send play complete notification
  const notifyPlayComplete = () => {
    if (connectionRef.current) {
      connectionRef.current.send({
        type: 'play-complete',
        words: myWords,
        bookLetters: myBookLetters,
        coins: myCoins,
        activeItems: Array.from(myActiveItems)
      });
    }
  };

  // Send cleanup sync
  const sendCleanupSync = (isGameOver: boolean = false, gameWinner: 1 | 2 | null = null) => {
    if (connectionRef.current) {
      connectionRef.current.send({
        type: 'cleanup-sync',
        bookLetters: myBookLetters,
        coins: myCoins,
        words: myWords,
        activeItems: Array.from(myActiveItems),
        items: Array.from(myItems),
        gameOver: isGameOver,
        winner: gameWinner
      });
    }
  };

  // Send item update
  const sendItemUpdate = () => {
    if (connectionRef.current) {
      connectionRef.current.send({
        type: 'item-update',
        items: Array.from(myItems),
        activeItems: Array.from(myActiveItems)
      });
    }
  };

  // Send cleanup ready notification
  const notifyCleanupReady = () => {
    if (connectionRef.current) {
      connectionRef.current.send({
        type: 'cleanup-ready'
      });
    }
  };

  // Update current word whenever word bar changes
  useEffect(() => {
    const word = myWordBar.filter(card => card !== null).map(card => card!.letter).join('');
    setCurrentWord(word);
  }, [myWordBar]);

  // Check if both players are ready to move to next phase
  useEffect(() => {
    if (gamePhase === 'draft' && myDraftComplete && opponentDraftComplete) {
      // Both players finished draft, move to play
      setGamePhase('play');
      setMyPlayComplete(false);
      setOpponentPlayComplete(false);
    } else if (gamePhase === 'play' && myPlayComplete && opponentPlayComplete) {
      // Both players finished play, move to cleanup
      setGamePhase('cleanup');
      sendCleanupSync();
    } else if (gamePhase === 'cleanup' && myCleanupReady && opponentCleanupReady) {
      // Both players ready to continue from cleanup, move to redraft
      setMyLetters([]);
      setMyDraftComplete(false);
      setOpponentDraftComplete(false);
      setMyCleanupReady(false);
      setOpponentCleanupReady(false);
      const choiceCount = getDraftChoiceCount();
      setMyChoices(generateChoices(choiceCount));
      setGamePhase('redraft');
    } else if (gamePhase === 'redraft' && myDraftComplete && opponentDraftComplete) {
      // Both players finished redraft, move to play
      setGamePhase('play');
      setMyPlayComplete(false);
      setOpponentPlayComplete(false);
    }
  }, [myDraftComplete, opponentDraftComplete, myPlayComplete, opponentPlayComplete, myCleanupReady, opponentCleanupReady, gamePhase]);

  // Item system helper functions
  const hasActiveItem = (itemId: ItemId): boolean => {
    return myActiveItems.has(itemId);
  };

  const consumeItem = (itemId: ItemId) => {
    const newActive = new Set(myActiveItems);
    newActive.delete(itemId);
    setMyActiveItems(newActive);
    sendItemUpdate();
  };

  const getActiveEffects = (effectType: string) => {
    const effects: any[] = [];

    // Check opponent's ACTIVE items that affect me
    opponentActiveItems.forEach(itemId => {
      const item = ITEMS[itemId];
      if (item.affectsOpponent) {
        effects.push(...item.effects.filter((e: any) => e.type === effectType));
      }
    });

    // Check my own ACTIVE items (that affect me)
    myActiveItems.forEach(itemId => {
      const item = ITEMS[itemId];
      if (!item.affectsOpponent) {
        effects.push(...item.effects.filter((e: any) => e.type === effectType));
      }
    });

    return effects;
  };

  const getDraftChoiceCount = (): number => {
    const draftReduceEffects = getActiveEffects('draft_reduce');
    if (draftReduceEffects.length > 0) {
      return Math.min(...draftReduceEffects.map((e: any) => e.type === 'draft_reduce' ? e.value : 3));
    }
    return 3;
  };

  const getTotalDraftPicks = (): number => {
    const extraPicksEffects = getActiveEffects('extra_draft_picks');
    const extraPicks = extraPicksEffects.reduce((total: number, e: any) =>
      total + (e.type === 'extra_draft_picks' ? e.value : 0), 0);
    return 5 + extraPicks;
  };

  const handleChooseLetter = (card: LetterCard) => {
    if (myDraftComplete) return;

    const newLetters = [...myLetters, card];
    setMyLetters(newLetters);

    const totalPicks = getTotalDraftPicks();
    if (newLetters.length >= totalPicks) {
      // Draft complete
      consumeItem('crunch_time');

      // Apply Stroke of Genius (all vowels)
      if (hasActiveItem('stroke_of_genius')) {
        const vowels: LetterCard[] = ['A', 'E', 'I', 'O', 'U'].map(letter => ({
          letter,
          coinValue: getCoinValue(letter)
        }));
        setMyLetters([...newLetters, ...vowels]);
        consumeItem('stroke_of_genius');
      }

      setMyDraftComplete(true);
      notifyDraftComplete();
    } else {
      const choiceCount = getDraftChoiceCount();
      setMyChoices(generateChoices(choiceCount));
    }
  };

  // Move letter card to word bar
  const moveLetterToWordBar = (letterIndex: number) => {
    if (myUsedLetterIndices.has(letterIndex)) return;

    const firstEmptyIndex = myWordBar.findIndex(card => card === null);
    if (firstEmptyIndex === -1) return;

    const newWordBar = [...myWordBar];
    newWordBar[firstEmptyIndex] = myLetters[letterIndex];
    setMyWordBar(newWordBar);

    const newUsedIndices = new Set([...myUsedLetterIndices, letterIndex]);
    setMyUsedLetterIndices(newUsedIndices);
    const newMapping = new Map(myWordBarToSource);
    newMapping.set(firstEmptyIndex, {type: 'letter', index: letterIndex});
    setMyWordBarToSource(newMapping);
  };

  // Remove card from word bar
  const removeFromWordBar = (wordBarIndex: number) => {
    if (myWordBar[wordBarIndex] === null) return;

    const source = myWordBarToSource.get(wordBarIndex);

    const newWordBar = [...myWordBar];
    newWordBar[wordBarIndex] = null;
    setMyWordBar(newWordBar);

    if (source !== undefined && source.type === 'letter') {
      const newUsedIndices = new Set(myUsedLetterIndices);
      newUsedIndices.delete(source.index);
      setMyUsedLetterIndices(newUsedIndices);

      const newMapping = new Map(myWordBarToSource);
      newMapping.delete(wordBarIndex);
      setMyWordBarToSource(newMapping);
    }
  };

  // Calculate coins from word
  const calculateCoins = (cards: LetterCard[]): number => {
    return cards.reduce((total, card) => total + card.coinValue, 0);
  };

  // Purchase item
  const handlePurchaseItem = (itemId: ItemId) => {
    const item = ITEMS[itemId];

    if (item.oneTime && hasActiveItem(itemId)) {
      return;
    }

    if (myCoins < item.cost) {
      return;
    }

    const newCoins = myCoins - item.cost;
    const newItems = new Set([...myItems, itemId]);
    setMyCoins(newCoins);
    setMyItems(newItems);

    if (item.oneTime) {
      const newActive = new Set([...myActiveItems, itemId]);
      setMyActiveItems(newActive);
    }

    sendItemUpdate();
    setShowShop(false);
  };

  // Skip turn
  const handleSkipTurn = () => {
    if (myPlayComplete) return;

    if (hasActiveItem('speed_writing')) {
      consumeItem('speed_writing');
      setMySpeedWritingFirstWord(null);
      setMySpeedWritingWordsPlayed(0);
    }

    const newWords = [...myWords, { word: 'PASS', coins: 0, isPassed: true }];
    setMyWords(newWords);

    setMyWordBar(Array(7).fill(null));
    setMyUsedLetterIndices(new Set());
    setMyWordBarToSource(new Map());

    setMyPlayComplete(true);
    notifyPlayComplete();
  };

  // Submit word
  const submitWord = () => {
    if (myPlayComplete) return;
    if (!isValid || currentWord.length < 3) return;

    const usedCards = myWordBar.filter(card => card !== null) as LetterCard[];
    let coins = calculateCoins(usedCards);
    const letterCount = currentWord.length;

    const isSpeedWritingActive = hasActiveItem('speed_writing');
    const isSecondWord = isSpeedWritingActive && mySpeedWritingWordsPlayed === 1;

    if (isSecondWord && currentWord.toUpperCase() === mySpeedWritingFirstWord) {
      alert('You must play a different word for your second word!');
      return;
    }

    const isWordDeleted = opponentActiveItems.has('throw_some_ink');

    let newWords = myWords;
    let newBookLetters = myBookLetters;
    let newCoins = myCoins;
    let isGameOver = false;
    let gameWinner: 1 | 2 | null = null;

    if (isWordDeleted) {
      // Remove opponent's throw_some_ink (we need to notify them)
      newWords = [...myWords, { word: `${currentWord.toUpperCase()} (DELETED)`, coins: 0, isPassed: false }];
      setMyWords(newWords);
    } else {
      if (hasActiveItem('publishers_favor')) {
        coins = coins * 3;
        consumeItem('publishers_favor');
      }

      newWords = [...myWords, { word: currentWord.toUpperCase(), coins }];
      newBookLetters = myBookLetters + letterCount;
      newCoins = myCoins + coins;
      setMyWords(newWords);
      setMyBookLetters(newBookLetters);
      setMyCoins(newCoins);

      if (newBookLetters >= 50) {
        isGameOver = true;
        gameWinner = myPlayerNumber;
        setGameOver(true);
        setWinner(myPlayerNumber);
      }
    }

    // Handle Speed Writing logic
    if (isSpeedWritingActive && mySpeedWritingWordsPlayed === 0) {
      setMySpeedWritingFirstWord(currentWord.toUpperCase());
      setMySpeedWritingWordsPlayed(1);

      setMyWordBar(Array(7).fill(null));
      setMyUsedLetterIndices(new Set());
      setMyWordBarToSource(new Map());

      // Don't complete play yet - player gets to play another word
      return;
    } else if (isSecondWord) {
      consumeItem('speed_writing');
      setMySpeedWritingFirstWord(null);
      setMySpeedWritingWordsPlayed(0);
    }

    setMyWordBar(Array(7).fill(null));
    setMyUsedLetterIndices(new Set());
    setMyWordBarToSource(new Map());

    setMyPlayComplete(true);
    notifyPlayComplete();

    if (isGameOver) {
      sendCleanupSync(true, gameWinner);
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
      if (myUsedLetterIndices.has(draggedFrom.index)) return;

      const newWordBar = [...myWordBar];
      const newUsedLetters = new Set(myUsedLetterIndices);
      const newMapping = new Map(myWordBarToSource);

      if (myWordBar[targetIndex] !== null) {
        const oldSource = myWordBarToSource.get(targetIndex);
        if (oldSource) {
          newUsedLetters.delete(oldSource.index);
          newMapping.delete(targetIndex);
        }
      }

      newWordBar[targetIndex] = myLetters[draggedFrom.index];
      newUsedLetters.add(draggedFrom.index);
      newMapping.set(targetIndex, {type: 'letter', index: draggedFrom.index});

      setMyWordBar(newWordBar);
      setMyUsedLetterIndices(newUsedLetters);
      setMyWordBarToSource(newMapping);
    } else if (draggedFrom.type === 'wordBar') {
      const fromIndex = draggedFrom.index;

      if (fromIndex === targetIndex) {
        setDraggedFrom(null);
        return;
      }

      const newWordBar = [...myWordBar];
      const newMapping = new Map(myWordBarToSource);

      if (newWordBar[targetIndex] === null) {
        newWordBar[targetIndex] = newWordBar[fromIndex];
        newWordBar[fromIndex] = null;

        const source = myWordBarToSource.get(fromIndex);
        if (source !== undefined) {
          newMapping.delete(fromIndex);
          newMapping.set(targetIndex, source);
        }
      } else {
        const temp = newWordBar[targetIndex];
        newWordBar[targetIndex] = newWordBar[fromIndex];
        newWordBar[fromIndex] = temp;

        const fromSource = myWordBarToSource.get(fromIndex);
        const toSource = myWordBarToSource.get(targetIndex);
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

      setMyWordBar(newWordBar);
      setMyWordBarToSource(newMapping);
    }

    setDraggedFrom(null);
  };

  const currentCoins = myWordBar.filter(card => card !== null).length > 0
    ? calculateCoins(myWordBar.filter(card => card !== null) as LetterCard[])
    : 0;

  // Connecting UI
  if (gamePhase === 'connecting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-500">
        <GameNav currentGame="inkpots-online" />

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
        <GameNav currentGame="inkpots-online" />

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
    <div className="min-h-screen p-4 md:p-8">
      <GameNav currentGame="inkpots-online" />

      {/* Shop Icon - Top Right */}
      {(gamePhase === 'play' || gamePhase === 'cleanup') && !gameOver && (
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
                Your Coins: {myCoins}
              </p>
            </div>

            <div className="space-y-4">
              {Object.values(ITEMS).map(item => (
                <div key={item.id} className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:border-yellow-500 transition-colors">
                  <div className="flex justify-between items-center">
                    <div className="flex-1 mr-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{item.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                    </div>
                    <button
                      onClick={() => handlePurchaseItem(item.id)}
                      disabled={
                        myCoins < item.cost ||
                        (item.oneTime && hasActiveItem(item.id))
                      }
                      className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${
                        (item.oneTime && hasActiveItem(item.id))
                          ? 'bg-green-400 text-white cursor-not-allowed'
                          : myCoins >= item.cost
                            ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                            : 'bg-gray-300 text-gray-700 cursor-not-allowed'
                      }`}
                    >
                      {item.oneTime && hasActiveItem(item.id) ? 'Active' : `${item.cost} coins`}
                    </button>
                  </div>
                </div>
              ))}
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
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Inkpots Online
          <span className="text-sm ml-3 text-purple-600 dark:text-purple-400">
            You are Player {myPlayerNumber}
          </span>
        </h1>

        {(gamePhase === 'draft' || gamePhase === 'redraft') && (
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Draft your letters ({myLetters.length}/{getTotalDraftPicks()})
            {myDraftComplete && <span className="ml-2 text-green-600 font-bold">(Waiting for opponent...)</span>}
          </p>
        )}

        {gamePhase === 'play' && !gameOver && (
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Play Phase
            {myPlayComplete && <span className="ml-2 text-green-600 font-bold">(Waiting for opponent...)</span>}
            {hasActiveItem('speed_writing') && mySpeedWritingWordsPlayed === 1 && (
              <span className="ml-3 text-green-600 dark:text-green-400 font-bold">
                (Word 2 of 2 - Speed Writing!)
              </span>
            )}
            {hasActiveItem('speed_writing') && mySpeedWritingWordsPlayed === 0 && (
              <span className="ml-3 text-green-600 dark:text-green-400 font-bold">
                (Word 1 of 2 - Speed Writing Active!)
              </span>
            )}
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
              Player {winner} Wins! {winner === myPlayerNumber && '(You!)'}
            </p>
            <div className="mb-4 space-y-2">
              <p className="text-lg md:text-xl text-gray-900 dark:text-gray-100">
                <span className="font-bold text-blue-600 dark:text-blue-400">Player {myPlayerNumber === 1 ? '1 (You)' : '2 (Opponent)'}:</span> {myPlayerNumber === 1 ? myBookLetters : opponentBookLetters} letters, {myPlayerNumber === 1 ? myCoins : opponentCoins} coins
              </p>
              <p className="text-lg md:text-xl text-gray-900 dark:text-gray-100">
                <span className="font-bold text-orange-600 dark:text-orange-400">Player {myPlayerNumber === 2 ? '2 (You)' : '1 (Opponent)'}:</span> {myPlayerNumber === 2 ? myBookLetters : opponentBookLetters} letters, {myPlayerNumber === 2 ? myCoins : opponentCoins} coins
              </p>
            </div>
          </div>
        )}

        {/* Draft Phase - Current Choices */}
        {(gamePhase === 'draft' || gamePhase === 'redraft') && !myDraftComplete && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Choose a letter:</h2>
            <div className="flex gap-4 justify-center mb-4">
              {myChoices.map((card, idx) => (
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

        {/* Cleanup Phase */}
        {gamePhase === 'cleanup' && (
          <>
            {/* Book Progress Bars */}
            <div className="mb-8 flex justify-center gap-12 items-start">
              {/* My Book */}
              <div className="flex flex-col items-center">
                {myWords.length > 0 && (
                  <div className="mb-4">
                    <p className="font-semibold text-blue-600 dark:text-blue-400 mb-2 text-sm">Your Words</p>
                    <div className="space-y-1">
                      {myWords.map((wordData, idx) => (
                        <div key={idx} className={`text-sm text-gray-800 dark:text-gray-200 ${wordData.isPassed ? 'italic' : ''}`}>
                          {wordData.word}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                  Your Book
                </p>
                <div className="w-48">
                  <div className="flex justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    <span>Letters</span>
                    <span>{myBookLetters}/50</span>
                  </div>
                  <div className="w-full h-6 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden border-2 border-gray-400 dark:border-gray-500">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${(myBookLetters / 50) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mt-2">
                    {myCoins} coins
                  </p>
                </div>
              </div>

              {/* Opponent Book */}
              <div className="flex flex-col items-center">
                {opponentWords.length > 0 && (
                  <div className="mb-4">
                    <p className="font-semibold text-orange-600 dark:text-orange-400 mb-2 text-sm">Opponent's Words</p>
                    <div className="space-y-1">
                      {opponentWords.map((wordData, idx) => (
                        <div key={idx} className={`text-sm text-gray-800 dark:text-gray-200 ${wordData.isPassed ? 'italic' : ''}`}>
                          {wordData.word}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-2">
                  Opponent's Book
                </p>
                <div className="w-48">
                  <div className="flex justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    <span>Letters</span>
                    <span>{opponentBookLetters}/50</span>
                  </div>
                  <div className="w-full h-6 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden border-2 border-gray-400 dark:border-gray-500">
                    <div
                      className="h-full bg-orange-600 transition-all duration-300"
                      style={{ width: `${(opponentBookLetters / 50) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mt-2">
                    {opponentCoins} coins
                  </p>
                </div>
              </div>
            </div>

            {/* Ready Button - both players must confirm */}
            <div className="mb-6">
              {!myCleanupReady ? (
                <button
                  onClick={() => {
                    setMyCleanupReady(true);
                    notifyCleanupReady();
                  }}
                  className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold text-lg"
                >
                  Ready to Continue
                </button>
              ) : (
                <p className="text-green-600 dark:text-green-400 font-bold">
                  {opponentCleanupReady ? 'Both players ready! Starting next round...' : 'Waiting for opponent to be ready...'}
                </p>
              )}
            </div>
          </>
        )}

        {/* Play Phase - Book Progress */}
        {gamePhase === 'play' && !gameOver && (
          <>
            {/* Book Progress Bars - only show letters, not coins */}
            <div className="mb-8 flex justify-center gap-12 items-start">
              {/* My Book */}
              <div className="flex flex-col items-center">
                {myWords.length > 0 && (
                  <div className="mb-4">
                    <p className="font-semibold text-blue-600 dark:text-blue-400 mb-2 text-sm">Your Words</p>
                    <div className="space-y-1">
                      {myWords.map((wordData, idx) => (
                        <div key={idx} className={`text-sm text-gray-800 dark:text-gray-200 ${wordData.isPassed ? 'italic' : ''}`}>
                          {wordData.word}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                  Your Book
                </p>
                <div className="w-48">
                  <div className="flex justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    <span>Letters</span>
                    <span>{myBookLetters}/50</span>
                  </div>
                  <div className="w-full h-6 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden border-2 border-gray-400 dark:border-gray-500">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${(myBookLetters / 50) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mt-2">
                    {myCoins} coins
                  </p>
                </div>
              </div>

              {/* Opponent Book - only show letters, not coins during play */}
              <div className="flex flex-col items-center">
                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-2">
                  Opponent's Book
                </p>
                <div className="w-48">
                  <div className="flex justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    <span>Letters</span>
                    <span>{opponentBookLetters}/50</span>
                  </div>
                  <div className="w-full h-6 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden border-2 border-gray-400 dark:border-gray-500">
                    <div
                      className="h-full bg-orange-600 transition-all duration-300"
                      style={{ width: `${(opponentBookLetters / 50) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mt-2">
                    {opponentCoins} coins
                  </p>
                </div>
              </div>
            </div>

            {!myPlayComplete && (
              <>
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
                    {myWordBar.map((card, index) => (
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
          </>
        )}

        {/* Letters Display */}
        <div className="mb-8">
          {(gamePhase === 'draft' || gamePhase === 'redraft') && (
            <>
              <h2 className="text-xl font-semibold mb-4">
                Your Letters ({myLetters.length} cards)
              </h2>
              {myLetters.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 italic">No cards chosen yet</p>
              ) : (
                <div className="flex flex-wrap gap-3 justify-center max-w-4xl mx-auto">
                  {myLetters.map((card, idx) => (
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

          {gamePhase === 'play' && !gameOver && !myPlayComplete && (
            <>
              <h2 className="text-lg font-semibold mb-3">
                Your Letters
              </h2>
              <div className="flex gap-3 justify-center items-center mb-6">
                {myLetters.map((card, idx) => {
                  const isUsed = myUsedLetterIndices.has(idx);
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
