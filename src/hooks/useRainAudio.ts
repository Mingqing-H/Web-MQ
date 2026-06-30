import { useEffect, useRef, useState } from 'react';

export type RainAudioStatus = '等待交互' | '无缝循环播放中' | '已关闭';

class SeamlessRainAudio {
  private readonly tracks: [HTMLAudioElement, HTMLAudioElement];
  private readonly onStatus: (status: RainAudioStatus) => void;
  private enabled = true;
  private volume = 0.28;
  private activeTrack = 0;
  private loopTimer = 0;
  private volumeFrame = 0;
  private unlocked = false;
  private disposed = false;

  constructor(
    source: string,
    onStatus: (status: RainAudioStatus) => void,
  ) {
    this.tracks = [new Audio(source), new Audio(source)];
    this.onStatus = onStatus;
    this.tracks.forEach((track) => {
      track.preload = 'auto';
      track.volume = 0;
    });
    document.addEventListener('pointerdown', this.unlock);
    document.addEventListener('keydown', this.unlock);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    } else if (this.unlocked) {
      void this.start();
    } else {
      this.onStatus('等待交互');
    }
  }

  setVolume(volume: number): void {
    this.volume = volume;
    const playing = this.tracks.filter((track) => !track.paused);
    if (playing.length === 1) playing[0].volume = volume;
  }

  dispose(): void {
    this.disposed = true;
    document.removeEventListener('pointerdown', this.unlock);
    document.removeEventListener('keydown', this.unlock);
    this.cancelTransitions();
    this.tracks.forEach((track) => {
      track.pause();
      track.removeAttribute('src');
      track.load();
    });
  }

  private unlock = (): void => {
    if (this.unlocked || this.disposed) return;
    this.unlocked = true;
    document.removeEventListener('pointerdown', this.unlock);
    document.removeEventListener('keydown', this.unlock);
    if (this.enabled) void this.start();
  };

  private async start(): Promise<void> {
    if (!this.enabled || this.disposed) return;
    const active = this.tracks[this.activeTrack];

    try {
      if (active.paused) {
        active.volume = 0;
        await active.play();
      }
      this.fadeIn(active);
      this.scheduleCrossfade(active);
      this.onStatus('无缝循环播放中');
    } catch {
      this.onStatus('等待交互');
    }
  }

  private fadeIn(track: HTMLAudioElement, duration = 700): void {
    cancelAnimationFrame(this.volumeFrame);
    const startedAt = performance.now();
    const startVolume = track.volume;

    const step = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      track.volume = startVolume + (this.volume - startVolume) * eased;
      if (progress < 1) this.volumeFrame = requestAnimationFrame(step);
    };

    this.volumeFrame = requestAnimationFrame(step);
  }

  private scheduleCrossfade(track: HTMLAudioElement): void {
    window.clearTimeout(this.loopTimer);
    if (!Number.isFinite(track.duration) || track.duration <= 0) {
      track.addEventListener(
        'loadedmetadata',
        () => this.scheduleCrossfade(track),
        { once: true },
      );
      return;
    }

    const duration = Math.min(2.2, Math.max(1.2, track.duration * 0.14));
    const delay = Math.max(0.05, track.duration - track.currentTime - duration);
    this.loopTimer = window.setTimeout(
      () => void this.crossfade(duration),
      delay * 1000,
    );
  }

  private async crossfade(duration: number): Promise<void> {
    if (!this.enabled || this.disposed) return;
    const outgoingIndex = this.activeTrack;
    const incomingIndex = 1 - outgoingIndex;
    const outgoing = this.tracks[outgoingIndex];
    const incoming = this.tracks[incomingIndex];
    incoming.currentTime = 0;
    incoming.volume = 0;

    try {
      await incoming.play();
    } catch {
      this.onStatus('等待交互');
      return;
    }

    cancelAnimationFrame(this.volumeFrame);
    const startedAt = performance.now();

    const step = (now: number) => {
      const progress = Math.min(
        (now - startedAt) / (duration * 1000),
        1,
      );
      const eased = progress * progress * (3 - 2 * progress);
      outgoing.volume = this.volume * (1 - eased);
      incoming.volume = this.volume * eased;

      if (progress < 1) {
        this.volumeFrame = requestAnimationFrame(step);
        return;
      }

      outgoing.pause();
      outgoing.currentTime = 0;
      outgoing.volume = 0;
      this.activeTrack = incomingIndex;
      this.scheduleCrossfade(incoming);
    };

    this.volumeFrame = requestAnimationFrame(step);
  }

  private stop(): void {
    this.cancelTransitions();
    const startVolumes = this.tracks.map((track) => track.volume);
    const startedAt = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - startedAt) / 450, 1);
      const eased = 1 - (1 - progress) ** 3;
      this.tracks.forEach((track, index) => {
        track.volume = startVolumes[index] * (1 - eased);
      });

      if (progress < 1) {
        this.volumeFrame = requestAnimationFrame(step);
        return;
      }

      this.tracks.forEach((track) => track.pause());
      this.onStatus('已关闭');
    };

    this.volumeFrame = requestAnimationFrame(step);
  }

  private cancelTransitions(): void {
    cancelAnimationFrame(this.volumeFrame);
    window.clearTimeout(this.loopTimer);
  }
}

export function useRainAudio(
  source: string,
  enabled: boolean,
  volume: number,
): RainAudioStatus {
  const [status, setStatus] = useState<RainAudioStatus>('等待交互');
  const controllerRef = useRef<SeamlessRainAudio | null>(null);

  useEffect(() => {
    const controller = new SeamlessRainAudio(source, setStatus);
    controllerRef.current = controller;
    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, [source]);

  useEffect(() => {
    controllerRef.current?.setEnabled(enabled);
  }, [enabled]);

  useEffect(() => {
    controllerRef.current?.setVolume(volume);
  }, [volume]);

  return status;
}
