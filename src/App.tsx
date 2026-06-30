import { useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { RainCanvas } from './components/RainCanvas';
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
        <p className="poem-cn">
          <span>“每一滴雨，都是天空写给大地的信。</span>
          <span>而你，恰好经过了这场雨。”</span>
        </p>
        <p className="poem-en">
          Every raindrop is a letter from the sky, and you arrived right in
          time for the rain.
        </p>
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
