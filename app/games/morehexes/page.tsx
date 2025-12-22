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

export default function MoreHexesPage() {
  const [hexGrid, setHexGrid] = useState<Array<{ q: number, r: number, s: number, color: string, claimed: boolean }>>([]);
  const hexSize = 40; // Size of each hexagon in pixels
  const sideLength = 4;

  useEffect(() => {
    setHexGrid(generateHexGrid(sideLength));
  }, []);

  // Toggle claim status of a hex tile
  const handleHexClick = (index: number) => {
    const newGrid = [...hexGrid];
    newGrid[index] = { ...newGrid[index], claimed: !newGrid[index].claimed };
    setHexGrid(newGrid);
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

  // Get display color for the legend (always show claimed color)
  const getDisplayColor = (colorName: string): string => {
    const colorMap: { [key: string]: string } = {
      'red': '#dc2626',
      'blue': '#2563eb',
      'green': '#16a34a',
      'yellow': '#eab308'
    };
    return colorMap[colorName];
  };

  // Calculate claimed tile counts by color
  const claimedCounts = {
    'red': hexGrid.filter(hex => hex.claimed && hex.color === 'red').length,
    'blue': hexGrid.filter(hex => hex.claimed && hex.color === 'blue').length,
    'green': hexGrid.filter(hex => hex.claimed && hex.color === 'green').length,
    'yellow': hexGrid.filter(hex => hex.claimed && hex.color === 'yellow').length,
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-500 p-4 md:p-8">
      <GameNav currentGame="morehexes" />

      <div className="text-center pt-20 px-2">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">More Hexes</h1>

        <div className="flex justify-center items-start gap-8">
          {/* Color Count Panel */}
          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-6 text-black min-w-[200px]">
            <h2 className="text-2xl font-bold mb-4">Claimed Tiles</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: getDisplayColor('red') }}></div>
                <span className="text-xl font-semibold">Red: {claimedCounts['red']}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: getDisplayColor('blue') }}></div>
                <span className="text-xl font-semibold">Blue: {claimedCounts['blue']}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: getDisplayColor('green') }}></div>
                <span className="text-xl font-semibold">Green: {claimedCounts['green']}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: getDisplayColor('yellow') }}></div>
                <span className="text-xl font-semibold">Yellow: {claimedCounts['yellow']}</span>
              </div>
              <div className="pt-3 border-t border-black border-opacity-30">
                <span className="text-xl font-bold">Total: {Object.values(claimedCounts).reduce((a, b) => a + b, 0)}</span>
              </div>
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
          </svg>
          </div>
        </div>

        <div className="mt-8 text-white">
          <p className="text-lg">Hexagon Grid: Side Length {sideLength}</p>
          <p className="text-sm opacity-75">Total Hexes: {hexGrid.length}</p>
          <p className="text-sm opacity-75 mt-2">Click hexagons to claim them!</p>

          <div className="mt-6 flex gap-4 justify-center">
            <button
              onClick={() => setHexGrid(generateHexGrid(sideLength))}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold text-white transition-colors"
            >
              Reset Grid
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
