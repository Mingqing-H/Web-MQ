import { useCallback, useEffect, useRef, useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import {
  PoemGate,
  type PortalPoint,
  type RainViewPhase,
} from './components/PoemGate';
import {
  RainCanvas,
  type RainCanvasHandle,
  type RipplePoint,
} from './components/RainCanvas';
import { RobotHome } from './components/RobotHome';
import { useRainAudio } from './hooks/useRainAudio';
import { DEFAULT_SETTINGS, type RainSettings } from './types';
import './styles/portal.css';
import './styles/portal-overrides.css';
import './styles/portal-refinements.css';
import './styles/interaction-refinements.css';

const ENTER_DURATION = 1_500;
const RETURN_DURATION = 650;
const REDUCED_MOTION_DURATION = 180;
const NORMAL_RIPPLE_SPEED = 0.24;
const NORMAL_RIPPLE_LIFETIME = 3_000;
const BUTTON_REVEAL_HOLD = 900;
const BUTTON_REVEAL_FADE = 1_300;
const SCENE_URL =
  'https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode';

let robotPreloadStarted = false;

function preloadRobotExperience() {
  if (robotPreloadStarted) return;
  robotPreloadStarted = true;

  void import('@splinetool/react-spline').catch(() => {
    robotPreloadStarted = false;
  });
  void fetch(SCENE_URL, {
    cache: 'force-cache',
    mode: 'cors',
  })
    .then((response) => {
      if (!response.ok) return undefined;
      return response.arrayBuffer();
    })
    .catch(() => undefined);
}

export function App() {
  const [settings, setSettings] = useState<RainSettings>(DEFAULT_SETTINGS);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(0.28);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [rendererError, setRendererError] = useState<string | null>(null);
  const [phase, setPhase] = useState<RainViewPhase>('rain');
  const [robotPrimed, setRobotPrimed] = useState(false);
  const [portalOrigin, setPortalOrigin] = useState({ x: 0, y: 0 });
  const rainCanvasRef = useRef<RainCanvasHandle | null>(null);
  const phaseRef = useRef<RainViewPhase>('rain');
  const phaseTimerRef = useRef<number | null>(null);
  const phaseFramesRef = useRef<number[]>([]);
  const ambientTimersRef = useRef<Set<number>>(new Set());
  const buttonHoldTimerRef = useRef<number | null>(null);
  const buttonResetTimerRef = useRef<number | null>(null);

  useRainAudio('/rain.mp3', soundEnabled, volume);

  const setViewPhase = useCallback((nextPhase: RainViewPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  const clearPhaseTimer = useCallback(() => {
    if (phaseTimerRef.current !== null) {
      window.clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
    phaseFramesRef.current.forEach((frame) => {
      cancelAnimationFrame(frame);
    });
    phaseFramesRef.current = [];
  }, []);

  useEffect(() => {
    const preloadTimer = window.setTimeout(preloadRobotExperience, 400);
    let idleHandle: number | null = null;
    const warmupTimer = window.setTimeout(() => {
      const warmup = () => {
        preloadRobotExperience();
        setRobotPrimed(true);
      };

      if ('requestIdleCallback' in window) {
        idleHandle = window.requestIdleCallback(warmup, { timeout: 1_200 });
      } else {
        warmup();
      }
    }, 1_400);

    return () => {
      window.clearTimeout(preloadTimer);
      window.clearTimeout(warmupTimer);
      if (idleHandle !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleHandle);
      }
    };
  }, []);

  useEffect(
    () => () => {
      clearPhaseTimer();
      ambientTimersRef.current.forEach((timer) => {
        window.clearTimeout(timer);
      });
      ambientTimersRef.current.clear();
    },
    [clearPhaseTimer],
  );

  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleAmbientRipple = useCallback((point: RipplePoint) => {
    if (phaseRef.current !== 'rain') return;
    const button = document.querySelector<HTMLButtonElement>(
      '[data-testid="rain-entry"]',
    );
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.hypot(
      point.clientX - centerX,
      point.clientY - centerY,
    );
    const delay =
      distance
      / (Math.max(window.innerHeight, 1) * NORMAL_RIPPLE_SPEED)
      * 1_000;
    if (delay >= NORMAL_RIPPLE_LIFETIME - 120) return;

    const arrivalTimer = window.setTimeout(() => {
      ambientTimersRef.current.delete(arrivalTimer);
      if (phaseRef.current !== 'rain' || !button.isConnected) return;
      if (buttonHoldTimerRef.current !== null) {
        window.clearTimeout(buttonHoldTimerRef.current);
        ambientTimersRef.current.delete(buttonHoldTimerRef.current);
      }
      if (buttonResetTimerRef.current !== null) {
        window.clearTimeout(buttonResetTimerRef.current);
        ambientTimersRef.current.delete(buttonResetTimerRef.current);
      }

      button.classList.remove('is-ripple-receding');
      button.classList.add('is-ripple-lit');

      const holdTimer = window.setTimeout(() => {
        ambientTimersRef.current.delete(holdTimer);
        buttonHoldTimerRef.current = null;
        if (phaseRef.current !== 'rain' || !button.isConnected) return;

        button.classList.add('is-ripple-receding');
        const resetTimer = window.setTimeout(() => {
          ambientTimersRef.current.delete(resetTimer);
          buttonResetTimerRef.current = null;
          button.classList.remove('is-ripple-lit', 'is-ripple-receding');
        }, BUTTON_REVEAL_FADE + 60);
        buttonResetTimerRef.current = resetTimer;
        ambientTimersRef.current.add(resetTimer);
      }, BUTTON_REVEAL_HOLD);
      buttonHoldTimerRef.current = holdTimer;
      ambientTimersRef.current.add(holdTimer);
    }, Math.max(0, delay));
    ambientTimersRef.current.add(arrivalTimer);
  }, []);

  const enterRobotHome = useCallback(
    (point: PortalPoint) => {
      if (phaseRef.current !== 'rain') return;
      clearPhaseTimer();
      preloadRobotExperience();
      const duration = prefersReducedMotion()
        ? REDUCED_MOTION_DURATION
        : ENTER_DURATION;

      phaseRef.current = 'transitioning';
      setPortalOrigin({ x: point.clientX, y: point.clientY });
      rainCanvasRef.current?.startTransitionRipple(point, duration);

      const firstFrame = requestAnimationFrame(() => {
        const secondFrame = requestAnimationFrame(() => {
          setPhase('transitioning');
        });
        phaseFramesRef.current.push(secondFrame);
      });
      phaseFramesRef.current.push(firstFrame);

      phaseTimerRef.current = window.setTimeout(() => {
        setViewPhase('robot');
        phaseTimerRef.current = null;
      }, duration);
    },
    [clearPhaseTimer, setViewPhase],
  );

  const returnToRain = useCallback(() => {
    if (phaseRef.current !== 'robot') return;
    clearPhaseTimer();
    const duration = prefersReducedMotion()
      ? REDUCED_MOTION_DURATION
      : RETURN_DURATION;
    setViewPhase('returning');
    phaseTimerRef.current = window.setTimeout(() => {
      setViewPhase('rain');
      phaseTimerRef.current = null;
    }, duration);
  }, [clearPhaseTimer, setViewPhase]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && phaseRef.current === 'robot') {
        returnToRain();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [returnToRain]);

  useEffect(() => {
    if (phase !== 'transitioning' && phase !== 'robot') return undefined;
    const stage = document.querySelector<HTMLElement>('.robot-stage');
    if (!stage) return undefined;

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    const renderLight = () => {
      stage.style.setProperty('--cursor-light-x', `${pointerX}px`);
      stage.style.setProperty('--cursor-light-y', `${pointerY}px`);
      frame = 0;
    };
    const handlePointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      stage.classList.add('has-pointer-light');
      if (!frame) frame = requestAnimationFrame(renderLight);
    };
    const handlePointerLeave = () => {
      stage.classList.remove('has-pointer-light');
    };

    stage.addEventListener('pointermove', handlePointerMove, {
      passive: true,
    });
    stage.addEventListener('pointerleave', handlePointerLeave);
    return () => {
      cancelAnimationFrame(frame);
      stage.removeEventListener('pointermove', handlePointerMove);
      stage.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [phase]);

  const updateSetting = <K extends keyof RainSettings>(
    key: K,
    value: RainSettings[K],
  ) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const showRain = phase !== 'robot';
  const showPoem = phase !== 'robot';
  const showControls = phase === 'rain' || phase === 'transitioning';
  const showRobot = robotPrimed || phase !== 'rain';

  return (
    <main className={`app-shell phase-${phase}`}>
      {showRain && (
        <RainCanvas
          ref={rainCanvasRef}
          settings={settings}
          mediaFile={mediaFile}
          onError={setRendererError}
          onRipple={handleAmbientRipple}
        />
      )}

      {showPoem && <PoemGate phase={phase} onEnter={enterRobotHome} />}

      {showControls && (
        <div
          className={
            phase === 'transitioning'
              ? 'rain-controls is-exiting'
              : 'rain-controls'
          }
        >
          <ControlPanel
            settings={settings}
            soundEnabled={soundEnabled}
            volume={volume}
            mediaName={mediaFile?.name ?? ''}
            onSettingChange={updateSetting}
            onSoundEnabledChange={setSoundEnabled}
            onVolumeChange={setVolume}
            onMediaChange={setMediaFile}
          />
        </div>
      )}

      {showRobot && (
        <RobotHome
          phase={phase}
          origin={portalOrigin}
          onReturn={returnToRain}
        />
      )}

      {rendererError && showRain && (
        <div className="error-notice" role="alert">
          {rendererError}
        </div>
      )}
    </main>
  );
}
