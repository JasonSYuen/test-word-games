'use client'

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import GameNav from '@/app/components/GameNav';

export default function BlackoutOnlineLobby() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [gameIdInput, setGameIdInput] = useState('');

  const handleCreateGame = () => {
    setIsCreating(true);
    // Generate a unique game ID with timestamp to avoid collisions
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    const gameId = `${timestamp}-${random}`;
    router.push(`/games/blackout-online/${gameId}?host=true`);
  };

  const handleJoinGame = () => {
    if (gameIdInput.trim()) {
      router.push(`/games/blackout-online/${gameIdInput.trim()}?host=false`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-500">
      <GameNav currentGame="blackout-online" />

      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 md:p-12 max-w-2xl w-full text-center shadow-2xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            Blackout Online
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8">
            Play with friends across the internet - no sign up required!
          </p>

          <div className="space-y-4 mb-8">
            <div className="bg-blue-50 dark:bg-blue-950 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4">
              <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-gray-100">How to Play:</h3>
              <ul className="text-left space-y-1 text-gray-700 dark:text-gray-300">
                <li>• Create a game and share the link with your opponent</li>
                <li>• Take turns forming words on an 8x8 grid</li>
                <li>• Each player gets 6 turns with 60 seconds per turn</li>
                <li>• Score = letter value + length bonus</li>
                <li>• Highest total score wins!</li>
              </ul>
            </div>

            <div className="bg-green-50 dark:bg-green-950 border-2 border-green-300 dark:border-green-700 rounded-lg p-4">
              <p className="font-bold text-green-800 dark:text-green-300">
                ✨ Powered by WebRTC - Completely Free & Private!
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Direct peer-to-peer connection. No servers storing your data.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleCreateGame}
              disabled={isCreating}
              className="w-full px-8 py-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-xl transition-colors"
            >
              {isCreating ? 'Creating Game...' : 'Create New Game'}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Or join an existing game
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Game ID"
                value={gameIdInput}
                onChange={(e) => setGameIdInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
                className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
              <button
                onClick={handleJoinGame}
                disabled={!gameIdInput.trim()}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
