import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type PointerEvent,
} from 'react';
import type { RainSettings } from '../types';
import { RainRenderer } from '../webgl/RainRenderer';

export interface RipplePoint {
  clientX: number;
  clientY: number;
}

export interface RainCanvasHandle {
  startTransitionRipple: (
    origin: RipplePoint,
    durationMs: number,
  ) => void;
}

interface RainCanvasProps {
  settings: RainSettings;
  mediaFile: File | null;
  onError: (message: string | null) => void;
  onRipple?: (point: RipplePoint) => void;
}

export const RainCanvas = forwardRef<RainCanvasHandle, RainCanvasProps>(
  function RainCanvas(
    { settings, mediaFile, onError, onRipple },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rendererRef = useRef<RainRenderer | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        startTransitionRipple: (origin, durationMs) => {
          rendererRef.current?.startTransitionRipple(origin, durationMs);
        },
      }),
      [],
    );

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return undefined;

      try {
        const renderer = new RainRenderer(canvas);
        rendererRef.current = renderer;
        void renderer.loadBackground('/background.png');
        onError(null);
      } catch (error) {
        onError(
          error instanceof Error ? error.message : '雨幕初始化失败',
        );
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

    const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
      onRipple?.({
        clientX: event.clientX,
        clientY: event.clientY,
      });
    };

    return (
      <canvas
        ref={canvasRef}
        className="rain-canvas"
        role="img"
        aria-label="可点击产生涟漪的动态雨幕"
        onPointerDown={handlePointerDown}
      />
    );
  },
);
