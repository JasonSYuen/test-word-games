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

        <div className="grid md:grid-cols-2 gap-8 mb-8 max-w-3xl mx-auto">
          {/* Blackout V2 */}
          <Link href="/games/blackoutv2">
            <div className="bg-white rounded-2xl p-8 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-bold text-gray-800">Blackout V2</h2>
                <div className="text-4xl">🎯✨</div>
              </div>
              <p className="text-gray-600 mb-4 font-semibold">
                Strategic 2-player word battle on an 8x8 grid. Score the most points in 6 turns each!
              </p>
              <div className="space-y-2 text-sm text-gray-700 mb-6">
                <p className="font-semibold text-gray-800">How to Play:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Click adjacent tiles to form words (3+ letters)</li>
                  <li>• Submit your word before the 60-second timer expires</li>
                  <li>• Used tiles can't be used again</li>
                  <li>• Each player gets exactly 6 turns</li>
                  <li>• Snake turn order "p1, p2, p2, p1 ..."</li>
                  <li>• Highest total score wins</li>
                </ul>
                <p className="font-semibold text-gray-800 mt-3">Scoring:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Base points: Sum of letter values</li>
                  <li>• Length bonus: +1 point per letter</li>
                  <li>• Example: 5-letter word = letters + 5 bonus</li>
                </ul>
              </div>
              <div className="bg-indigo-500 text-white text-center py-3 rounded-lg font-semibold hover:bg-indigo-600 transition-colors">
                Play Blackout V2
              </div>
            </div>
          </Link>

          {/* Word Cross V2 */}
          <Link href="/games/wordcrossv2">
            <div className="bg-white rounded-2xl p-8 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-bold text-gray-800">Word Cross V2</h2>
                <div className="text-4xl">📝✨</div>
              </div>
              <p className="text-gray-600 mb-4 font-semibold">
                Arrange 25 letter tiles into a 5x5 crossword grid to match the target score!
              </p>
              <div className="space-y-2 text-sm text-gray-700 mb-6">
                <p className="font-semibold text-gray-800">How to Play:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Drag letters from your deck onto the grid</li>
                  <li>• Form valid words horizontally and vertically</li>
                  <li>• All 25 tiles must be placed</li>
                  <li>• Match the exact target score to win</li>
                  <li>• No isolated letters allowed</li>
                  <li>• Words must be 2+ letters long</li>
                </ul>

              </div>
              <div className="bg-pink-500 text-white text-center py-3 rounded-lg font-semibold hover:bg-pink-600 transition-colors">
                Play Word Cross V2
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-12 text-center text-white opacity-75">
          <p className="text-sm">
            More games available in the game menu
          </p>
        </div>
      </div>
    </div>
  );
}
