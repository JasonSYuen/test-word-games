'use client'

import { useState, useEffect } from "react";
import GameNav from '@/app/components/GameNav';

// Calculate hexagonal grid coordinates for a hexagon with side length 5
function generateHexGrid(sideLength: number): Array<{ q: number, r: number, s: number, color: string, claimed: boolean }> {
  const hexes: Array<{ q: number, r: number, s: number, color: string, claimed: boolean }> = [];
  // Vibrant colors for claimed tiles
  const colors = ['red', 'blue', 'green', 'yellow'];

  // Generate hexagon shape using axial coordinates
  for (let q = -sideLength + 1; q < sideLength; q++) {
    const r1 = Math.max(-sideLength + 1, -q - sideLength + 1);
    const r2 = Math.min(sideLength - 1, -q + sideLength - 1);

    for (let r = r1; r <= r2; r++) {
      const s = -q - r;
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      hexes.push({ q, r, s, color: randomColor, claimed: false });
    }
  }

  return hexes;
}

// Convert axial coordinates to pixel position
function axialToPixel(q: number, r: number, size: number): { x: number, y: number } {
  const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
  const y = size * (3 / 2 * r);
  return { x, y };
}

export default function EscapePage() {
  const [hexGrid, setHexGrid] = useState<Array<{ q: number, r: number, s: number, color: string, claimed: boolean }>>([]);
  const hexSize = 40; // Size of each hexagon in pixels
  const sideLength = 4;
  const [playerPosition, setPlayerPosition] = useState<{ q: number, r: number } | null>(null);
  const [heat, setHeat] = useState(0); // Range: -2 to 2, game over at -3 or 3
  const [power, setPower] = useState(0); // Range: -2 to 2, game over at -3 or 3
  const [gameOver, setGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);

  // Count claimed tiles
  const claimedTilesCount = hexGrid.filter(hex => hex.claimed).length;

  useEffect(() => {
    const grid = generateHexGrid(sideLength);
    setHexGrid(grid);
    // Place player at center (0, 0)
    setPlayerPosition({ q: 0, r: 0 });
    // Claim the starting hex
    const centerIndex = grid.findIndex(hex => hex.q === 0 && hex.r === 0);
    if (centerIndex !== -1) {
      grid[centerIndex].claimed = true;
    }
  }, []);

  // Check for game over conditions
  useEffect(() => {
    if (heat <= -3 || heat >= 3 || power <= -3 || power >= 3) {
      setGameOver(true);
    }
  }, [heat, power]);

  // Check if two hexes are adjacent
  const areAdjacent = (hex1: { q: number, r: number }, hex2: { q: number, r: number }): boolean => {
    const dq = hex2.q - hex1.q;
    const dr = hex2.r - hex1.r;

    // In axial coordinates, the 6 adjacent directions are:
    // +1,0  0,+1  -1,+1  -1,0  0,-1  +1,-1
    const adjacentDirections = [
      { q: 1, r: 0 },   // right
      { q: 0, r: 1 },   // bottom-right
      { q: -1, r: 1 },  // bottom-left
      { q: -1, r: 0 },  // left
      { q: 0, r: -1 },  // top-left
      { q: 1, r: -1 }   // top-right
    ];

    return adjacentDirections.some(dir => dir.q === dq && dir.r === dr);
  };

  // Handle hex click - move player if adjacent
  const handleHexClick = (index: number) => {
    if (!playerPosition || gameOver) return;

    const targetHex = hexGrid[index];

    // Check if target hex is adjacent to player's current position
    if (areAdjacent(playerPosition, { q: targetHex.q, r: targetHex.r })) {
      // Update heat and power based on tile color
      if (!targetHex.claimed) {
        switch (targetHex.color) {
          case 'red':
            setHeat(heat + 1);
            break;
          case 'blue':
            setHeat(heat - 1);
            break;
          case 'green':
            setPower(power + 1);
            break;
          case 'yellow':
            setPower(power - 1);
            break;
        }
      }

      // Move player
      setPlayerPosition({ q: targetHex.q, r: targetHex.r });

      // Claim the hex
      const newGrid = [...hexGrid];
      newGrid[index] = { ...newGrid[index], claimed: true };
      setHexGrid(newGrid);
    }
  };

  // Color mapping: unclaimed are muted/desaturated, claimed are vibrant
  const getColor = (colorName: string, claimed: boolean): string => {
    const colorMap: { [key: string]: { unclaimed: string; claimed: string } } = {
      'red': {
        unclaimed: '#7f1d1d',  // muted dark red
        claimed: '#dc2626'     // vibrant red
      },
      'blue': {
        unclaimed: '#1e3a8a',  // muted dark blue
        claimed: '#2563eb'     // vibrant blue
      },
      'green': {
        unclaimed: '#14532d',  // muted dark green
        claimed: '#16a34a'     // vibrant green
      },
      'yellow': {
        unclaimed: '#713f12',  // muted dark yellow/gold
        claimed: '#eab308'     // vibrant yellow
      }
    };

    return claimed ? colorMap[colorName].claimed : colorMap[colorName].unclaimed;
  };

  // Get bar color based on value
  const getHeatBarColor = (value: number): string => {
    // Gradient from blue (cold) to red (hot)
    if (value === -2) return '#3b82f6'; // bright blue
    if (value === -1) return '#60a5fa'; // light blue
    if (value === 0) return '#d1d5db';  // light neutral gray
    if (value === 1) return '#f87171';  // light red
    if (value === 2) return '#ef4444';  // bright red
    return '#d1d5db';
  };

  const getPowerBarColor = (value: number): string => {
    // Gradient from yellow (low) to green (high)
    if (value === -2) return '#eab308'; // bright yellow
    if (value === -1) return '#fde047'; // lighter yellow
    if (value === 0) return '#d1d5db';  // light neutral gray
    if (value === 1) return '#4ade80';  // light green
    if (value === 2) return '#22c55e';  // bright green
    return '#d1d5db';
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-500 p-4 md:p-8">
      {/* Win Modal */}
      {hasWon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md text-center shadow-2xl">
            <h2 className="text-4xl font-bold mb-4 text-green-600">You Win!</h2>
            <p className="text-xl mb-6 text-gray-700">
              You successfully escaped!
            </p>
            <button
              onClick={() => {
                const grid = generateHexGrid(sideLength);
                setHexGrid(grid);
                setPlayerPosition({ q: 0, r: 0 });
                setHeat(0);
                setPower(0);
                setGameOver(false);
                setHasWon(false);
                const centerIndex = grid.findIndex(hex => hex.q === 0 && hex.r === 0);
                if (centerIndex !== -1) {
                  grid[centerIndex].claimed = true;
                }
              }}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold text-lg"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameOver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md text-center shadow-2xl">
            <h2 className="text-4xl font-bold mb-4 text-red-600">Game Over!</h2>
            <p className="text-xl mb-6 text-gray-700">
              {heat <= -3 || heat >= 3 ? 'Heat levels critical!' : 'Power levels critical!'}
            </p>
            <button
              onClick={() => {
                const grid = generateHexGrid(sideLength);
                setHexGrid(grid);
                setPlayerPosition({ q: 0, r: 0 });
                setHeat(0);
                setPower(0);
                setGameOver(false);
                setHasWon(false);
                const centerIndex = grid.findIndex(hex => hex.q === 0 && hex.r === 0);
                if (centerIndex !== -1) {
                  grid[centerIndex].claimed = true;
                }
              }}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold text-lg"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      <GameNav currentGame="escape" />

      <div className="text-center pt-20 px-2">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">Escape</h1>

        <div className="flex justify-center items-start gap-8">
          {/* Heat and Power Bars */}
          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-6 text-black min-w-[250px]">
            <h2 className="text-2xl font-bold mb-6 text-center">Status</h2>

            {/* Heat Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">HEAT</span>
              </div>
              <div className="w-full bg-gray-700 h-8 rounded-lg overflow-hidden flex">
                {[-2, -1, 0, 1, 2].map((val) => (
                  <div
                    key={val}
                    className="flex-1 transition-all duration-300"
                    style={{
                      backgroundColor: getHeatBarColor(val)
                    }}
                  />
                ))}
              </div>
              <div className="relative">
                <div className="flex justify-between text-xs mt-1 opacity-75">
                  <span>-2</span>
                  <span>-1</span>
                  <span>0</span>
                  <span>1</span>
                  <span>2</span>
                </div>
                {/* Arrow indicator */}
                <div
                  className="absolute transition-all duration-300"
                  style={{
                    left: `${((heat + 2) / 4) * 100}%`,
                    top: '-6px',
                    transform: 'translateX(-50%)'
                  }}
                >
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-black"></div>
                </div>
              </div>
            </div>

            {/* Power Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">POWER</span>
              </div>
              <div className="w-full bg-gray-700 h-8 rounded-lg overflow-hidden flex">
                {[-2, -1, 0, 1, 2].map((val) => (
                  <div
                    key={val}
                    className="flex-1 transition-all duration-300"
                    style={{
                      backgroundColor: getPowerBarColor(val)
                    }}
                  />
                ))}
              </div>
              <div className="relative">
                <div className="flex justify-between text-xs mt-1 opacity-75">
                  <span>-2</span>
                  <span>-1</span>
                  <span>0</span>
                  <span>1</span>
                  <span>2</span>
                </div>
                {/* Arrow indicator */}
                <div
                  className="absolute transition-all duration-300"
                  style={{
                    left: `${((power + 2) / 4) * 100}%`,
                    top: '-6px',
                    transform: 'translateX(-50%)'
                  }}
                >
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-black"></div>
                </div>
              </div>
            </div>

            {/* Color Legend */}
            <div className="mt-6 pt-4 border-t border-black border-opacity-30">
              <p className="text-xs font-semibold mb-2">TILE EFFECTS:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#dc2626' }}></div>
                  <span>Red: Heat +1</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#2563eb' }}></div>
                  <span>Blue: Heat -1</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#16a34a' }}></div>
                  <span>Green: Power +1</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#eab308' }}></div>
                  <span>Yellow: Power -1</span>
                </div>
              </div>
            </div>

            {/* Escape Button */}
            <div className="mt-6 pt-4 border-t border-black border-opacity-30">
              <p className="text-xs mb-2 text-center">
                Tiles Claimed: {claimedTilesCount} / 30
              </p>
              <button
                onClick={() => {
                  if (claimedTilesCount >= 30) {
                    setHasWon(true);
                  }
                }}
                disabled={claimedTilesCount < 30}
                className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
                  claimedTilesCount >= 30
                    ? 'bg-green-500 hover:bg-green-600 text-white cursor-pointer shadow-lg'
                    : 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50'
                }`}
              >
                ESCAPE
              </button>
            </div>
          </div>

          {/* Hex Grid */}
          <div className="flex justify-center items-center">
          <svg
            width="800"
            height="800"
            viewBox="-250 -250 500 500"
            className="max-w-full select-none"
          >
            {/* Define glow filter for claimed tiles */}
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Render all hexagons first */}
            {hexGrid.map((hex, idx) => {
              const { x, y } = axialToPixel(hex.q, hex.r, hexSize);

              // Create hexagon path
              const points = [];
              for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 180) * (60 * i - 30);
                const px = x + hexSize * Math.cos(angle);
                const py = y + hexSize * Math.sin(angle);
                points.push(`${px},${py}`);
              }

              return (
                <polygon
                  key={idx}
                  points={points.join(' ')}
                  fill={getColor(hex.color, hex.claimed)}
                  stroke="#1f2937"
                  strokeWidth="2"
                  className="hover:opacity-80 transition-all cursor-pointer"
                  onClick={() => handleHexClick(idx)}
                  filter={hex.claimed ? 'url(#glow)' : 'none'}
                />
              );
            })}

            {/* Render white outlines for claimed tiles on top */}
            {hexGrid.map((hex, idx) => {
              if (!hex.claimed) return null;

              const { x, y } = axialToPixel(hex.q, hex.r, hexSize);

              // Create hexagon path
              const points = [];
              for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 180) * (60 * i - 30);
                const px = x + hexSize * Math.cos(angle);
                const py = y + hexSize * Math.sin(angle);
                points.push(`${px},${py}`);
              }

              return (
                <polygon
                  key={`outline-${idx}`}
                  points={points.join(' ')}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="6"
                  opacity="0.8"
                  pointerEvents="none"
                />
              );
            })}

            {/* Render player robot */}
            {playerPosition && (() => {
              const { x, y } = axialToPixel(playerPosition.q, playerPosition.r, hexSize);
              const robotSize = 24;

              return (
                <g key="player" className="transition-all duration-300">
                  {/* Shadow */}
                  <ellipse
                    cx={x}
                    cy={y + robotSize / 2 + 2}
                    rx="12"
                    ry="4"
                    fill="#000000"
                    opacity="0.3"
                  />

                  {/* Robot body */}
                  <rect
                    x={x - 8}
                    y={y - 4}
                    width={16}
                    height={14}
                    fill="#e0e0e0"
                    stroke="#333333"
                    strokeWidth="1.5"
                    rx="2"
                  />

                  {/* Robot head */}
                  <rect
                    x={x - 6}
                    y={y - 12}
                    width={12}
                    height={10}
                    fill="#ffffff"
                    stroke="#333333"
                    strokeWidth="1.5"
                    rx="2"
                  />

                  {/* Antenna */}
                  <line
                    x1={x}
                    y1={y - 12}
                    x2={x}
                    y2={y - 16}
                    stroke="#333333"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={x}
                    cy={y - 16}
                    r="2"
                    fill="#ef4444"
                  />

                  {/* Eyes */}
                  <circle
                    cx={x - 2.5}
                    cy={y - 8}
                    r="1.5"
                    fill="#3b82f6"
                  />
                  <circle
                    cx={x + 2.5}
                    cy={y - 8}
                    r="1.5"
                    fill="#3b82f6"
                  />

                  {/* Mouth/display */}
                  <rect
                    x={x - 3}
                    y={y - 4}
                    width={6}
                    height={2}
                    fill="#333333"
                    rx="1"
                  />

                  {/* Left arm */}
                  <rect
                    x={x - 11}
                    y={y - 2}
                    width={3}
                    height={8}
                    fill="#b0b0b0"
                    stroke="#333333"
                    strokeWidth="1"
                    rx="1"
                  />

                  {/* Right arm */}
                  <rect
                    x={x + 8}
                    y={y - 2}
                    width={3}
                    height={8}
                    fill="#b0b0b0"
                    stroke="#333333"
                    strokeWidth="1"
                    rx="1"
                  />

                  {/* Left leg */}
                  <rect
                    x={x - 5}
                    y={y + 10}
                    width={3}
                    height={6}
                    fill="#808080"
                    stroke="#333333"
                    strokeWidth="1"
                    rx="1"
                  />

                  {/* Right leg */}
                  <rect
                    x={x + 2}
                    y={y + 10}
                    width={3}
                    height={6}
                    fill="#808080"
                    stroke="#333333"
                    strokeWidth="1"
                    rx="1"
                  />
                </g>
              );
            })()}
          </svg>
          </div>
        </div>

        <div className="mt-8 text-white">
          <p className="text-lg">Hexagon Grid: Side Length {sideLength}</p>
          <p className="text-sm opacity-75">Total Hexes: {hexGrid.length}</p>
          <p className="text-sm opacity-75 mt-2">Click adjacent hexagons to move the cube and claim tiles!</p>

          <div className="mt-6 flex gap-4 justify-center">
            <button
              onClick={() => {
                const grid = generateHexGrid(sideLength);
                setHexGrid(grid);
                setPlayerPosition({ q: 0, r: 0 });
                setHeat(0);
                setPower(0);
                setGameOver(false);
                // Claim the starting hex
                const centerIndex = grid.findIndex(hex => hex.q === 0 && hex.r === 0);
                if (centerIndex !== -1) {
                  grid[centerIndex].claimed = true;
                }
              }}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold text-white transition-colors"
            >
              Reset Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
