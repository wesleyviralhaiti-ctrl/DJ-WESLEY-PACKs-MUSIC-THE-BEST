// Lightweight Web Audio groove preview synthesizer for 12-second track previews
class GroovePreviewPlayer {
  private ctx: AudioContext | null = null;
  private timerId: number | null = null;
  private stopTimeoutId: number | null = null;
  private activeTrackKey: string | null = null;
  private listeners: Set<(key: string | null) => void> = new Set();

  public subscribe(listener: (key: string | null) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.activeTrackKey));
  }

  public getActiveKey(): string | null {
    return this.activeTrackKey;
  }

  public stop() {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.stopTimeoutId !== null) {
      window.clearTimeout(this.stopTimeoutId);
      this.stopTimeoutId = null;
    }
    this.activeTrackKey = null;
    this.notify();
  }

  public toggle(trackKey: string, bpm: number, packId: string) {
    if (this.activeTrackKey === trackKey) {
      this.stop();
      return;
    }

    this.stop();

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      return;
    }

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    this.activeTrackKey = trackKey;
    this.notify();

    const stepMs = (60 / Math.max(85, Math.min(150, bpm)) / 2) * 1000;
    let step = 0;

    const triggerStep = () => {
      if (!this.ctx || this.activeTrackKey !== trackKey) return;
      const now = this.ctx.currentTime;

      // Kick on downbeats
      if (step % 4 === 0 || (packId === 'raboday-kanaval' && step % 4 === 3)) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(128, now);
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
        gain.gain.setValueAtTime(0.32, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.19);
      }

      // Cowbell / rimshot / log drum accent
      if (
        (packId === 'konpa-gouyad' && (step % 8 === 2 || step % 8 === 5 || step % 8 === 7)) ||
        (packId === 'raboday-kanaval' && step % 2 === 1) ||
        (packId === 'afro-dancehall' && (step % 8 === 0 || step % 8 === 3 || step % 8 === 6)) ||
        (packId === 'hiphop-trap-kreyol' && step % 4 === 2)
      ) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = packId === 'konpa-gouyad' ? 'triangle' : 'square';
        const baseFreq = packId === 'afro-dancehall' ? 190 : packId === 'konpa-gouyad' ? 680 : 320;
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.72, now + 0.06);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      }

      // Warm bassline pulse
      if (step % 8 === 0 || step % 8 === 4 || step % 8 === 6) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const notes = [55, 65.41, 73.42, 61.74];
        const freq = notes[(Math.floor(step / 8) + bpm) % notes.length];
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      }

      step += 1;
    };

    triggerStep();
    this.timerId = window.setInterval(triggerStep, stepMs);
    this.stopTimeoutId = window.setTimeout(() => {
      if (this.activeTrackKey === trackKey) {
        this.stop();
      }
    }, 12000);
  }
}

export const groovePreview = new GroovePreviewPlayer();
