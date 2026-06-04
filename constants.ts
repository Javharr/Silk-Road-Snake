

import { Difficulty, Skin, AbilityType, Background, Theme, QuestType } from './types';

export const GRID_SIZE = 15; // 15x15 Grid
export const INITIAL_SNAKE = [
  { x: 7, y: 7 },
  { x: 7, y: 8 },
  { x: 7, y: 9 }
];
export const INITIAL_SPEED = 200; // ms per move
export const MIN_SPEED = 80;
export const SPEED_DECREMENT = 5;

// Money earnings per Palov
export const MONEY_PER_PALOV = 10;

// Ability Constants
export const ABILITY_COOLDOWN = 30000; // Shadow Assassin (Active)
export const ABILITY_DURATION = 5000; // Shadow Assassin Active Time
export const PASSIVE_SHIELD_COOLDOWN_TIME = 8000; // Jade Dragon (8 seconds)
export const MAGNET_RADIUS = 3; // Azure Sufi Range
export const MAGNET_CHANCE = 0.3; // Azure Sufi 30% Chance

// Artifact Constants
export const ARTIFACT_LIFETIME = 10000; // 10 seconds on screen
export const ARTIFACT_SPAWN_CHANCE = 0.05; // 5% chance per tick to TRY spawning
export const TIME_SLOW_DURATION = 10000; // Hourglass effect time
export const TIME_SLOW_FACTOR = 1.5; // 50% slower

export const DIFFICULTY_SETTINGS = {
  [Difficulty.EASY]: {
    spawnIntervalStart: 5000,
    minSpawnInterval: 2500,
    baseSpawnCount: 1,
    maxSpawnCount: 3,
    scoreScaling: 50, // ms faster per point
    color: '#81c784' // Green
  },
  [Difficulty.NORMAL]: {
    spawnIntervalStart: 4000,
    minSpawnInterval: 1500,
    baseSpawnCount: 1,
    maxSpawnCount: 5,
    scoreScaling: 75,
    color: '#64b5f6' // Blue
  },
  [Difficulty.HARD]: {
    spawnIntervalStart: 3000,
    minSpawnInterval: 1000,
    baseSpawnCount: 2,
    maxSpawnCount: 8,
    scoreScaling: 100,
    color: '#ffb74d' // Orange
  },
  [Difficulty.IMPOSSIBLE]: {
    spawnIntervalStart: 2000,
    minSpawnInterval: 600,
    baseSpawnCount: 3,
    maxSpawnCount: 12,
    scoreScaling: 120,
    color: '#e57373' // Red
  }
};

export const SKINS: Skin[] = [
  {
    id: 'default',
    name: 'Crimson Nomad',
    price: 0,
    shape: 'box',
    headColor: '#b71c1c',
    bodyColors: ['#0277bd', '#2e7d32', '#f9a825'],
    description: 'The classic traveler of the Silk Road.',
    ability: AbilityType.NONE
  },
  {
    id: 'golden_emir',
    name: 'Golden Emir',
    price: 100,
    shape: 'round',
    headColor: '#ffd700',
    bodyColors: ['#ffecb3', '#ffca28'],
    description: 'A symbol of wealth and prosperity.',
    ability: AbilityType.PASSIVE_BONUS_MONEY
  },
  {
    id: 'azure_sufi',
    name: 'Azure Sufi',
    price: 250,
    shape: 'prism',
    headColor: '#1a237e',
    bodyColors: ['#e8eaf6', '#3949ab', '#c5cae9'],
    description: 'Mystical patterns from ancient tiles.',
    ability: AbilityType.PASSIVE_MAGNET
  },
  {
    id: 'jade_serpent',
    name: 'Jade Dragon',
    price: 500,
    shape: 'box',
    headColor: '#1b5e20',
    bodyColors: ['#4caf50', '#a5d6a7', '#2e7d32'],
    description: 'As precious and durable as the stone itself.',
    ability: AbilityType.PASSIVE_SHIELD_COOLDOWN
  },
  {
    id: 'shadow_assassin',
    name: 'Night Walker',
    price: 1000,
    shape: 'prism',
    headColor: '#212121',
    bodyColors: ['#424242', '#616161', '#9e9e9e'],
    description: 'Silent as the desert wind.',
    ability: AbilityType.BREAK_OBSTACLE
  },
  {
    id: 'invis_marshal',
    name: 'INVIS Marshal',
    price: 2500,
    shape: 'round',
    headColor: '#4a148c', // Deep Purple
    bodyColors: ['#7b1fa2', '#ab47bc', '#ce93d8'], // Purple gradient
    description: 'A royal phantom that transcends boundaries.',
    ability: AbilityType.PASSIVE_WALL_WRAP
  }
];

export const BACKGROUNDS: Background[] = [
  {
    id: 'default',
    name: 'Silk Road',
    price: 0,
    description: 'The dust of history and the heat of the desert.',
    allowedThemes: [] // Both allowed
  },
  {
    id: 'space',
    name: 'Cosmic Void',
    price: 5000,
    description: 'A journey through the eternal night of the stars.',
    allowedThemes: [Theme.NIGHT] // Night only
  },
  {
    id: 'winter',
    name: 'Frozen Peaks',
    price: 3000,
    description: 'A festive land of snow and northern lights.',
    allowedThemes: [] // Both allowed (Changes visuals)
  },
  {
    id: 'autumn',
    name: 'Golden Harvest',
    price: 2000,
    description: 'Where the leaves fall and the wind whispers.',
    allowedThemes: [Theme.DAY] // Day only
  }
];

export const QUEST_TEMPLATES = [
  { type: QuestType.EAT_PALOV, description: "Eat 30 plates of Palov", target: 30, reward: 100 },
  { type: QuestType.EAT_PALOV, description: "Eat 50 plates of Palov", target: 50, reward: 200 },
  { type: QuestType.SURVIVE_TIME, description: "Survive for 60 seconds", target: 60, reward: 150 },
  { type: QuestType.SURVIVE_TIME, description: "Survive for 120 seconds in Cosmic Void", target: 120, reward: 300, restriction: 'space' },
  { type: QuestType.USE_ABILITY, description: "Use Active Abilities 3 times", target: 3, reward: 75 },
  { type: QuestType.SCORE_TOTAL, description: "Score 50 points in one run", target: 50, reward: 100 },
];

// Colors and Visuals
export const COLORS = {
  day: {
    ground: '#f3e5ab', // Light parchment
    sky: '#e0f7fa', // Very light blue
    ambient: 0.9,
    text: '#3e2723',
    border: '#8d6e63'
  },
  night: {
    ground: '#263238', // Dark blue-grey
    sky: '#102027',
    ambient: 0.6,
    text: '#eceff1',
    border: '#546e7a'
  },
  foodBowl: '#ffffff', 
  foodRice: '#fff3e0',
  obstacle: '#5d4037', 
  obstacleWarning: '#d32f2f' 
};

export const UZBEK_PATTERNS = [
  "Repeating geometric harmony",
  "The eternal flow of life",
  "Interwoven destiny"
];