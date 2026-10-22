import { ShotType } from '../types/game';

/**
 * High-performance Web Audio Synthesizer for Olympic Badminton Arena.
 * Generates dynamic racket strikes, aerodynamic whooshes, shuttlecock cork pops,
 * umpire whistles, and roaring stadium audience atmosphere.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private crowdEnabled: boolean = true;
  private ambientNoiseNode: AudioNode | null = null;
  private ambientGain: GainNode | null = null;

  constructor() {
    // Lazy initialize upon first user interaction to satisfy browser autoplay policies
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public setCrowdEnabled(enabled: boolean) {
    this.crowdEnabled = enabled;
    if (!enabled && this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  /**
   * Shuttlecock racket strike sound with customizable velocity and shot physics
   */
  public playHit(type: ShotType, speedKmH: number = 180) {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Racket string bed snap (High frequency pop)
    const snapOsc = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    let baseFreq = 800;
    let endFreq = 220;
    let duration = 0.08;
    let volume = 0.6;

    if (type === 'smash') {
      baseFreq = 1400;
      endFreq = 160;
      duration = 0.14;
      volume = Math.min(1.0, 0.6 + speedKmH / 500);

      // Add deep acoustic boom for power smash
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(140, now);
      subOsc.frequency.exponentialRampToValueAtTime(45, now + duration);

      subGain.gain.setValueAtTime(volume * 0.9, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + duration);

      // Extra white noise crack for high-tension Yonex string snap
      this.playNoiseCrack(now, 0.05, 0.8);
    } else if (type === 'clear') {
      baseFreq = 950;
      endFreq = 260;
      duration = 0.1;
      volume = 0.7;
    } else if (type === 'drop') {
      baseFreq = 520;
      endFreq = 300;
      duration = 0.04;
      volume = 0.35;
    } else if (type === 'drive') {
      baseFreq = 1100;
      endFreq = 240;
      duration = 0.07;
      volume = 0.65;
    }

    snapOsc.type = 'sine';
    snapOsc.frequency.setValueAtTime(baseFreq, now);
    snapOsc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(baseFreq * 1.2, now);
    filter.Q.value = 3.0;

    snapGain.gain.setValueAtTime(volume, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    snapOsc.connect(filter);
    filter.connect(snapGain);
    snapGain.connect(this.ctx.destination);

    snapOsc.start(now);
    snapOsc.stop(now + duration);
  }

  private playNoiseCrack(startTime: number, duration: number, volume: number) {
    if (!this.ctx) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(2200, startTime);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.7, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    whiteNoise.start(startTime);
  }

  /**
   * Shuttlecock hitting the net cord / tape
   */
  public playNetClip() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.08);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Shuttlecock landing / bounce on the court mat
   */
  public playBounce() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.06);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * Umpire referee whistle
   */
  public playWhistle() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [2600, 2750].forEach((freq) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq + 40, now + 0.18);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    });
  }

  /**
   * Crowd gasps on sharp drops or steep jump smashes
   */
  public playCrowdGasp() {
    if (!this.soundEnabled || !this.crowdEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = 0.5;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const progress = i / bufferSize;
      const env = Math.sin(progress * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.linearRampToValueAtTime(650, now + duration);
    filter.Q.value = 1.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(now);
  }

  /**
   * Audience cheers and applauds for winners
   */
  public playCrowdCheer(intensity: 'small' | 'medium' | 'roar' = 'medium') {
    if (!this.soundEnabled || !this.crowdEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = intensity === 'roar' ? 2.8 : intensity === 'medium' ? 1.8 : 1.0;
    const volume = intensity === 'roar' ? 0.7 : intensity === 'medium' ? 0.5 : 0.3;

    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.linearRampToValueAtTime(950, now + 0.4);
    filter.frequency.linearRampToValueAtTime(500, now + duration);
    filter.Q.value = 1.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(now);

    // Add rhythmic clapping pulses
    this.playClappingBurst(now, duration * 0.8, volume);
  }

  private playClappingBurst(startTime: number, duration: number, volume: number) {
    if (!this.ctx) return;
    const clapCount = Math.floor(duration * 6);
    for (let i = 0; i < clapCount; i++) {
      const clapTime = startTime + (i / 6) + (Math.random() * 0.05 - 0.025);
      const clapOsc = this.ctx.createOscillator();
      const clapGain = this.ctx.createGain();

      clapOsc.type = 'triangle';
      clapOsc.frequency.setValueAtTime(800 + Math.random() * 300, clapTime);

      clapGain.gain.setValueAtTime(volume * 0.25, clapTime);
      clapGain.gain.exponentialRampToValueAtTime(0.001, clapTime + 0.04);

      clapOsc.connect(clapGain);
      clapGain.connect(this.ctx.destination);

      clapOsc.start(clapTime);
      clapOsc.stop(clapTime + 0.04);
    }
  }

  /**
   * Announce score / fault / game event via SpeechSynthesis or fallback audio chords
   */
  public speakAnnouncement(text: string) {
    if (!this.soundEnabled) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        window.speechSynthesis.speak(utterance);
        return;
      } catch {
        // Fallback to chord if speech synthesis is blocked
      }
    }
    this.playStadiumChime();
  }

  public playStadiumChime() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [440, 554.37, 659.25].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const time = now + idx * 0.12;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.25, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + 0.5);
    });
  }

  /**
   * Triumphant fanfare for match victory
   */
  public playVictoryFanfare() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [
      { f: 523.25, d: 0.15 }, // C5
      { f: 659.25, d: 0.15 }, // E5
      { f: 783.99, d: 0.2 },  // G5
      { f: 1046.50, d: 0.6 }, // C6
    ];

    let t = now;
    notes.forEach((n) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, t);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + n.d);
      t += n.d * 0.85;
    });

    this.playCrowdCheer('roar');
  }

  /**
   * Harmonious neutral chime when match ends in a Draw
   */
  public playDrawChime() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [440, 523.25, 659.25, 880];
    notes.forEach((f) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 1.2);
    });
    this.playCrowdCheer('medium');
  }
}

export const sound = new SoundEngine();
