import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import type { Application } from '@splinetool/runtime';
import type { RainViewPhase } from './PoemGate';

const SCENE_URL =
  'https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode';
const LazySpline = lazy(() => import('@splinetool/react-spline'));

interface SceneBoundaryProps {
  children: ReactNode;
  resetKey: number;
  onRetry: () => void;
}

interface SceneBoundaryState {
  hasError: boolean;
}

class SceneBoundary extends Component<
  SceneBoundaryProps,
  SceneBoundaryState
> {
  state: SceneBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SceneBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Spline scene failed to render', error, info);
  }

  componentDidUpdate(previousProps: SceneBoundaryProps) {
    if (
      previousProps.resetKey !== this.props.resetKey
      && this.state.hasError
    ) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return <SceneError onRetry={this.props.onRetry} />;
    }
    return this.props.children;
  }
}

function SceneLoading() {
  return (
    <div className="scene-status" role="status">
      <span className="scene-loader" aria-hidden="true" />
      <span>正在穿过雨幕…</span>
    </div>
  );
}

function SceneError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="scene-status scene-status-error" role="alert">
      <p>雨幕暂时遮住了来客。</p>
      <button type="button" onClick={onRetry}>
        重新加载场景
      </button>
    </div>
  );
}

interface RobotHomeProps {
  phase: RainViewPhase;
  origin: { x: number; y: number };
  onReturn: () => void;
}

export function RobotHome({
  phase,
  origin,
  onReturn,
}: RobotHomeProps) {
  const [retryKey, setRetryKey] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const splineAppRef = useRef<Application | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setHasTimedOut(true);
    }, 12_000);
    return () => window.clearTimeout(timeout);
  }, [retryKey]);

  useEffect(() => {
    const splineApp = splineAppRef.current;
    if (!splineApp) return;

    if (phase === 'rain') {
      splineApp.stop();
    } else {
      splineApp.play();
    }
  }, [isLoaded, phase]);

  const retry = () => {
    splineAppRef.current = null;
    setIsLoaded(false);
    setHasTimedOut(false);
    setRetryKey((key) => key + 1);
  };
  const stageClass = [
    'robot-stage',
    phase === 'rain' ? 'is-prewarming' : '',
    phase === 'transitioning' ? 'is-entering' : '',
    phase === 'robot' ? 'is-active' : '',
    phase === 'returning' ? 'is-leaving' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      className={stageClass}
      style={
        {
          '--portal-x': `${origin.x}px`,
          '--portal-y': `${origin.y}px`,
        } as CSSProperties
      }
      aria-label="3D 个人主页"
      aria-hidden={phase === 'rain'}
      data-testid="robot-home"
    >
      <div className="robot-scene" aria-hidden={phase === 'returning'}>
        {!isLoaded && !hasTimedOut && <SceneLoading />}
        {hasTimedOut && !isLoaded && <SceneError onRetry={retry} />}
        <SceneBoundary resetKey={retryKey} onRetry={retry}>
          <Suspense fallback={null}>
            <LazySpline
              key={retryKey}
              scene={SCENE_URL}
              className={isLoaded ? 'robot-spline is-loaded' : 'robot-spline'}
              onLoad={(splineApp) => {
                splineAppRef.current = splineApp;
                if (phase === 'rain') splineApp.stop();
                setIsLoaded(true);
                setHasTimedOut(false);
              }}
            />
          </Suspense>
        </SceneBoundary>
      </div>

      <div className="robot-atmosphere" aria-hidden="true" />
      <div className="robot-copy">
        <p className="robot-kicker">WELCOME THROUGH THE RAIN</p>
        <h1>欢迎来到我的主页</h1>
        <p className="robot-subtitle">你穿过这场雨，也恰好来到这里。</p>
      </div>

      <button
        className="robot-back"
        type="button"
        onClick={onReturn}
        disabled={phase !== 'robot'}
        aria-label="返回雨幕首页"
        data-testid="robot-back"
      >
        返回雨幕
      </button>
    </section>
  );
}
