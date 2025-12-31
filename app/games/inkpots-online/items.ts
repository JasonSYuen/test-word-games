// Item system for Inkpots 2

export type ItemId =
  | 'writers_block'
  | 'crunch_time'
  | 'stroke_of_genius'
  | 'publishers_favor'
  | 'speed_writing'
  | 'throw_some_ink';

export type ItemEffect =
  | { type: 'draft_reduce', value: number } // Reduce opponent's draft choices (one-time)
  | { type: 'extra_draft_picks', value: number } // Get extra draft picks (one-time)
  | { type: 'bonus_vowels' } // Get all vowels for next play phase (one-time)
  | { type: 'coin_multiplier', value: number } // Multiply coins earned (one-time)
  | { type: 'extra_word' } // Can play 2 words in next play phase (one-time)
  | { type: 'delete_opponent_word' }; // Delete opponent's next word (one-time)

export interface Item {
  id: ItemId;
  name: string;
  description: string;
  cost: number;
  effects: ItemEffect[];
  oneTime: boolean; // true if consumable (used once), false if permanent
  affectsOpponent: boolean; // true if it affects opponent, false if it affects self
}

export const ITEMS: Record<ItemId, Item> = {
  writers_block: {
    id: 'writers_block',
    name: "Writer's Block",
    description: "Reduce opponent's draft choices from 3 to 2 tiles for their next draft phase",
    cost: 5,
    effects: [{ type: 'draft_reduce', value: 2 }],
    oneTime: true,
    affectsOpponent: true,
  },
  crunch_time: {
    id: 'crunch_time',
    name: "Crunch Time",
    description: "Draft 7 letters instead of 5 during your next draft phase",
    cost: 6,
    effects: [{ type: 'extra_draft_picks', value: 2 }],
    oneTime: true,
    affectsOpponent: false,
  },
  stroke_of_genius: {
    id: 'stroke_of_genius',
    name: "Stroke of Genius",
    description: "Get 1 copy of all vowels (A, E, I, O, U) during your next play phase",
    cost: 7,
    effects: [{ type: 'bonus_vowels' }],
    oneTime: true,
    affectsOpponent: false,
  },
  publishers_favor: {
    id: 'publishers_favor',
    name: "Publisher's Favor",
    description: "Earn triple coins on your next word",
    cost: 4,
    effects: [{ type: 'coin_multiplier', value: 3 }],
    oneTime: true,
    affectsOpponent: false,
  },
  speed_writing: {
    id: 'speed_writing',
    name: "Speed Writing",
    description: "Make two different words during your next play phase",
    cost: 8,
    effects: [{ type: 'extra_word' }],
    oneTime: true,
    affectsOpponent: false,
  },
  throw_some_ink: {
    id: 'throw_some_ink',
    name: "Throw Some Ink",
    description: "Opponent's next word is deleted (no coins or letters)",
    cost: 6,
    effects: [{ type: 'delete_opponent_word' }],
    oneTime: true,
    affectsOpponent: true,
  },
};

// Helper function to get all available item IDs as an array
export const getAvailableItems = (): ItemId[] => {
  return Object.keys(ITEMS) as ItemId[];
};
