/**
 * Audio feedback for barcode scanning and POS cash operations using Web Audio API.
 * High-performance, low-latency, works across desktop and mobile browsers.
 */
class SoundEffects {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('pos_sound_muted');
        if (saved !== null) {
          this.isMuted = saved === 'true';
        }
      } catch {}

      // Automatically unlock AudioContext on first user gesture
      const unlockAudio = () => {
        this.unlock();
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };
      window.addEventListener('pointerdown', unlockAudio, { passive: true, once: true });
      window.addEventListener('keydown', unlockAudio, { passive: true, once: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true, once: true });
    }
  }

  public unlock() {
    try {
      this.initCtx();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {}
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('pos_sound_muted', muted ? 'true' : 'false');
    } catch {}
  }

  public toggleMute(): boolean {
    const next = !this.isMuted;
    this.setMuted(next);
    if (!next) {
      this.playScanBeep();
    }
    return next;
  }

  /**
   * Кратковременный звуковой сигнал (бип) успешного сканирования штрихкода.
   * Воспроизводит чистый высокочастотный сигнал 2400 Гц длительностью ~75 мс,
   * характерный для профессиональных кассовых сканеров (Zebra / Datalogic / Honeywell).
   */
  playScanBeep() {
    if (this.isMuted) return;

    try {
      this.initCtx();
      if (!this.ctx) return;

      const triggerBeep = () => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // 2400 Hz: стандартный тон оптического кассового сканера штрихкодов
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2400, now);

        // Плавная огибающая без щелчков: атака 5мс, спад до нуля за 75мс
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.18, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
      };

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => triggerBeep()).catch(() => {});
      } else {
        triggerBeep();
      }
    } catch {}
  }

  /**
   * Звуковой сигнал завершения продажи (мажорный аккорд)
   */
  playSuccessChime() {
    if (this.isMuted) return;

    try {
      this.initCtx();
      if (!this.ctx) return;

      const triggerChime = () => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 chord

        notes.forEach((freq, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);

          gain.gain.setValueAtTime(0.001, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.06 + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.28);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.28);
        });
      };

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => triggerChime()).catch(() => {});
      } else {
        triggerChime();
      }
    } catch {}
  }

  /**
   * Сигнал удаления / очистки (спадающий тон)
   */
  playTrashSound() {
    if (this.isMuted) return;

    try {
      this.initCtx();
      if (!this.ctx) return;

      const triggerTrash = () => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.15);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.18);
      };

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => triggerTrash()).catch(() => {});
      } else {
        triggerTrash();
      }
    } catch {}
  }

  /**
   * Сигнал ошибки (товар не найден, нулевой остаток, неверный ввод)
   */
  playErrorBeep() {
    if (this.isMuted) return;

    try {
      this.initCtx();
      if (!this.ctx) return;

      const triggerError = () => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(180, now + 0.1);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.22);
      };

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => triggerError()).catch(() => {});
      } else {
        triggerError();
      }
    } catch {}
  }
}

export const sounds = new SoundEffects();
