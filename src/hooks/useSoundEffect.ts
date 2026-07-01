import { useCallback, useEffect, useRef } from 'react';

export function useSoundEffect(
  source: string,
  enabled: boolean,
  volume: number,
): () => void {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(source);
    audio.preload = 'auto';
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audioRef.current = null;
    };
  }, [source]);

  return useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !enabled) return;

    audio.currentTime = 0;
    audio.volume = volume;
    void audio.play().catch(() => undefined);
  }, [enabled, volume]);
}
