class SoundSystem {
  private ctx: AudioContext | null = null;
  private muted = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.muted = localStorage.getItem('bee_snooker_muted') === 'true';
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
  }

  isMuted() {
    return this.muted;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (typeof window !== 'undefined') {
      localStorage.setItem('bee_snooker_muted', String(m));
    }
  }

  playPotRed() {
    // Soft confirmation tone: C5 (523.25 Hz)
    this.playTone(523.25, 'sine', 0.12, 0.04);
  }

  playPotColor() {
    // Richer chime tone: E5 (659.25 Hz)
    this.playTone(659.25, 'sine', 0.16, 0.05);
  }

  playFoul() {
    // Soft buzzy warning tone: low G3 (196.00 Hz)
    this.playTone(196.00, 'triangle', 0.28, 0.08);
  }

  playTurnChange() {
    // Light click tone: A5 (880.00 Hz)
    this.playTone(880.00, 'sine', 0.04, 0.02);
  }

  playButtonTap() {
    // Minimal click feedback: 600 Hz
    this.playTone(600.00, 'sine', 0.03, 0.01);
  }

  playFrameWon() {
    // Elegant arpeggio chimes: C5 -> E5 -> G5 -> C6
    const delayStep = 0.08;
    this.playTone(523.25, 'sine', 0.15, 0.04, 0);
    this.playTone(659.25, 'sine', 0.15, 0.04, delayStep);
    this.playTone(783.99, 'sine', 0.15, 0.04, delayStep * 2);
    this.playTone(1046.50, 'sine', 0.35, 0.06, delayStep * 3);
  }

  playThemeChange() {
    // Warm tone: C5 -> E5
    this.playTone(523.25, 'sine', 0.18, 0.03, 0);
    this.playTone(659.25, 'sine', 0.18, 0.03, 0.06);
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number, delay = 0) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);

      // Volume envelope starting at `volume` and decaying exponentially to 0.0001
      gainNode.gain.setValueAtTime(volume, this.ctx.currentTime + delay);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + delay + duration);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + duration);
    } catch (e) {
      console.error('Failed to play tone', e);
    }
  }
}

export const sounds = new SoundSystem();
