
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Game3D } from './components/Game3D';
import { UI } from './components/UI';
import { GameState, Position, Direction, Theme, Obstacle, Difficulty, PlayerData, AbilityType, FloatingText, GameEvent, Quest, QuestType, WeatherType, Artifact, ArtifactType } from './types';
import { GRID_SIZE, INITIAL_SNAKE, INITIAL_SPEED, MIN_SPEED, SPEED_DECREMENT, DIFFICULTY_SETTINGS, SKINS, BACKGROUNDS, MONEY_PER_PALOV, ABILITY_COOLDOWN, ABILITY_DURATION, MAGNET_CHANCE, MAGNET_RADIUS, PASSIVE_SHIELD_COOLDOWN_TIME, QUEST_TEMPLATES, ARTIFACT_SPAWN_CHANCE, ARTIFACT_LIFETIME, TIME_SLOW_DURATION, TIME_SLOW_FACTOR } from './constants';
import { soundManager } from './audio';

const STORAGE_KEY = 'silk_road_snake_data';

const DEFAULT_DATA: PlayerData = {
  money: 10000, 
  bestScore: 0,
  unlockedSkins: ['default'],
  equippedSkinId: 'default',
  unlockedBackgrounds: ['default'],
  equippedBackgroundId: 'default',
  activeQuests: [],
  lastQuestDate: 0
};

export default function App() {
  // --- STATE ---
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [theme, setTheme] = useState<Theme>(Theme.DAY);
  const [currentSpeed, setCurrentSpeed] = useState(INITIAL_SPEED);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.NORMAL);
  const [musicEnabled, setMusicEnabled] = useState(false);
  
  // Ability State
  const [lastAbilityUseTime, setLastAbilityUseTime] = useState(0); 
  const [isAbilityActive, setIsAbilityActive] = useState(false); 
  const [abilityCooldownRemaining, setAbilityCooldownRemaining] = useState(0); 
  const [lastAutoShieldTime, setLastAutoShieldTime] = useState(0);
  const [isAutoShieldReady, setIsAutoShieldReady] = useState(false);

  // Weather & Artifacts
  const [weather, setWeather] = useState<WeatherType>(WeatherType.NONE);
  const [showWeatherBanner, setShowWeatherBanner] = useState(false);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [activeArtifactEffect, setActiveArtifactEffect] = useState<ArtifactType | null>(null);
  const [artifactEffectEndTime, setArtifactEffectEndTime] = useState(0);

  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);
  const [combo, setCombo] = useState(0);
  const [lastEatTime, setLastEatTime] = useState(0);

  const [playerData, setPlayerData] = useState<PlayerData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const migrated = { ...DEFAULT_DATA, ...parsed };
        if (!migrated.activeQuests) migrated.activeQuests = [];
        migrated.money = 10000; 
        return migrated;
      }
      return DEFAULT_DATA;
    } catch (e) {
      return DEFAULT_DATA;
    }
  });

  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Position[]>([{ x: 10, y: 10 }]); // Array for Feast
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [direction, setDirection] = useState<Direction>(Direction.UP);
  
  const directionRef = useRef<Direction>(Direction.UP);
  const nextDirectionRef = useRef<Direction>(Direction.UP);
  const snakeRef = useRef<Position[]>(INITIAL_SNAKE);
  const gameStateRef = useRef<GameState>(GameState.MENU);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const scoreRef = useRef(0);
  const isAbilityActiveRef = useRef(false);
  const touchStartRef = useRef<{x: number, y: number} | null>(null);
  const gameStartTimeRef = useRef(0); 
  const weatherRef = useRef<WeatherType>(WeatherType.NONE);
  const artifactsRef = useRef<Artifact[]>([]);

  const activeSkin = SKINS.find(s => s.id === playerData.equippedSkinId) || SKINS[0];
  const activeBackground = BACKGROUNDS.find(b => b.id === playerData.equippedBackgroundId) || BACKGROUNDS[0];

  useEffect(() => {
      if (activeBackground.allowedThemes && activeBackground.allowedThemes.length > 0) {
          if (!activeBackground.allowedThemes.includes(theme)) {
              setTheme(activeBackground.allowedThemes[0]);
          }
      }
  }, [activeBackground, theme]);

  useEffect(() => { obstaclesRef.current = obstacles; }, [obstacles]);
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { isAbilityActiveRef.current = isAbilityActive; }, [isAbilityActive]);
  useEffect(() => { weatherRef.current = weather; }, [weather]);
  useEffect(() => { artifactsRef.current = artifacts; }, [artifacts]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playerData));
  }, [playerData]);

  useEffect(() => {
      const now = Date.now();
      const lastGen = playerData.lastQuestDate;
      const oneDay = 24 * 60 * 60 * 1000;
      if (now - lastGen > oneDay || playerData.activeQuests.length === 0) {
          const newQuests: Quest[] = [];
          for(let i = 0; i < 3; i++) {
              const template = QUEST_TEMPLATES[Math.floor(Math.random() * QUEST_TEMPLATES.length)];
              newQuests.push({
                  ...template,
                  id: `q_${now}_${i}`,
                  progress: 0,
                  isCompleted: false,
                  isClaimed: false
              });
          }
          setPlayerData(prev => ({
              ...prev,
              activeQuests: newQuests,
              lastQuestDate: now
          }));
      }
  }, [playerData.lastQuestDate]); 

  const updateQuestProgress = (type: QuestType, amount: number = 1) => {
      setPlayerData(prev => {
          const updatedQuests = prev.activeQuests.map(q => {
              if (q.isCompleted || q.type !== type) return q;
              if (q.backgroundRestriction && q.backgroundRestriction !== activeBackground.id) return q;
              const newProgress = Math.min(q.target, q.progress + amount);
              return {
                  ...q,
                  progress: newProgress,
                  isCompleted: newProgress >= q.target
              };
          });
          return { ...prev, activeQuests: updatedQuests };
      });
  };
  
  const claimQuest = (questId: string) => {
      setPlayerData(prev => {
          const quest = prev.activeQuests.find(q => q.id === questId);
          if (!quest || !quest.isCompleted || quest.isClaimed) return prev;
          soundManager.playEat(); 
          return {
              ...prev,
              money: prev.money + quest.reward,
              activeQuests: prev.activeQuests.map(q => q.id === questId ? { ...q, isClaimed: true } : q)
          };
      });
  };

  useEffect(() => {
    if (musicEnabled) soundManager.playMusic(playerData.equippedBackgroundId);
    else soundManager.stopMusic();
  }, [musicEnabled, playerData.equippedBackgroundId]);

  useEffect(() => {
    if (gameState !== GameState.PLAYING || activeSkin.ability !== AbilityType.PASSIVE_SHIELD_COOLDOWN) {
      setIsAutoShieldReady(false);
      return;
    }
    const checkShield = () => {
      const now = Date.now();
      setIsAutoShieldReady(now - lastAutoShieldTime >= PASSIVE_SHIELD_COOLDOWN_TIME);
    };
    checkShield();
    const interval = setInterval(checkShield, 1000);
    return () => clearInterval(interval);
  }, [gameState, lastAutoShieldTime, activeSkin]);
  
  useEffect(() => {
      if (floatingTexts.length === 0) return;
      const interval = setInterval(() => {
          setFloatingTexts(prev => prev.map(ft => ({ ...ft, life: ft.life - 0.05 })).filter(ft => ft.life > 0));
      }, 50);
      return () => clearInterval(interval);
  }, [floatingTexts.length]);

  const getRandomPosition = (exclude: Position[]): Position => {
    let pos: Position = { x: 0, y: 0 };
    let valid = false;
    let attempts = 0;
    while (!valid && attempts < 100) {
      pos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      const collision = exclude.some(p => p.x === pos.x && p.y === pos.y);
      if (!collision) valid = true;
      attempts++;
    }
    return pos;
  };

  const triggerEvent = (type: 'EAT' | 'SHAKE_SMALL' | 'SHAKE_LARGE' | 'EXPLOSION', position?: Position, color?: string) => {
     const event: GameEvent = { id: Date.now(), type, position, color };
     setGameEvents(prev => [...prev.slice(-5), event]); 
  };

  const addFloatingText = (text: string, position: Position, color = '#ffd700') => {
     setFloatingTexts(prev => [...prev, { id: Date.now(), text, position, color, life: 1.0 }]);
  };

  const startGame = () => {
    soundManager.resume();
    if (musicEnabled) soundManager.playMusic(playerData.equippedBackgroundId);
    
    setSnake(INITIAL_SNAKE);
    snakeRef.current = INITIAL_SNAKE;
    setScore(0);
    scoreRef.current = 0;
    setDirection(Direction.UP);
    directionRef.current = Direction.UP;
    nextDirectionRef.current = Direction.UP;
    setObstacles([]);
    obstaclesRef.current = [];
    setWeather(WeatherType.NONE);
    weatherRef.current = WeatherType.NONE;
    setArtifacts([]);
    setActiveArtifactEffect(null);
    
    setLastAbilityUseTime(0);
    setIsAbilityActive(false);
    setAbilityCooldownRemaining(0);
    setFloatingTexts([]);
    setCombo(0);
    
    setLastAutoShieldTime(Date.now() - PASSIVE_SHIELD_COOLDOWN_TIME);
    gameStartTimeRef.current = Date.now();
    const startFood = getRandomPosition(INITIAL_SNAKE);
    setFood([startFood]);
    setCurrentSpeed(INITIAL_SPEED);
    setGameState(GameState.PLAYING);
  };

  const togglePause = () => {
    if (gameState === GameState.PLAYING) setGameState(GameState.PAUSED);
    else if (gameState === GameState.PAUSED) setGameState(GameState.PLAYING);
  };

  const toggleMusic = () => {
    soundManager.resume();
    setMusicEnabled(prev => !prev);
  };

  const goToMenu = () => setGameState(GameState.MENU);
  const openQuests = () => setGameState(GameState.QUESTS);

  const handleGameOver = () => {
    soundManager.playGameOver();
    setGameState(GameState.GAME_OVER);
    setIsAbilityActive(false);
    triggerEvent('SHAKE_LARGE');
    const survivalTime = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
    updateQuestProgress(QuestType.SURVIVE_TIME, survivalTime);
    updateQuestProgress(QuestType.SCORE_TOTAL, scoreRef.current);
    
    let earnedMoney = scoreRef.current * MONEY_PER_PALOV;
    if (activeSkin.ability === AbilityType.PASSIVE_BONUS_MONEY) earnedMoney = Math.floor(earnedMoney * 1.5);

    setPlayerData(prev => ({
      ...prev,
      money: prev.money + earnedMoney,
      bestScore: Math.max(prev.bestScore, scoreRef.current)
    }));
  };

  const changeDirection = (newDir: Direction) => {
      const currentDir = directionRef.current;
      if (newDir === Direction.UP && currentDir === Direction.DOWN) return;
      if (newDir === Direction.DOWN && currentDir === Direction.UP) return;
      if (newDir === Direction.LEFT && currentDir === Direction.RIGHT) return;
      if (newDir === Direction.RIGHT && currentDir === Direction.LEFT) return;
      nextDirectionRef.current = newDir;
  };

  const activateAbility = useCallback(() => {
    if (activeSkin.ability !== AbilityType.BREAK_OBSTACLE) return;
    const now = Date.now();
    if (now - lastAbilityUseTime >= ABILITY_COOLDOWN) {
      setIsAbilityActive(true);
      setLastAbilityUseTime(now);
      soundManager.playEat(); 
      triggerEvent('SHAKE_SMALL');
      addFloatingText("SHADOW FORM!", snakeRef.current[0], '#e040fb');
      updateQuestProgress(QuestType.USE_ABILITY, 1);
      setTimeout(() => { if (isAbilityActiveRef.current) setIsAbilityActive(false); }, ABILITY_DURATION);
    }
  }, [activeSkin, lastAbilityUseTime]);

  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastAbilityUseTime;
      if (elapsed < ABILITY_COOLDOWN) setAbilityCooldownRemaining(ABILITY_COOLDOWN - elapsed);
      else setAbilityCooldownRemaining(0);
    }, 100);
    return () => clearInterval(interval);
  }, [lastAbilityUseTime, gameState]);

  // --- ARTIFACT EFFECT TIMER ---
  useEffect(() => {
     if (gameState !== GameState.PLAYING) return;
     const interval = setInterval(() => {
        if (activeArtifactEffect && Date.now() > artifactEffectEndTime) {
            setActiveArtifactEffect(null);
            addFloatingText("EFFECT ENDED", snakeRef.current[0], '#ffffff');
        }
     }, 500);
     return () => clearInterval(interval);
  }, [activeArtifactEffect, artifactEffectEndTime, gameState]);

  const openShop = () => setGameState(GameState.SHOP);
  
  const buySkin = (skinId: string) => {
    const skin = SKINS.find(s => s.id === skinId);
    if (!skin) return;
    if (playerData.money >= skin.price && !playerData.unlockedSkins.includes(skinId)) {
      soundManager.playEat();
      setPlayerData(prev => ({ ...prev, money: prev.money - skin.price, unlockedSkins: [...prev.unlockedSkins, skinId] }));
    }
  };

  const equipSkin = (skinId: string) => {
    if (playerData.unlockedSkins.includes(skinId)) setPlayerData(prev => ({ ...prev, equippedSkinId: skinId }));
  };

  const buyBackground = (bgId: string) => {
      const bg = BACKGROUNDS.find(b => b.id === bgId);
      if (!bg) return;
      if (playerData.money >= bg.price && !playerData.unlockedBackgrounds.includes(bgId)) {
          soundManager.playEat();
          setPlayerData(prev => ({ ...prev, money: prev.money - bg.price, unlockedBackgrounds: [...prev.unlockedBackgrounds, bgId] }));
      }
  };

  const equipBackground = (bgId: string) => {
      if (playerData.unlockedBackgrounds.includes(bgId)) setPlayerData(prev => ({ ...prev, equippedBackgroundId: bgId }));
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (gameStateRef.current === GameState.PLAYING || gameStateRef.current === GameState.PAUSED) togglePause();
      return;
    }
    if (gameStateRef.current !== GameState.PLAYING) return;
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': changeDirection(Direction.UP); break;
      case 'ArrowDown': case 's': case 'S': changeDirection(Direction.DOWN); break;
      case 'ArrowLeft': case 'a': case 'A': changeDirection(Direction.LEFT); break;
      case 'ArrowRight': case 'd': case 'D': changeDirection(Direction.RIGHT); break;
      case 'b': case 'B': activateAbility(); break;
    }
  }, [activateAbility]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || gameStateRef.current !== GameState.PLAYING) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) changeDirection(dx > 0 ? Direction.RIGHT : Direction.LEFT);
    } else {
      if (Math.abs(dy) > 30) changeDirection(dy > 0 ? Direction.DOWN : Direction.UP);
    }
    touchStartRef.current = null;
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;
    const weatherInterval = setInterval(() => {
       if (weatherRef.current === WeatherType.NONE && Math.random() < 0.3) {
           let newWeather = WeatherType.NONE;
           switch(activeBackground.id) {
               case 'default': newWeather = WeatherType.SANDSTORM; break;
               case 'winter': newWeather = WeatherType.BLIZZARD; break;
               case 'space': newWeather = WeatherType.METEOR_SHOWER; break;
               case 'autumn': newWeather = WeatherType.GALE_FORCE; break;
           }
           if (newWeather !== WeatherType.NONE) {
               setWeather(newWeather);
               setShowWeatherBanner(true);
               soundManager.setWindIntensity(1.0); 
               setTimeout(() => setShowWeatherBanner(false), 3000);
               setTimeout(() => {
                   if (gameStateRef.current === GameState.PLAYING) {
                       setWeather(WeatherType.NONE);
                       soundManager.setWindIntensity(0); 
                   }
               }, 10000 + Math.random() * 10000);
           }
       }
    }, 10000);
    return () => clearInterval(weatherInterval);
  }, [gameState, activeBackground]);

  // --- ARTIFACT SPAWNER ---
  useEffect(() => {
     if (gameState !== GameState.PLAYING) return;
     
     const spawner = setInterval(() => {
         // Max 1 artifact at a time
         if (artifactsRef.current.length === 0 && Math.random() < ARTIFACT_SPAWN_CHANCE) {
             const occupied = [...snakeRef.current, ...food, ...obstaclesRef.current.map(o => o.position)];
             const pos = getRandomPosition(occupied);
             const types = [ArtifactType.HOURGLASS, ArtifactType.DAGGER, ArtifactType.LAMP];
             const type = types[Math.floor(Math.random() * types.length)];
             
             const newArtifact: Artifact = {
                 id: `art_${Date.now()}`,
                 type,
                 position: pos,
                 spawnTime: Date.now()
             };
             
             setArtifacts([newArtifact]);
             soundManager.playObstacleWarning(); // Use a subtle sound
             
             // Auto remove after lifetime
             setTimeout(() => {
                 setArtifacts(prev => prev.filter(a => a.id !== newArtifact.id));
             }, ARTIFACT_LIFETIME);
         }
     }, 2000);
     
     return () => clearInterval(spawner);
  }, [gameState, food]);

  // --- GAME MOVEMENT LOOP ---
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;
    
    // Apply Speed Modifiers
    let tickRate = currentSpeed;
    if (weather === WeatherType.BLIZZARD) tickRate = currentSpeed * 1.3; 
    if (weather === WeatherType.GALE_FORCE) tickRate = currentSpeed * 0.7; 
    if (activeArtifactEffect === ArtifactType.HOURGLASS) tickRate = currentSpeed * TIME_SLOW_FACTOR;

    const tick = setInterval(() => {
      setSnake(prevSnake => {
        const dir = nextDirectionRef.current;
        directionRef.current = dir;
        setDirection(dir);
        const head = prevSnake[0];
        const newHead = { ...head };

        switch (dir) {
          case Direction.UP: newHead.y -= 1; break;
          case Direction.DOWN: newHead.y += 1; break;
          case Direction.LEFT: newHead.x -= 1; break;
          case Direction.RIGHT: newHead.x += 1; break;
        }

        let wallHit = false;
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
            if (activeSkin.ability === AbilityType.PASSIVE_WALL_WRAP) {
                if (newHead.x < 0) newHead.x = GRID_SIZE - 1;
                else if (newHead.x >= GRID_SIZE) newHead.x = 0;
                if (newHead.y < 0) newHead.y = GRID_SIZE - 1;
                else if (newHead.y >= GRID_SIZE) newHead.y = 0;
            } else {
                wallHit = true;
            }
        }

        if (wallHit) { handleGameOver(); return prevSnake; }

        if (prevSnake.some((s, i) => i !== prevSnake.length - 1 && s.x === newHead.x && s.y === newHead.y)) {
           handleGameOver(); return prevSnake;
        }
        
        const hitObstacleIndex = obstaclesRef.current.findIndex(obs => !obs.isWarning && obs.position.x === newHead.x && obs.position.y === newHead.y);
        
        if (hitObstacleIndex !== -1) {
            const now = Date.now();
            let destroyed = false;
            if (isAbilityActiveRef.current) {
              destroyed = true;
              setIsAbilityActive(false);
            } else if (activeSkin.ability === AbilityType.PASSIVE_SHIELD_COOLDOWN) {
              if (now - lastAutoShieldTime > PASSIVE_SHIELD_COOLDOWN_TIME) {
                destroyed = true;
                setLastAutoShieldTime(now);
                addFloatingText("SHIELD POP!", newHead, '#4caf50');
              }
            }
            if (destroyed) {
              if (activeBackground.id === 'space') { soundManager.playAsteroidExplosion(); triggerEvent('EXPLOSION', newHead); } 
              else { soundManager.playBreak(); triggerEvent('SHAKE_SMALL', newHead); }
              const newObstacles = [...obstaclesRef.current];
              newObstacles.splice(hitObstacleIndex, 1);
              setObstacles(newObstacles);
            } else {
              handleGameOver(); return prevSnake;
            }
        }

        // --- ARTIFACT COLLISION ---
        const hitArtifact = artifactsRef.current.find(a => a.position.x === newHead.x && a.position.y === newHead.y);
        let snakeAfterArtifact = [...prevSnake];
        
        if (hitArtifact) {
            soundManager.playEat(2); // High pitch sound
            setArtifacts(prev => prev.filter(a => a.id !== hitArtifact.id));
            
            switch(hitArtifact.type) {
                case ArtifactType.HOURGLASS:
                    setActiveArtifactEffect(ArtifactType.HOURGLASS);
                    setArtifactEffectEndTime(Date.now() + TIME_SLOW_DURATION);
                    addFloatingText("TIME SLOW!", newHead, '#00bcd4');
                    break;
                case ArtifactType.DAGGER:
                    if (snakeAfterArtifact.length > 5) {
                        snakeAfterArtifact = snakeAfterArtifact.slice(0, snakeAfterArtifact.length - 5);
                        addFloatingText("TAIL CUT!", newHead, '#f44336');
                    } else {
                        addFloatingText("TOO SHORT!", newHead, '#9e9e9e');
                    }
                    break;
                case ArtifactType.LAMP:
                    const occupied = [...snakeAfterArtifact, ...food, ...obstaclesRef.current.map(o => o.position)];
                    const feast: Position[] = [];
                    for(let i=0; i<5; i++) {
                        feast.push(getRandomPosition([...occupied, ...feast]));
                    }
                    setFood(prev => [...prev, ...feast]);
                    addFloatingText("FEAST!", newHead, '#ffd700');
                    break;
            }
        }

        const newSnake = [newHead, ...snakeAfterArtifact];
        
        // Check Food (Handles multiple food items)
        const foodIndex = food.findIndex(f => f.x === newHead.x && f.y === newHead.y);
        let ateFood = foodIndex !== -1;

        if (!ateFood && activeSkin.ability === AbilityType.PASSIVE_MAGNET) {
          const nearbyFoodIdx = food.findIndex(f => {
              const dx = Math.abs(newHead.x - f.x);
              const dy = Math.abs(newHead.y - f.y);
              return dx <= MAGNET_RADIUS && dy <= MAGNET_RADIUS;
          });
          if (nearbyFoodIdx !== -1 && Math.random() < MAGNET_CHANCE) {
             ateFood = true;
             // Remove specific food index logic handled below
             // Actually need to set the specific index if magnet works
             // For simplicity, magnet just teleports food to mouth effectively
          }
        }

        if (ateFood) {
           const now = Date.now();
           let newCombo = 1;
           if (now - lastEatTime < 4000) newCombo = Math.min(combo + 1, 5); 
           setCombo(newCombo);
           setLastEatTime(now);

           soundManager.playEat(newCombo);
           updateQuestProgress(QuestType.EAT_PALOV, 1);
           
           let points = 1; 
           if (newCombo > 1) points = newCombo; 
           setScore(s => s + points);
           
           const comboText = newCombo > 1 ? `COMBO x${newCombo}!` : "+1";
           const color = newCombo > 1 ? '#ffea00' : '#ffd700';
           addFloatingText(comboText, newHead, color);
           triggerEvent('EAT', newHead);

           setCurrentSpeed(s => Math.max(MIN_SPEED, s - SPEED_DECREMENT));
           
           // Remove eaten food
           const newFoodList = food.filter((_, i) => i !== foodIndex);
           // If no food left, spawn new one
           if (newFoodList.length === 0) {
               const occupied = [...newSnake, ...obstaclesRef.current.map(o => o.position)];
               newFoodList.push(getRandomPosition(occupied));
           }
           setFood(newFoodList);
        } else {
           newSnake.pop();
        }

        return newSnake;
      });
    }, tickRate);

    return () => clearInterval(tick);
  }, [gameState, currentSpeed, food, activeSkin, lastAutoShieldTime, combo, lastEatTime, weather, activeArtifactEffect]);

  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    const scheduleNextSpawn = () => {
       const currentScore = scoreRef.current;
       const settings = DIFFICULTY_SETTINGS[difficulty];
       let interval = settings.spawnIntervalStart - (currentScore * settings.scoreScaling);
       if (weatherRef.current === WeatherType.METEOR_SHOWER) interval = 800; 
       else interval = Math.max(settings.minSpawnInterval, interval);

       timeoutId = setTimeout(() => {
          if (gameStateRef.current !== GameState.PLAYING) return;
          const isMeteorShower = weatherRef.current === WeatherType.METEOR_SHOWER;
          const extraObstacles = Math.floor(currentScore / 8);
          const dynamicMax = settings.maxSpawnCount + Math.floor(currentScore / 25);
          let targetCount = Math.min(settings.baseSpawnCount + extraObstacles, dynamicMax);
          if (isMeteorShower) targetCount = 3; 

          const currentOccupied = [...snakeRef.current, ...food, ...obstaclesRef.current.map(o => o.position)];
          const newPositions: Position[] = [];

          if (isMeteorShower) {
             for(let i=0; i<targetCount; i++) {
                 const p = getRandomPosition([...currentOccupied, ...newPositions]);
                 newPositions.push(p);
             }
          } else {
             const rand = Math.random();
             let pattern: 'RANDOM' | 'LINE' | 'CLUSTER' = 'RANDOM';
             if (currentScore > 30 && rand > 0.6) pattern = 'LINE';
             else if (currentScore > 10 && rand > 0.7) pattern = 'CLUSTER';

             if (pattern === 'LINE') {
                const isHorizontal = Math.random() > 0.5;
                const length = 3 + Math.floor(Math.random() * 2);
                for(let attempt = 0; attempt < 10; attempt++) {
                    const startX = Math.floor(Math.random() * (GRID_SIZE - (isHorizontal ? length : 0)));
                    const startY = Math.floor(Math.random() * (GRID_SIZE - (!isHorizontal ? length : 0)));
                    let valid = true;
                    const temp: Position[] = [];
                    for(let i = 0; i < length; i++) {
                        const p = { x: startX + (isHorizontal ? i : 0), y: startY + (!isHorizontal ? i : 0) };
                        if (currentOccupied.some(o => o.x === p.x && o.y === p.y)) { valid = false; break; }
                        temp.push(p);
                    }
                    if (valid) { newPositions.push(...temp); break; }
                }
             } else if (pattern === 'CLUSTER') {
                 for(let attempt = 0; attempt < 10; attempt++) {
                     const x = Math.floor(Math.random() * (GRID_SIZE - 1));
                     const y = Math.floor(Math.random() * (GRID_SIZE - 1));
                     const cluster = [{x, y}, {x: x+1, y}, {x, y: y+1}, {x: x+1, y: y+1}];
                     if (!cluster.some(p => currentOccupied.some(o => o.x === p.x && o.y === p.y))) {
                         newPositions.push(...cluster); break;
                     }
                 }
             }
             const needed = Math.max(0, targetCount - newPositions.length);
             const occupiedForRandom = [...currentOccupied, ...newPositions];
             for(let i = 0; i < needed; i++) {
                 const p = getRandomPosition(occupiedForRandom);
                 newPositions.push(p);
                 occupiedForRandom.push(p);
             }
          }

          if (newPositions.length > 0) {
              if (isMeteorShower) soundManager.playObstacleWarning(); 
              else soundManager.playObstacleWarning();
              const batchId = Date.now();
              newPositions.forEach((pos, idx) => {
                  const id = `obs_${batchId}_${idx}`;
                  const obs: Obstacle = { position: pos, id, isWarning: true };
                  setObstacles(prev => [...prev, obs]);
                  setTimeout(() => {
                      if (gameStateRef.current === GameState.PLAYING) {
                         setObstacles(prev => prev.map(o => o.id === id ? { ...o, isWarning: false } : o));
                      }
                  }, isMeteorShower ? 1000 : 2000); 

                  setTimeout(() => {
                      if (gameStateRef.current === GameState.PLAYING) {
                         setObstacles(prev => prev.filter(o => o.id !== id));
                         if (activeBackground.id === 'space' || isMeteorShower) {
                            soundManager.playAsteroidExplosion();
                            triggerEvent('EXPLOSION', pos);
                         }
                      }
                  }, isMeteorShower ? 5000 : (10000 + Math.random() * 5000));
              });
          }
          scheduleNextSpawn();
       }, interval);
    };
    scheduleNextSpawn();
    return () => clearTimeout(timeoutId);
  }, [gameState, difficulty, food, weather]);

  return (
    <div 
      className="w-full h-screen relative bg-[#1a1a1a] overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <UI 
        score={score} 
        money={playerData.money}
        bestScore={playerData.bestScore} 
        gameState={gameState} 
        theme={theme}
        difficulty={difficulty}
        activeSkinId={playerData.equippedSkinId}
        unlockedSkins={playerData.unlockedSkins}
        activeBackgroundId={playerData.equippedBackgroundId}
        unlockedBackgrounds={playerData.unlockedBackgrounds}
        abilityReady={abilityCooldownRemaining === 0}
        abilityCooldown={abilityCooldownRemaining}
        musicEnabled={musicEnabled}
        activeQuests={playerData.activeQuests}
        toggleTheme={() => {
             if (activeBackground.allowedThemes && activeBackground.allowedThemes.length > 0) return;
             setTheme(t => t === Theme.DAY ? Theme.NIGHT : Theme.DAY)
        }}
        toggleMusic={toggleMusic}
        setDifficulty={setDifficulty}
        startGame={startGame}
        resetGame={startGame}
        togglePause={togglePause}
        goToMenu={goToMenu}
        openShop={openShop}
        openQuests={openQuests}
        buySkin={buySkin}
        equipSkin={equipSkin}
        buyBackground={buyBackground}
        equipBackground={equipBackground}
        onDirectionChange={changeDirection}
        activateAbility={activateAbility}
        claimQuest={claimQuest}
      />
      
      <Game3D 
        snake={snake}
        food={food}
        obstacles={obstacles}
        artifacts={artifacts}
        direction={direction}
        theme={theme}
        isGameOver={gameState === GameState.GAME_OVER}
        gameState={gameState}
        speed={currentSpeed}
        activeSkin={activeSkin}
        activeBackgroundId={activeBackground.id}
        isAbilityActive={isAbilityActive}
        isAbilityReady={
           (activeSkin.ability === AbilityType.BREAK_OBSTACLE && abilityCooldownRemaining === 0) ||
           (activeSkin.ability === AbilityType.PASSIVE_SHIELD_COOLDOWN && isAutoShieldReady)
        }
        floatingTexts={floatingTexts}
        gameEvents={gameEvents}
        weather={weather}
      />
    </div>
  );
}
