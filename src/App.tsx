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
  const audioStatus = useRainAudio('/rain.mp3', soundEnabled, volume);

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

      <div className="interaction-hint" aria-hidden="true">
        <span />
        点击水面，泛起涟漪
      </div>

      <ControlPanel
        settings={settings}
        soundEnabled={soundEnabled}
        volume={volume}
        audioStatus={audioStatus}
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
