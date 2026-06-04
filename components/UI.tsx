
import React, { useState } from 'react';
import { GameState, Theme, Direction, Difficulty, Skin, AbilityType, ShopCategory, Quest } from '../types';
import { Sun, Moon, RotateCcw, Play, Trophy, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Pause, Home, ShoppingBag, Lock, Check, Coins, Zap, Music, VolumeX, Globe, Sprout, Scroll, Gift } from 'lucide-react';
import { DIFFICULTY_SETTINGS, SKINS, BACKGROUNDS } from '../constants';

interface UIProps {
  score: number;
  money: number;
  bestScore: number;
  gameState: GameState;
  theme: Theme;
  difficulty: Difficulty;
  activeSkinId: string;
  unlockedSkins: string[];
  activeBackgroundId: string;
  unlockedBackgrounds: string[];
  abilityReady: boolean;
  abilityCooldown: number;
  musicEnabled: boolean;
  activeQuests: Quest[];
  toggleTheme: () => void;
  toggleMusic: () => void;
  setDifficulty: (d: Difficulty) => void;
  startGame: () => void;
  resetGame: () => void;
  togglePause: () => void;
  goToMenu: () => void;
  openShop: () => void;
  openQuests: () => void;
  buySkin: (skinId: string) => void;
  equipSkin: (skinId: string) => void;
  buyBackground: (bgId: string) => void;
  equipBackground: (bgId: string) => void;
  onDirectionChange: (dir: Direction) => void;
  activateAbility: () => void;
  claimQuest: (questId: string) => void;
}

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  primary?: boolean;
  themeStyle: any;
  className?: string;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ onClick, children, primary = false, themeStyle, className = '', disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      relative px-6 py-2 md:px-8 md:py-3 font-display text-lg md:text-xl transition-all duration-300
      ${disabled ? 'opacity-50 cursor-not-allowed' : primary ? 'scale-105 hover:scale-110 active:scale-95' : 'hover:scale-105 active:scale-95'}
      border-4 border-double
      bg-transparent shadow-lg pointer-events-auto
      ${themeStyle.button}
      ${className}
    `}
  >
    {children}
  </button>
);

const DifficultyBtn: React.FC<{ 
  level: Difficulty; 
  current: Difficulty; 
  onClick: () => void;
  themeStyle: any;
}> = ({ 
  level, 
  current, 
  onClick,
  themeStyle
}) => {
  const isActive = level === current;
  const settings = DIFFICULTY_SETTINGS[level];
  
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1 md:px-4 md:py-2 font-display text-sm md:text-base border-2 transition-all duration-200
        ${isActive ? 'scale-110 shadow-md' : 'opacity-60 hover:opacity-100'}
      `}
      style={{
        borderColor: settings.color,
        backgroundColor: isActive ? settings.color : 'transparent',
        color: isActive ? '#fff' : settings.color
      }}
    >
      {level}
    </button>
  );
};

const MobileControlBtn = ({ onClick, icon: Icon }: { onClick: () => void, icon: any }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className="p-4 bg-white/10 backdrop-blur-md rounded-full border border-white/20 active:bg-white/30 transition-colors touch-manipulation shadow-lg"
  >
    <Icon size={28} color="white" />
  </button>
);

const getAbilityText = (type?: AbilityType) => {
    switch(type) {
        case AbilityType.BREAK_OBSTACLE: return "ACTIVE: Break Obstacles (B)";
        case AbilityType.PASSIVE_BONUS_MONEY: return "PASSIVE: +50% More Money";
        case AbilityType.PASSIVE_MAGNET: return "PASSIVE: 30% Food Magnet";
        case AbilityType.PASSIVE_SHIELD_COOLDOWN: return "PASSIVE: Auto-Shield (8s)";
        case AbilityType.PASSIVE_WALL_WRAP: return "PASSIVE: Wrap Through Walls";
        default: return "None";
    }
};

// THEME CONFIGURATIONS
const THEMES: Record<string, any> = {
  space: {
    bg: 'bg-[#0f172a]/80 backdrop-blur-md',
    border: 'border-indigo-500',
    text: 'text-indigo-100',
    button: 'border-indigo-400 text-indigo-200 hover:bg-indigo-900/50 hover:border-indigo-200',
    accent: 'text-indigo-400',
    title: 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300',
    card: 'bg-slate-900/60 border-indigo-800'
  },
  winter: {
    bg: 'bg-[#f0f9ff]/80 backdrop-blur-md',
    border: 'border-sky-300',
    text: 'text-slate-700',
    button: 'border-sky-400 text-slate-700 hover:bg-sky-100',
    accent: 'text-sky-600',
    title: 'text-sky-800 drop-shadow-sm',
    card: 'bg-white/60 border-sky-200'
  },
  autumn: {
    bg: 'bg-[#fff7ed]/90 backdrop-blur-sm',
    border: 'border-orange-800',
    text: 'text-orange-900',
    button: 'border-orange-700 text-orange-900 hover:bg-orange-100',
    accent: 'text-orange-700',
    title: 'text-orange-900',
    card: 'bg-orange-50/80 border-orange-200'
  },
  default: { // Day
    bg: 'bg-[#fdf5e6]/95',
    border: 'border-[#8d6e63]',
    text: 'text-[#3e2723]',
    button: 'border-[#8d6e63] text-[#5d4037] hover:bg-[#d7ccc8]',
    accent: 'text-amber-700',
    title: 'text-[#3e2723]',
    card: 'bg-white/50 border-[#8d6e63]'
  },
  night: { // Default Night
    bg: 'bg-[#1e293b]/95',
    border: 'border-[#475569]',
    text: 'text-[#e2e8f0]',
    button: 'border-[#475569] text-[#cbd5e1] hover:bg-[#334155]',
    accent: 'text-slate-400',
    title: 'text-[#e2e8f0]',
    card: 'bg-slate-800/50 border-slate-600'
  }
};

export const UI: React.FC<UIProps> = ({ 
  score, 
  money,
  bestScore, 
  gameState, 
  theme, 
  difficulty,
  activeSkinId,
  unlockedSkins,
  activeBackgroundId,
  unlockedBackgrounds,
  abilityReady,
  abilityCooldown,
  musicEnabled,
  activeQuests,
  toggleTheme, 
  toggleMusic,
  setDifficulty,
  startGame, 
  resetGame,
  togglePause,
  goToMenu,
  openShop,
  openQuests,
  buySkin,
  equipSkin,
  buyBackground,
  equipBackground,
  onDirectionChange,
  activateAbility,
  claimQuest
}) => {
  
  const [shopCategory, setShopCategory] = useState<ShopCategory>('SERPENTS');
  
  const isDay = theme === Theme.DAY;
  const activeSkin = SKINS.find(s => s.id === activeSkinId);
  const hasActiveAbility = activeSkin?.ability === AbilityType.BREAK_OBSTACLE;

  // Determine UI styling based on active background
  let currentThemeStyle = THEMES.default;
  if (activeBackgroundId === 'space') currentThemeStyle = THEMES.space;
  else if (activeBackgroundId === 'winter') currentThemeStyle = THEMES.winter;
  else if (activeBackgroundId === 'autumn') currentThemeStyle = THEMES.autumn;
  else currentThemeStyle = isDay ? THEMES.default : THEMES.night;

  // Check background theme locks
  const currentBg = BACKGROUNDS.find(b => b.id === activeBackgroundId);
  const isThemeLocked = currentBg?.allowedThemes && currentBg.allowedThemes.length > 0;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-10 overflow-hidden">
      
      {/* Header */}
      <div className="w-full p-4 flex justify-between items-start">
        <div className={`pointer-events-auto px-4 py-2 md:px-6 md:py-3 ${currentThemeStyle.bg} border-4 border-double ${currentThemeStyle.border} rounded-lg shadow-xl backdrop-blur-sm flex flex-col gap-1`}>
          <h1 className={`hidden md:block font-display text-xl md:text-2xl tracking-widest ${currentThemeStyle.title}`}>SILK ROAD</h1>
          <div className={`flex gap-4 font-serif text-lg ${currentThemeStyle.text}`}>
             <div className="flex items-center gap-2">
               <span>Feast:</span>
               <span className="font-bold text-xl">{score}</span>
             </div>
             <div className="flex items-center gap-2 text-amber-500">
               <Coins size={18} />
               <span className="font-bold text-xl">{money}</span>
             </div>
          </div>
        </div>

        {/* Ability Button for Active Skins (Shadow Assassin) */}
        {gameState === GameState.PLAYING && hasActiveAbility && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
             <button
               onClick={activateAbility}
               disabled={!abilityReady}
               className={`
                 flex items-center gap-2 px-4 py-2 rounded-full border-2 font-bold transition-all
                 ${abilityReady 
                    ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.6)] scale-110 animate-pulse' 
                    : 'bg-gray-800/50 border-gray-600 text-gray-400 cursor-not-allowed'}
               `}
             >
               <Zap size={20} className={abilityReady ? "fill-current" : ""} />
               {abilityReady ? "READY (B)" : `${Math.ceil(abilityCooldown / 1000)}s`}
             </button>
          </div>
        )}

        <div className="flex gap-2">
          {gameState === GameState.PLAYING && (
            <button 
              onClick={togglePause}
              className={`pointer-events-auto p-3 rounded-full ${currentThemeStyle.bg} border-2 ${currentThemeStyle.border} shadow-lg hover:scale-105 transition-transform ${currentThemeStyle.text}`}
            >
              <Pause size={24} />
            </button>
          )}
          <button 
            onClick={toggleMusic}
            className={`pointer-events-auto p-3 rounded-full ${currentThemeStyle.bg} border-2 ${currentThemeStyle.border} shadow-lg hover:scale-105 transition-transform`}
          >
            {musicEnabled ? <Music size={24} className="text-emerald-600" /> : <VolumeX size={24} className="text-red-500" />}
          </button>
          <button 
            onClick={isThemeLocked ? undefined : toggleTheme}
            className={`pointer-events-auto p-3 rounded-full ${currentThemeStyle.bg} border-2 ${currentThemeStyle.border} shadow-lg hover:rotate-45 transition-transform ${isThemeLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isThemeLocked ? "Theme locked by Realm" : "Toggle Theme"}
          >
            {isDay ? <Moon size={24} className="text-indigo-900" /> : <Sun size={24} className="text-amber-400" />}
          </button>
        </div>
      </div>

      {/* Center Menus */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        
        {/* MAIN MENU */}
        {gameState === GameState.MENU && (
          <div className={`pointer-events-auto text-center p-8 max-w-md w-full ${currentThemeStyle.bg} border-[6px] border-double ${currentThemeStyle.border} shadow-2xl animate-in fade-in zoom-in duration-500`}>
            <div className="mb-6">
               <span className="inline-block bg-[#d32f2f] text-[#fff8e1] px-4 py-1 font-display text-xs tracking-[0.3em] shadow-md">LEGACY OF SAMARKAND</span>
            </div>
            
            <h2 className={`font-display text-5xl mb-4 ${currentThemeStyle.title} drop-shadow-sm`}>SNAKE</h2>
            
            {/* Difficulty Selector */}
            <div className="mb-8">
              <p className={`text-xs uppercase tracking-widest mb-3 ${currentThemeStyle.text} opacity-60`}>Select Difficulty</p>
              <div className="flex flex-wrap justify-center gap-2">
                {(['EASY', 'NORMAL', 'HARD', 'IMPOSSIBLE'] as Difficulty[]).map((d) => (
                  <DifficultyBtn 
                    key={d} 
                    level={d} 
                    current={difficulty} 
                    onClick={() => setDifficulty(d)} 
                    themeStyle={currentThemeStyle}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex flex-col gap-4 items-center">
              <Button onClick={startGame} primary themeStyle={currentThemeStyle}>
                <span className="flex items-center gap-3">
                  <Play size={22} fill="currentColor" /> BEGIN FEAST
                </span>
              </Button>
              
              <div className="flex gap-4 w-full justify-center">
                  <Button onClick={openShop} themeStyle={currentThemeStyle}>
                    <span className="flex items-center gap-3">
                      <ShoppingBag size={20} /> BAZAAR
                    </span>
                  </Button>
                  
                  <Button onClick={openQuests} themeStyle={currentThemeStyle}>
                    <span className="flex items-center gap-3">
                      <Scroll size={20} /> CHOYXONA
                    </span>
                  </Button>
              </div>
            </div>
          </div>
        )}

        {/* PAUSED */}
        {gameState === GameState.PAUSED && (
          <div className={`pointer-events-auto text-center p-8 max-w-sm w-full ${currentThemeStyle.bg} border-[6px] border-double ${currentThemeStyle.border} shadow-2xl animate-in fade-in zoom-in duration-300`}>
            <h2 className={`font-display text-3xl mb-6 ${currentThemeStyle.title}`}>PAUSED</h2>
            <div className="flex flex-col gap-4 items-center">
              <Button onClick={togglePause} primary themeStyle={currentThemeStyle}>
                <span className="flex items-center gap-3">
                  <Play size={20} fill="currentColor" /> RESUME
                </span>
              </Button>
              <Button onClick={goToMenu} themeStyle={currentThemeStyle}>
                <span className="flex items-center gap-3">
                  <Home size={20} /> MAIN MENU
                </span>
              </Button>
            </div>
          </div>
        )}

        {/* QUESTS (CHOYXONA) */}
        {gameState === GameState.QUESTS && (
          <div className={`pointer-events-auto text-center p-6 max-w-2xl w-full ${currentThemeStyle.bg} border-[6px] border-double ${currentThemeStyle.border} shadow-2xl animate-in fade-in zoom-in duration-300`}>
             <div className="mb-6 flex items-center justify-center gap-3">
                 <Scroll size={32} className={currentThemeStyle.accent} />
                 <h2 className={`font-display text-3xl ${currentThemeStyle.title}`}>THE CHOYXONA</h2>
             </div>
             <p className={`mb-6 italic opacity-80 ${currentThemeStyle.text}`}>Complete daily tasks for the Emir's favor.</p>

             <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto mb-6">
                {activeQuests.map((quest) => {
                    const percentage = Math.min(100, (quest.progress / quest.target) * 100);
                    return (
                      <div key={quest.id} className={`p-4 rounded-lg border-2 flex items-center justify-between ${currentThemeStyle.card} ${currentThemeStyle.text}`}>
                          <div className="flex flex-col items-start text-left flex-1">
                              <p className="font-bold mb-1">{quest.description}</p>
                              <div className="w-full bg-black/10 h-3 rounded-full overflow-hidden mt-1">
                                  <div 
                                    className="h-full bg-amber-500 transition-all duration-500" 
                                    style={{ width: `${percentage}%` }} 
                                  />
                              </div>
                              <p className="text-xs mt-1 opacity-70">{quest.progress} / {quest.target}</p>
                          </div>
                          
                          <div className="flex items-center gap-4 ml-4">
                              <div className="flex items-center gap-1 text-amber-600 font-bold">
                                  <Coins size={16} /> {quest.reward}
                              </div>
                              
                              {quest.isClaimed ? (
                                  <span className="text-green-600 font-bold flex items-center gap-1 bg-green-100 px-3 py-1 rounded">
                                      <Check size={16} /> DONE
                                  </span>
                              ) : (
                                  <button 
                                    onClick={() => claimQuest(quest.id)}
                                    disabled={!quest.isCompleted}
                                    className={`px-4 py-2 rounded font-bold flex items-center gap-2 transition-all ${
                                        quest.isCompleted 
                                          ? 'bg-amber-500 text-white hover:bg-amber-600 animate-pulse' 
                                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                                  >
                                      <Gift size={18} /> CLAIM
                                  </button>
                              )}
                          </div>
                      </div>
                    );
                })}
             </div>

             <Button onClick={goToMenu} themeStyle={currentThemeStyle}>
                RETURN
             </Button>
          </div>
        )}

        {/* SHOP / BAZAAR */}
        {gameState === GameState.SHOP && (
          <div className={`pointer-events-auto flex flex-col h-[80vh] max-w-5xl w-full ${currentThemeStyle.bg} border-[6px] border-double ${currentThemeStyle.border} shadow-2xl animate-in fade-in zoom-in duration-300 overflow-hidden`}>
             <div className="p-6 border-b border-current/20 flex justify-between items-center">
                <h2 className={`font-display text-3xl ${currentThemeStyle.title}`}>GRAND BAZAAR</h2>
                <div className="flex items-center gap-2 text-amber-500 bg-black/10 px-4 py-1 rounded-full">
                  <Coins size={24} />
                  <span className="font-bold text-2xl">{money}</span>
                </div>
             </div>

             {/* Shop Tabs */}
             <div className="flex border-b border-current/20">
                <button 
                   className={`flex-1 py-4 font-display text-xl transition-colors ${currentThemeStyle.text} ${shopCategory === 'SERPENTS' ? 'bg-black/5 font-bold underline decoration-4 underline-offset-4 decoration-amber-500' : 'opacity-60 hover:bg-black/5'}`}
                   onClick={() => setShopCategory('SERPENTS')}
                >
                   SERPENTS
                </button>
                <button 
                   className={`flex-1 py-4 font-display text-xl transition-colors ${currentThemeStyle.text} ${shopCategory === 'REALMS' ? 'bg-black/5 font-bold underline decoration-4 underline-offset-4 decoration-amber-500' : 'opacity-60 hover:bg-black/5'}`}
                   onClick={() => setShopCategory('REALMS')}
                >
                   REALMS
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* SKINS TAB */}
                {shopCategory === 'SERPENTS' && SKINS.map((skin) => {
                  const isUnlocked = unlockedSkins.includes(skin.id);
                  const isEquipped = activeSkinId === skin.id;
                  const canAfford = money >= skin.price;
                  const abilityText = getAbilityText(skin.ability);

                  return (
                    <div key={skin.id} className={`relative p-4 border-2 ${currentThemeStyle.border} rounded-lg flex flex-col gap-2 transition-all ${currentThemeStyle.card}`}>
                      <div className="flex justify-between items-start">
                        <h3 className={`font-display text-xl ${currentThemeStyle.text}`}>{skin.name}</h3>
                        {isEquipped && <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded">EQUIPPED</span>}
                      </div>
                      
                      <p className={`text-sm italic opacity-70 ${currentThemeStyle.text} h-10`}>{skin.description}</p>
                      
                      {/* ABILITY SECTION */}
                      {skin.ability !== AbilityType.NONE ? (
                          <div className="bg-blue-900/10 border border-blue-900/20 p-2 rounded mt-1 h-16 flex flex-col justify-center">
                             <p className={`text-xs font-bold uppercase tracking-wider ${currentThemeStyle.accent}`}>
                                Ability:
                             </p>
                             <p className={`text-sm font-semibold leading-tight ${currentThemeStyle.text}`}>
                                {abilityText}
                             </p>
                          </div>
                      ) : <div className="h-16" />}
                      
                      {/* Visual Preview Placeholder */}
                      <div className="h-16 w-full bg-black/5 rounded-md my-2 flex items-center justify-center gap-2">
                         <div className="w-6 h-6 rounded shadow-sm" style={{ backgroundColor: skin.headColor }} />
                         <div className="w-6 h-6 rounded shadow-sm" style={{ backgroundColor: skin.bodyColors[0] }} />
                         <div className="w-6 h-6 rounded shadow-sm" style={{ backgroundColor: skin.bodyColors[1] || skin.bodyColors[0] }} />
                      </div>

                      <div className="mt-auto">
                        {isUnlocked ? (
                          <button
                            onClick={() => equipSkin(skin.id)}
                            disabled={isEquipped}
                            className={`w-full py-2 font-bold rounded flex items-center justify-center gap-2 transition-colors
                              ${isEquipped 
                                ? 'bg-green-600/20 text-green-700 cursor-default' 
                                : 'bg-amber-500 text-white hover:bg-amber-600 shadow-md'}
                            `}
                          >
                            {isEquipped ? <><Check size={18} /> ACTIVE</> : 'EQUIP'}
                          </button>
                        ) : (
                          <button
                            onClick={() => buySkin(skin.id)}
                            disabled={!canAfford}
                            className={`w-full py-2 font-bold rounded flex items-center justify-center gap-2 transition-colors
                              ${canAfford 
                                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-md' 
                                : 'bg-gray-400 text-gray-100 cursor-not-allowed'}
                            `}
                          >
                            {canAfford ? 'BUY' : 'LOCKED'} 
                            <span className="flex items-center text-sm bg-black/10 px-2 rounded ml-1">
                              <Coins size={14} className="mr-1"/> {skin.price}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* BACKGROUNDS TAB */}
                {shopCategory === 'REALMS' && BACKGROUNDS.map((bg) => {
                  const isUnlocked = unlockedBackgrounds.includes(bg.id);
                  const isEquipped = activeBackgroundId === bg.id;
                  const canAfford = money >= bg.price;
                  
                  let themeText = "Day & Night";
                  if (bg.allowedThemes.length === 1) {
                      themeText = bg.allowedThemes[0] === Theme.DAY ? "Day Only" : "Night Only";
                  }

                  return (
                    <div key={bg.id} className={`relative p-4 border-2 ${currentThemeStyle.border} rounded-lg flex flex-col gap-2 transition-all ${currentThemeStyle.card}`}>
                       <div className="flex justify-between items-start">
                        <h3 className={`font-display text-xl ${currentThemeStyle.text}`}>{bg.name}</h3>
                        {isEquipped && <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded">ACTIVE</span>}
                      </div>

                      <p className={`text-sm italic opacity-70 ${currentThemeStyle.text} h-12`}>{bg.description}</p>
                      
                      <div className="flex gap-2 mt-1 mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider opacity-60">Restrictions:</span>
                        <span className="text-xs font-bold bg-black/10 px-2 rounded">{themeText}</span>
                      </div>

                      <div className="mt-auto">
                        {isUnlocked ? (
                          <button
                            onClick={() => equipBackground(bg.id)}
                            disabled={isEquipped}
                            className={`w-full py-2 font-bold rounded flex items-center justify-center gap-2 transition-colors
                              ${isEquipped 
                                ? 'bg-green-600/20 text-green-700 cursor-default' 
                                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md'}
                            `}
                          >
                            {isEquipped ? <><Check size={18} /> TRAVELING</> : 'TRAVEL'}
                          </button>
                        ) : (
                          <button
                            onClick={() => buyBackground(bg.id)}
                            disabled={!canAfford}
                            className={`w-full py-2 font-bold rounded flex items-center justify-center gap-2 transition-colors
                              ${canAfford 
                                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-md' 
                                : 'bg-gray-400 text-gray-100 cursor-not-allowed'}
                            `}
                          >
                            {canAfford ? 'BUY' : 'LOCKED'} 
                            <span className="flex items-center text-sm bg-black/10 px-2 rounded ml-1">
                              <Coins size={14} className="mr-1"/> {bg.price}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
             </div>

             <div className="p-4 border-t border-current/20 flex justify-center">
                <Button onClick={goToMenu} themeStyle={currentThemeStyle}>
                   RETURN
                </Button>
             </div>
          </div>
        )}

        {/* GAME OVER */}
        {gameState === GameState.GAME_OVER && (
          <div className={`pointer-events-auto text-center p-8 max-w-md w-full ${currentThemeStyle.bg} border-[6px] border-double ${currentThemeStyle.border} shadow-2xl animate-in fade-in zoom-in duration-300`}>
            <div className="mb-4">
               <span className="inline-block bg-gray-800 text-white px-6 py-1 font-display text-xs tracking-[0.2em]">JOURNEY ENDED</span>
            </div>
            
            <h2 className="font-display text-4xl mb-2 text-[#d32f2f]">GAME OVER</h2>
            <div className={`my-6 py-4 border-t border-b border-current/20`}>
              <p className={`font-serif text-lg ${currentThemeStyle.text}`}>Plates Consumed</p>
              <p className={`font-display text-6xl font-bold ${currentThemeStyle.text}`}>{score}</p>
              
              {/* Money Calculation */}
              <div className="flex flex-col items-center mt-2 text-amber-600 gap-1">
                <div className="flex items-center gap-2">
                  <Coins size={20} />
                  <span className="font-bold">+{activeSkin?.ability === AbilityType.PASSIVE_BONUS_MONEY ? Math.floor(score * 10 * 1.5) : score * 10} earned</span>
                </div>
                {activeSkin?.ability === AbilityType.PASSIVE_BONUS_MONEY && (
                   <span className="text-xs bg-amber-100 px-2 py-0.5 rounded text-amber-800 font-bold">Golden Emir Bonus Active!</span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={resetGame} themeStyle={currentThemeStyle}>
                <span className="flex items-center gap-2">
                  <RotateCcw size={20} /> REINCARNATE
                </span>
              </Button>
              <Button onClick={goToMenu} themeStyle={currentThemeStyle}>
                  MAIN MENU
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Mobile Controls & Footer */}
      <div className="w-full pb-8 flex flex-col items-center pointer-events-none">
         {gameState === GameState.PLAYING && (
           <div className="md:hidden pointer-events-auto flex flex-col items-center gap-3 mb-6 opacity-80">
              <MobileControlBtn onClick={() => onDirectionChange(Direction.UP)} icon={ChevronUp} />
              <div className="flex gap-12">
                <MobileControlBtn onClick={() => onDirectionChange(Direction.LEFT)} icon={ChevronLeft} />
                <MobileControlBtn onClick={() => onDirectionChange(Direction.DOWN)} icon={ChevronDown} />
                <MobileControlBtn onClick={() => onDirectionChange(Direction.RIGHT)} icon={ChevronRight} />
              </div>
           </div>
         )}
         
         <div className={`w-full h-6 bg-repeat-x opacity-40 mix-blend-overlay ${isDay ? 'bg-[url("https://www.transparenttextures.com/patterns/arabesque.png")]' : 'bg-[url("https://www.transparenttextures.com/patterns/stardust.png")]'}`} />
      </div>

    </div>
  );
};
