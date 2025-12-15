import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-blue-500">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-6xl font-bold text-white text-center mb-4">
          Word Games
        </h1>
        <p className="text-xl text-white text-center mb-12 opacity-90">
          Choose your game mode and start playing!
        </p>

        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Game 1 - Blackout */}
          <Link href="/games/blackout">
            <div className="bg-white rounded-2xl p-8 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-bold text-gray-800">Blackout</h2>
                <div className="text-4xl">🎯</div>
              </div>
              <p className="text-gray-600 mb-4">
                Strategic two-player word game. Spell words to score points, but tiles are used only once!
              </p>
              <ul className="space-y-2 text-sm text-gray-700 mb-6">
                <li>✓ Turn-based gameplay</li>
                <li>✓ Tiles black out when used</li>
                <li>✓ Plan your moves carefully</li>
                <li>✓ Highest score wins</li>
              </ul>
              <div className="bg-blue-500 text-white text-center py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors">
                Play Blackout
              </div>
            </div>
          </Link>

          {/* Game 1.5 - Blackout V2 */}
          <Link href="/games/blackoutv2">
            <div className="bg-white rounded-2xl p-8 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-bold text-gray-800">Blackout V2</h2>
                <div className="text-4xl">🎯✨</div>
              </div>
              <p className="text-gray-600 mb-4">
                Strategic 2-player word battle on an 8x8 grid. 6 turns each to score the most points!
              </p>
              <ul className="space-y-2 text-sm text-gray-700 mb-6">
                <li>✓ Snake turn order (P1, P2, P2, P1...)</li>
                <li>✓ Select adjacent tiles to form words</li>
                <li>✓ Length bonus: +1 point per letter</li>
                <li>✓ 60-second turn timer with auto-pass</li>
                <li>✓ Used tiles stay colored by player</li>
                <li>✓ Game ends after 6 turns each</li>
              </ul>
              <div className="bg-indigo-500 text-white text-center py-3 rounded-lg font-semibold hover:bg-indigo-600 transition-colors">
                Play Blackout V2
              </div>
            </div>
          </Link>

          {/* Game 2 - Battle */}
          <Link href="/games/battle">
            <div className="bg-white rounded-2xl p-8 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-bold text-gray-800">Battle</h2>
                <div className="text-4xl">⚔️</div>
              </div>
              <p className="text-gray-600 mb-4">
                Word battle mode! Spell words to deal damage to your opponent. First to zero health loses!
              </p>
              <ul className="space-y-2 text-sm text-gray-700 mb-6">
                <li>✓ Health-based combat</li>
                <li>✓ Tiles drop and refill</li>
                <li>✓ Word damage = letter points</li>
                <li>✓ 2-player local battle</li>
              </ul>
              <div className="bg-red-500 text-white text-center py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors">
                Play Battle
              </div>
            </div>
          </Link>

          {/* Game 3 - AI Battle */}
          <Link href="/games/singleplayerbattle">
            <div className="bg-white rounded-2xl p-8 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-bold text-gray-800">AI Battle</h2>
                <div className="text-4xl">🤖</div>
              </div>
              <p className="text-gray-600 mb-4">
                Challenge an AI opponent! Choose your difficulty and battle with words.
              </p>
              <ul className="space-y-2 text-sm text-gray-700 mb-6">
                <li>✓ Single-player mode</li>
                <li>✓ 3 difficulty levels</li>
                <li>✓ AI finds words automatically</li>
                <li>✓ Same battle rules</li>
              </ul>
              <div className="bg-green-500 text-white text-center py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors">
                Play AI Battle
              </div>
            </div>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Game 4 - Deck */}
          <Link href="/games/deck">
            <div className="bg-white rounded-2xl p-8 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-bold text-gray-800">Deck</h2>
                <div className="text-4xl">🃏</div>
              </div>
              <p className="text-gray-600 mb-4">
                Build words from your hand of 10 letter cards!
              </p>
              <ul className="space-y-2 text-sm text-gray-700 mb-6">
                <li>✓ 10-card deck</li>
                <li>✓ Drag and drop cards</li>
                <li>✓ Word bar interface</li>
                <li>✓ Refresh deck option</li>
              </ul>
              <div className="bg-purple-500 text-white text-center py-3 rounded-lg font-semibold hover:bg-purple-600 transition-colors">
                Play Deck
              </div>
            </div>
          </Link>

          {/* Game 5 - Word Cross */}
          <Link href="/games/wordcross">
            <div className="bg-white rounded-2xl p-8 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-bold text-gray-800">Word Cross</h2>
                <div className="text-4xl">📝</div>
              </div>
              <p className="text-gray-600 mb-4">
                Place letters on a 5x5 grid to create crossword-style words!
              </p>
              <ul className="space-y-2 text-sm text-gray-700 mb-6">
                <li>✓ 5x5 grid gameplay</li>
                <li>✓ 25-card deck</li>
                <li>✓ 10-tile storage bench</li>
                <li>✓ Crossword validation</li>
              </ul>
              <div className="bg-orange-500 text-white text-center py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors">
                Play Word Cross
              </div>
            </div>
          </Link>

          {/* Game 6 - Word Cross V2 */}
          <Link href="/games/wordcrossv2">
            <div className="bg-white rounded-2xl p-8 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-bold text-gray-800">Word Cross V2</h2>
                <div className="text-4xl">📝✨</div>
              </div>
              <p className="text-gray-600 mb-4">
                Enhanced crossword builder with new features!
              </p>
              <ul className="space-y-2 text-sm text-gray-700 mb-6">
                <li>✓ 5x5 grid gameplay</li>
                <li>✓ 25-card deck</li>
                <li>✓ 10-tile storage bench</li>
                <li>✓ Crossword validation</li>
              </ul>
              <div className="bg-pink-500 text-white text-center py-3 rounded-lg font-semibold hover:bg-pink-600 transition-colors">
                Play Word Cross V2
              </div>
            </div>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Game 7 - Librarian's Tower */}
          <Link href="/games/librarianstower">
            <div className="bg-white rounded-2xl p-8 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-bold text-gray-800">Librarian's Tower</h2>
                <div className="text-4xl">📚</div>
              </div>
              <p className="text-gray-600 mb-4">
                Balance mind and muscle! Fill both bars within 3 words to win.
              </p>
              <ul className="space-y-2 text-sm text-gray-700 mb-6">
                <li>✓ Mind & Muscle bars</li>
                <li>✓ 3 word limit</li>
                <li>✓ Strategic gameplay</li>
                <li>✓ Drag and drop cards</li>
              </ul>
              <div className="bg-teal-500 text-white text-center py-3 rounded-lg font-semibold hover:bg-teal-600 transition-colors">
                Play Librarian's Tower
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-12 text-center text-white opacity-75">
          <p className="text-sm">

          </p>
        </div>
      </div>
    </div>
  );
}
