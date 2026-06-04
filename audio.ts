

export class SoundManager {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private musicGainNode: GainNode | null = null;
  private enabled: boolean = false;
  
  // Track State
  private currentTrack: string | null = null;
  private activeNodes: AudioNode[] = []; // To track and stop oscillators/nodes
  private schedulerTimer: number | null = null;

  // Weather FX
  private windGainNode: GainNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;

  // --- SILK ROAD MELODY DATA ---
  private currentNoteIndex: number = 0;
  private nextNoteTime: number = 0;
  // Hijaz / Phrygian Dominant Scale (A3 base)
  private readonly scale = {
    A2: 110.00, E3: 164.81, A3: 220.00, Bb3: 233.08, Cs4: 277.18,
    D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00
  };
  private readonly melody: {f: number, d: number}[] = [
    {f: this.scale.A3, d: 1}, {f: this.scale.Bb3, d: 0.5}, {f: this.scale.A3, d: 0.5}, 
    {f: this.scale.Cs4, d: 1}, {f: this.scale.A3, d: 1},
    {f: this.scale.D4, d: 0.5}, {f: this.scale.E4, d: 0.5}, {f: this.scale.F4, d: 0.5}, {f: this.scale.E4, d: 0.5},
    {f: this.scale.D4, d: 1}, {f: this.scale.Cs4, d: 1},
    {f: this.scale.Bb3, d: 0.25}, {f: this.scale.A3, d: 0.25}, {f: this.scale.Bb3, d: 0.25}, {f: this.scale.Cs4, d: 0.25},
    {f: this.scale.Bb3, d: 0.5}, {f: this.scale.A3, d: 1.5},
    {f: this.scale.E4, d: 1}, {f: this.scale.F4, d: 0.5}, {f: this.scale.E4, d: 0.5},
    {f: this.scale.D4, d: 0.5}, {f: this.scale.Cs4, d: 0.5}, {f: this.scale.Bb3, d: 1},
    {f: this.scale.A3, d: 2}, {f: 0, d: 1},
  ];

  constructor() {
    this.enabled = typeof window !== 'undefined' && !!(window.AudioContext || (window as any).webkitAudioContext);
  }

  resume() {
    if (!this.enabled) return;
    try {
      if (!this.ctx) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new Ctx();
        
        // SFX Bus
        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.value = 0.2; 
        this.gainNode.connect(this.ctx.destination);

        // Music Bus
        this.musicGainNode = this.ctx.createGain();
        this.musicGainNode.gain.value = 0.2; 
        this.musicGainNode.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn("Audio init failed", e);
      this.enabled = false;
    }
  }

  playMusic(backgroundId: string) {
    if (!this.enabled || !this.ctx) return;
    
    // If already playing this track, do nothing
    if (this.currentTrack === backgroundId) return;

    // Stop previous track
    this.stopMusic();

    this.currentTrack = backgroundId;
    this.ctx.resume();

    switch (backgroundId) {
      case 'space':
        this.startCosmicVoid();
        break;
      case 'winter':
        this.startFrozenPeaks();
        break;
      case 'autumn':
        this.startGoldenHarvest();
        break;
      default:
        this.startSilkRoad();
        break;
    }
  }

  stopMusic() {
    // 1. Stop Sequencer
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    
    // 2. Stop Active Oscillator Nodes (Ambience/Drone)
    this.activeNodes.forEach(node => {
      try {
        if (node instanceof OscillatorNode) {
             node.stop();
             node.disconnect();
        } else if (node instanceof AudioBufferSourceNode) {
             node.stop();
             node.disconnect();
        } else {
             node.disconnect();
        }
      } catch (e) {}
    });
    this.activeNodes = [];
    
    this.currentTrack = null;
  }

  // --- 1. SILK ROAD (Procedural Dutar) ---
  private startSilkRoad() {
    this.currentNoteIndex = 0;
    this.nextNoteTime = this.ctx!.currentTime + 0.1;
    this.scheduleSilkRoadNotes();
  }

  private scheduleSilkRoadNotes() {
    if (this.currentTrack !== 'default' && this.currentTrack !== null && this.currentTrack !== 'default') return; // Safety
    if (!this.ctx || !this.musicGainNode) return;

    while (this.nextNoteTime < this.ctx.currentTime + 0.5) {
      const note = this.melody[this.currentNoteIndex];
      const duration = note.d * 0.6;

      if (note.f > 0) {
        this.playDutarNote(note.f, this.nextNoteTime, duration);
        if (this.currentNoteIndex % 4 === 0) {
          this.playDutarNote(this.scale.A2, this.nextNoteTime, duration * 4, 0.3);
        }
      }

      this.nextNoteTime += duration;
      this.currentNoteIndex = (this.currentNoteIndex + 1) % this.melody.length;
    }

    this.schedulerTimer = window.setTimeout(() => this.scheduleSilkRoadNotes(), 100);
  }

  // --- 2. FROZEN PEAKS (Wind Ambience) ---
  private startFrozenPeaks() {
     if (!this.ctx || !this.musicGainNode) return;
     
     // Create Pink Noise buffer for Wind
     const bufferSize = this.ctx.sampleRate * 5; // 5 seconds loop
     const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
     const data = buffer.getChannelData(0);
     let lastOut = 0;
     for (let i = 0; i < bufferSize; i++) {
         const white = Math.random() * 2 - 1;
         data[i] = (lastOut + (0.02 * white)) / 1.02; // Pink noise approximation
         lastOut = data[i];
         data[i] *= 3.5; 
     }

     const noiseSrc = this.ctx.createBufferSource();
     noiseSrc.buffer = buffer;
     noiseSrc.loop = true;

     // Filter to shape the wind (High wind whistle)
     const filter = this.ctx.createBiquadFilter();
     filter.type = 'lowpass';
     filter.frequency.value = 400;
     filter.Q.value = 5; // Resonance for whistling sound

     // Modulate the filter frequency to simulate gusting
     const lfo = this.ctx.createOscillator();
     lfo.type = 'sine';
     lfo.frequency.value = 0.1; // Slow gusts
     
     const lfoGain = this.ctx.createGain();
     lfoGain.gain.value = 300; // Modulation depth

     lfo.connect(lfoGain);
     lfoGain.connect(filter.frequency);

     const masterGain = this.ctx.createGain();
     masterGain.gain.value = 0.08; // Subtle volume

     noiseSrc.connect(filter);
     filter.connect(masterGain);
     masterGain.connect(this.musicGainNode);

     noiseSrc.start();
     lfo.start();

     this.activeNodes.push(noiseSrc, lfo, lfoGain, filter, masterGain);
  }

  // --- 3. GOLDEN HARVEST (Autumn Breeze + Calm Tone) ---
  private startGoldenHarvest() {
    if (!this.ctx || !this.musicGainNode) return;

    // 1. Gentle Breeze (Bandpass Noise)
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600; // Mid-range rustle
    filter.Q.value = 0.5;

    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.2; // Swelling breeze
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 200;
    
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const windGain = this.ctx.createGain();
    windGain.gain.value = 0.05;

    noise.connect(filter);
    filter.connect(windGain);
    windGain.connect(this.musicGainNode);

    noise.start();
    lfo.start();
    this.activeNodes.push(noise, lfo, lfoGain, filter, windGain);
    
    // 2. Occasional Warm Chime
    const scheduleChime = () => {
       if (this.currentTrack !== 'autumn') return;
       // Pentatonic random notes
       const notes = [329.63, 392.00, 440.00, 493.88, 587.33]; // E, G, A, B, D
       const note = notes[Math.floor(Math.random() * notes.length)];
       this.playTone(note, 'sine', 2, 0.05);
       this.schedulerTimer = window.setTimeout(scheduleChime, 3000 + Math.random() * 4000);
    };
    scheduleChime();
  }

  // --- 4. COSMIC VOID (Deep Space Drone) ---
  private startCosmicVoid() {
     if (!this.ctx || !this.musicGainNode) return;

     // 1. Deep Drone (Low Saws)
     const osc1 = this.ctx.createOscillator();
     osc1.type = 'sawtooth';
     osc1.frequency.value = 55.00; // A1

     const osc2 = this.ctx.createOscillator();
     osc2.type = 'sawtooth';
     osc2.frequency.value = 55.25; // Detuned slightly

     const filter = this.ctx.createBiquadFilter();
     filter.type = 'lowpass';
     filter.frequency.value = 120; // Very dull

     const droneGain = this.ctx.createGain();
     droneGain.gain.value = 0.15;

     osc1.connect(filter);
     osc2.connect(filter);
     filter.connect(droneGain);
     droneGain.connect(this.musicGainNode);
     
     osc1.start();
     osc2.start();
     this.activeNodes.push(osc1, osc2, filter, droneGain);

     // 2. High Shimmer (Random Sine Blips)
     const scheduleShimmer = () => {
        if (this.currentTrack !== 'space') return;
        const freq = 880 + Math.random() * 440; // High A5 range
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, this.ctx!.currentTime);
        gain.gain.linearRampToValueAtTime(0.03, this.ctx!.currentTime + 1);
        gain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 4); // Long tail

        osc.connect(gain);
        gain.connect(this.musicGainNode!);
        
        osc.start();
        osc.stop(this.ctx!.currentTime + 4);
        
        this.schedulerTimer = window.setTimeout(scheduleShimmer, 2000 + Math.random() * 3000);
     };
     scheduleShimmer();
  }

  // --- SFX & HELPERS ---

  private playDutarNote(freq: number, time: number, duration: number, volumeScale = 1.0) {
    if (!this.ctx || !this.musicGainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, time);
    filter.frequency.exponentialRampToValueAtTime(500, time + 0.2);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volumeScale, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGainNode);

    osc.start(time);
    osc.stop(time + duration + 0.1);
  }

  playEat(comboMultiplier: number = 1) { 
    // Higher pitch for higher combo
    const pitch = 440 + (comboMultiplier - 1) * 50;
    this.playTone(pitch, 'triangle', 0.1, 0.3); 
  }

  playObstacleWarning() { this.playTone(150, 'sine', 1.6, 0.2); }
  
  playObstacleDrop() {
    if (!this.enabled || !this.ctx || !this.gainNode) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.4);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.05);
    gain.gain.linearRampToValueAtTime(0, t + 0.4);
    osc.connect(gain);
    gain.connect(this.gainNode);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  playObstacleImpact() {
    if (!this.enabled || !this.ctx || !this.gainNode) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.2);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    osc.connect(gain);
    gain.connect(this.gainNode);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  playBreak() {
    if (!this.enabled || !this.ctx || !this.gainNode) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(10, t + 0.1);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.connect(gain);
    gain.connect(this.gainNode);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  playGameOver() {
    if (!this.enabled || !this.ctx || !this.gainNode) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.5);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.6);
    osc.connect(gain);
    gain.connect(this.gainNode);
    osc.start(t);
    osc.stop(t + 0.7);
  }
  
  playAsteroidExplosion() {
    if (!this.enabled || !this.ctx || !this.gainNode) return;
    const t = this.ctx.currentTime;
    
    // Impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(10, t + 0.5);
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    osc.connect(gain);
    gain.connect(this.gainNode);
    osc.start(t);
    osc.stop(t + 0.5);
    
    // Shatter (Noise)
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    
    noiseGain.gain.setValueAtTime(0.4, t);
    noiseGain.gain.linearRampToValueAtTime(0, t + 0.3);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.gainNode);
    noise.start(t);
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol: number) {
    if (!this.enabled || !this.ctx || !this.gainNode) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.linearRampToValueAtTime(0, t + duration);
    osc.connect(gain);
    gain.connect(this.gainNode);
    osc.start(t);
    osc.stop(t + duration + 0.1);
  }

  setWindIntensity(intensity: number) {
    if (!this.enabled || !this.ctx) return;

    // Initialize Bus if missing
    if (!this.windGainNode) {
        this.windGainNode = this.ctx.createGain();
        this.windGainNode.gain.value = 0;
        this.windGainNode.connect(this.ctx.destination);
    }

    const t = this.ctx.currentTime;

    if (intensity > 0) {
        // Start wind if not playing
        if (!this.windSource) {
            const bufferSize = this.ctx.sampleRate * 2;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            let lastOut = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                data[i] = (lastOut + (0.02 * white)) / 1.02; // Pink noise
                lastOut = data[i];
                data[i] *= 3.5;
            }
            
            this.windSource = this.ctx.createBufferSource();
            this.windSource.buffer = buffer;
            this.windSource.loop = true;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 400;
            filter.Q.value = 1; // Little resonance for "howling"

            this.windSource.connect(filter);
            filter.connect(this.windGainNode);
            this.windSource.start(t);
        }
        
        // Ramp up
        this.windGainNode.gain.cancelScheduledValues(t);
        this.windGainNode.gain.linearRampToValueAtTime(intensity * 0.2, t + 2); 

    } else {
        // Stop wind
        if (this.windSource) {
            this.windGainNode.gain.cancelScheduledValues(t);
            this.windGainNode.gain.linearRampToValueAtTime(0, t + 2);
            this.windSource.stop(t + 2.1);
            this.windSource = null;
        }
    }
  }
}

export const soundManager = new SoundManager();