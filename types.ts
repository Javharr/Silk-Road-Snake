

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  SHOP = 'SHOP',
  QUESTS = 'QUESTS' // New State
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export enum Theme {
  DAY = 'DAY',
  NIGHT = 'NIGHT'
}

export enum Difficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
  IMPOSSIBLE = 'IMPOSSIBLE'
}

export enum AbilityType {
  NONE = 'NONE',
  BREAK_OBSTACLE = 'BREAK_OBSTACLE', // Active (Button Press)
  PASSIVE_BONUS_MONEY = 'PASSIVE_BONUS_MONEY', // Golden Emir
  PASSIVE_MAGNET = 'PASSIVE_MAGNET', // Azure Sufi
  PASSIVE_SHIELD_COOLDOWN = 'PASSIVE_SHIELD_COOLDOWN', // Jade Dragon
  PASSIVE_WALL_WRAP = 'PASSIVE_WALL_WRAP' // INVIS Marshal
}

export type ShapeType = 'box' | 'round' | 'prism';

export interface Skin {
  id: string;
  name: string;
  price: number;
  shape: ShapeType;
  headColor: string;
  bodyColors: string[];
  description: string;
  ability?: AbilityType;
}

export interface Background {
  id: string;
  name: string;
  price: number;
  description: string;
  allowedThemes: Theme[]; // If empty, all themes are allowed
}

// --- QUEST TYPES ---
export enum QuestType {
  EAT_PALOV = 'EAT_PALOV',
  SURVIVE_TIME = 'SURVIVE_TIME', // Seconds
  USE_ABILITY = 'USE_ABILITY',
  SCORE_TOTAL = 'SCORE_TOTAL'
}

export interface Quest {
  id: string;
  type: QuestType;
  description: string;
  target: number;
  progress: number;
  reward: number;
  isCompleted: boolean;
  isClaimed: boolean;
  backgroundRestriction?: string; // Optional: Only counts in specific realm
}

export interface PlayerData {
  money: number;
  bestScore: number;
  unlockedSkins: string[];
  equippedSkinId: string;
  unlockedBackgrounds: string[];
  equippedBackgroundId: string;
  activeQuests: Quest[];
  lastQuestDate: number; // Timestamp
}

export interface Position {
  x: number;
  y: number;
}

export interface Obstacle {
  position: Position;
  id: string;
  isWarning: boolean; // If true, it's just a shadow warning
}

export interface GameConfig {
  gridSize: number;
  initialSpeed: number;
}

export type ShopCategory = 'SERPENTS' | 'REALMS';

export enum WeatherType {
  NONE = 'NONE',
  SANDSTORM = 'SANDSTORM',
  BLIZZARD = 'BLIZZARD',
  METEOR_SHOWER = 'METEOR_SHOWER',
  GALE_FORCE = 'GALE_FORCE'
}

// --- ARTIFACTS (POWER-UPS) ---
export enum ArtifactType {
  HOURGLASS = 'HOURGLASS', // Slows time
  DAGGER = 'DAGGER', // Cuts tail
  LAMP = 'LAMP' // Spawns Feast
}

export interface Artifact {
  id: string;
  type: ArtifactType;
  position: Position;
  spawnTime: number;
}

// --- NEW TYPES FOR VISUAL JUICE ---

export interface FloatingText {
  id: number;
  text: string;
  position: Position; // Grid position
  color: string;
  life: number; // 0 to 1
}

export type VisualEventType = 'EAT' | 'SHAKE_SMALL' | 'SHAKE_LARGE' | 'EXPLOSION';

export interface GameEvent {
  id: number;
  type: VisualEventType;
  position?: Position;
  color?: string;
}