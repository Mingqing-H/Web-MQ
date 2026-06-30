import { useEffect, useRef } from 'react';
import type { RainSettings } from '../types';
import { RainRenderer } from '../webgl/RainRenderer';

interface RainCanvasProps {
  settings: RainSettings;
  mediaFile: File | null;
  onError: (message: string | null) => void;
}

export function RainCanvas({
  settings,
  mediaFile,
  onError,
}: RainCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<RainRenderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    try {
      const renderer = new RainRenderer(canvas);
      rendererRef.current = renderer;
      void renderer.loadBackground('/background.png');
      onError(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : '雨幕初始化失败');
    }

    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, [onError]);

  useEffect(() => {
    rendererRef.current?.setSettings(settings);
  }, [settings]);

  useEffect(() => {
    void rendererRef.current?.setMediaFile(mediaFile);
  }, [mediaFile]);

  return (
    <canvas
      ref={canvasRef}
      className="rain-canvas"
      role="img"
      aria-label="可点击产生涟漪的动态雨幕"
    />
  );
}
