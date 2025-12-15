'use client'

interface GameNavProps {
  currentGame: 'blackout' | 'blackoutv2' | 'battle' | 'singleplayerbattle' | 'deck' | 'wordcross' | 'wordcrossv2' | 'librarianstower';
}

export default function GameNav({ currentGame }: GameNavProps) {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
      <select
        onChange={(e) => {
          const value = e.target.value;
          if (value === 'home') {
            window.location.href = '/';
          } else if (value === 'blackout') {
            window.location.href = '/games/blackout';
          } else if (value === 'blackoutv2') {
            window.location.href = '/games/blackoutv2';
          } else if (value === 'battle') {
            window.location.href = '/games/battle';
          } else if (value === 'singleplayerbattle') {
            window.location.href = '/games/singleplayerbattle';
          } else if (value === 'deck') {
            window.location.href = '/games/deck';
          } else if (value === 'wordcross') {
            window.location.href = '/games/wordcross';
          } else if (value === 'wordcrossv2') {
            window.location.href = '/games/wordcrossv2';
          } else if (value === 'librarianstower') {
            window.location.href = '/games/librarianstower';
          }
        }}
        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 font-semibold cursor-pointer"
        defaultValue={currentGame}
      >
        <option value="home">Home</option>
        <option value="blackout">Blackout Mode</option>
        <option value="blackoutv2">Blackout V2</option>
        <option value="battle">Battle Mode</option>
        <option value="singleplayerbattle">AI Battle</option>
        <option value="deck">Deck Mode</option>
        <option value="wordcross">Word Cross</option>
        <option value="wordcrossv2">Word Cross V2</option>
        <option value="librarianstower">Librarian's Tower</option>
      </select>
    </div>
  );
}
