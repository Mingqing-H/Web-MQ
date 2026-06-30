import { useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { RainCanvas } from './components/RainCanvas';
import SplitText from './components/SplitText';
import { useRainAudio } from './hooks/useRainAudio';
import { DEFAULT_SETTINGS, type RainSettings } from './types';

export function App() {
  const [settings, setSettings] = useState<RainSettings>(DEFAULT_SETTINGS);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(0.28);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [rendererError, setRendererError] = useState<string | null>(null);
  useRainAudio('/rain.mp3', soundEnabled, volume);

  const updateSetting = <K extends keyof RainSettings>(
    key: K,
    value: RainSettings[K],
  ) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  return (
    <main className="app-shell">
      <RainCanvas
        settings={settings}
        mediaFile={mediaFile}
        onError={setRendererError}
      />

      <div className="poem-overlay" aria-hidden="true">
        <img
          className="poem-flourish"
          src="/title-flourish.png"
          alt=""
        />
        <SplitText
          text={'“每一滴雨，都是天空写给大地的信。”'}
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
          text={'“而你，恰好经过了这场雨。”'}
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
      </div>

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

      {rendererError && (
        <div className="error-notice" role="alert">
          {rendererError}
        </div>
      )}
    </main>
  );
}
