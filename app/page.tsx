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

        <div className="grid md:grid-cols-3 gap-8">
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

        <div className="mt-12 text-center text-white opacity-75">
          <p className="text-sm">

          </p>
        </div>
      </div>
    </div>
  );
}
