import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import SplitText from './SplitText';

export type RainViewPhase = 'rain' | 'transitioning' | 'robot' | 'returning';

export interface PortalPoint {
  clientX: number;
  clientY: number;
}

interface PoemGateProps {
  phase: RainViewPhase;
  onEnter: (point: PortalPoint) => void;
}

export const PoemGate = forwardRef<HTMLDivElement, PoemGateProps>(
  function PoemGate({ phase, onEnter }, forwardedRef) {
    const scopeRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const [isNear, setIsNear] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const setRefs = (node: HTMLDivElement | null) => {
      scopeRef.current = node;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    };

    useEffect(() => {
      if (phase !== 'rain') {
        setIsNear(false);
        return undefined;
      }

      const coarsePointer = window.matchMedia(
        '(hover: none), (pointer: coarse)',
      );
      if (coarsePointer.matches) {
        setIsNear(true);
        return undefined;
      }

      let frame = 0;
      const handlePointerMove = (event: PointerEvent) => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const button = buttonRef.current;
          if (!button) return;
          const rect = button.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const x = (event.clientX - centerX) / 170;
          const y = (event.clientY - centerY) / 92;
          const nextIsNear = x * x + y * y <= 1;
          setIsNear((current) =>
            current === nextIsNear ? current : nextIsNear,
          );
        });
      };

      window.addEventListener('pointermove', handlePointerMove, {
        passive: true,
      });
      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('pointermove', handlePointerMove);
      };
    }, [phase]);

    useGSAP(
      () => {
        const scope = scopeRef.current;
        if (!scope) return;
        const textTargets = scope.querySelectorAll(
          '.split-char, .poem-en .split-word',
        );
        const flourish = scope.querySelector('.poem-flourish');

        if (phase === 'transitioning') {
          gsap.killTweensOf(textTargets);
          gsap
            .timeline()
            .to(
              flourish,
              {
                opacity: 0,
                scaleX: 1.08,
                scaleY: 0.9,
                filter: 'blur(10px)',
                duration: 0.72,
                ease: 'power2.in',
              },
              0.08,
            )
            .to(
              textTargets,
              {
                opacity: 0,
                y: (index) => 54 + (index % 5) * 13,
                scaleY: 1.85,
                scaleX: 0.76,
                filter: 'blur(8px)',
                duration: 0.62,
                stagger: {
                  each: 0.012,
                  from: 'random',
                },
                ease: 'power2.in',
              },
              0.1,
            );
        }

        if (phase === 'returning') {
          gsap.set(flourish, { clearProps: 'all' });
          gsap.fromTo(
            scope,
            { opacity: 0, filter: 'blur(8px)' },
            {
              opacity: 1,
              filter: 'blur(0px)',
              duration: 0.55,
              delay: 0.1,
              ease: 'power2.out',
            },
          );
        }
      },
      { dependencies: [phase], scope: scopeRef },
    );

    const handleEnter = (event: MouseEvent<HTMLButtonElement>) => {
      if (phase !== 'rain') return;
      const rect = event.currentTarget.getBoundingClientRect();
      const clientX = event.clientX || rect.left + rect.width / 2;
      const clientY = event.clientY || rect.top + rect.height / 2;
      onEnter({ clientX, clientY });
    };

    const entryVisible = isNear || isFocused;

    return (
      <div
        ref={setRefs}
        className={[
          'poem-overlay',
          entryVisible ? 'is-entry-near' : '',
          phase === 'transitioning' ? 'is-dissolving' : '',
          phase === 'returning' ? 'is-returning' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <img
          className="poem-flourish"
          src="/title-flourish.png"
          alt=""
        />
        <SplitText
          text="“每一滴雨，都是天空写给大地的信。”"
          className="poem-cn poem-cn-primary"
          tag="p"
          delay={64}
          duration={1.4}
          ease="power2.out"
          splitType="chars"
          from={{ opacity: 0, y: 18, filter: 'blur(10px)' }}
          to={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          threshold={0.1}
          rootMargin="-100px"
          textAlign="center"
        />
        <SplitText
          text="“而你，恰好经过了这场雨。”"
          className="poem-cn poem-cn-secondary"
          tag="p"
          delay={56}
          duration={1.25}
          ease="power2.out"
          splitType="chars"
          from={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
          to={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          threshold={0.1}
          rootMargin="-100px"
          textAlign="center"
        />
        <SplitText
          text="Every raindrop is a letter from the sky, and you arrived right in time for the rain."
          className="poem-en"
          tag="p"
          delay={34}
          duration={1.1}
          ease="power2.out"
          splitType="words"
          from={{ opacity: 0, y: 8, filter: 'blur(5px)' }}
          to={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          threshold={0.1}
          rootMargin="-100px"
          textAlign="center"
        />

        <button
          ref={buttonRef}
          className="rain-entry-button"
          type="button"
          disabled={phase !== 'rain'}
          aria-label="进入雨中的个人主页"
          data-testid="rain-entry"
          onClick={handleEnter}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        >
          <span>进入雨中</span>
          <span className="rain-entry-line" aria-hidden="true" />
        </button>
      </div>
    );
  },
);
