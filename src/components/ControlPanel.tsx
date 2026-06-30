import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import BorderGlow from './BorderGlow';
import type { RainSettings } from '../types';

type NumericSetting = Exclude<keyof RainSettings, 'lightning'>;

interface SliderConfig {
  key: NumericSetting;
  label: string;
  min: number;
  max: number;
}

const RAIN_SLIDERS: SliderConfig[] = [
  { key: 'rain', label: '雨势', min: 0, max: 100 },
  { key: 'speed', label: '流速', min: 5, max: 40 },
  { key: 'size', label: '大小', min: 0, max: 100 },
  { key: 'density', label: '密度', min: 0, max: 100 },
  { key: 'blur', label: '雾气', min: 0, max: 100 },
  { key: 'refraction', label: '折射', min: 0, max: 100 },
  { key: 'zoom', label: '距离', min: 0, max: 100 },
];

interface ControlPanelProps {
  settings: RainSettings;
  soundEnabled: boolean;
  volume: number;
  mediaName: string;
  onSettingChange: <K extends keyof RainSettings>(
    key: K,
    value: RainSettings[K],
  ) => void;
  onSoundEnabledChange: (enabled: boolean) => void;
  onVolumeChange: (volume: number) => void;
  onMediaChange: (file: File | null) => void;
}

export function ControlPanel({
  settings,
  soundEnabled,
  volume,
  mediaName,
  onSettingChange,
  onSoundEnabledChange,
  onVolumeChange,
  onMediaChange,
}: ControlPanelProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [hoverCapable, setHoverCapable] = useState(true);
  const collapseTimerRef = useRef(0);

  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)');
    const updateMode = () => {
      setHoverCapable(query.matches);
      setCollapsed(query.matches);
    };
    updateMode();
    query.addEventListener('change', updateMode);
    return () => {
      query.removeEventListener('change', updateMode);
      window.clearTimeout(collapseTimerRef.current);
    };
  }, []);

  const expand = () => {
    window.clearTimeout(collapseTimerRef.current);
    setCollapsed(false);
  };

  const scheduleCollapse = () => {
    if (!hoverCapable) return;
    window.clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = window.setTimeout(() => setCollapsed(true), 160);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    onMediaChange(event.target.files?.[0] ?? null);
    event.target.value = '';
  };

  return (
    <BorderGlow
      className={`control-panel-glow${collapsed ? ' is-collapsed' : ''}`}
      edgeSensitivity={34}
      glowColor="195 85 72"
      backgroundColor="rgb(16 26 36 / 58%)"
      borderRadius={18}
      glowRadius={26}
      glowIntensity={0.95}
      coneSpread={27}
      fillOpacity={0}
      animated
      colors={['#69ceff', '#56a2ff', '#82e5ff']}
    >
      <aside
        className={`control-panel${collapsed ? ' is-collapsed' : ''}`}
        aria-expanded={!collapsed}
        onMouseEnter={expand}
        onMouseLeave={scheduleCollapse}
        onFocusCapture={expand}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) scheduleCollapse();
        }}
      >
        <header className="control-header">
          <span className="control-mark" aria-hidden="true" />
          <h1>雨幕控制台</h1>
          <span className="control-arrow" aria-hidden="true" />
        </header>

        <div className="control-body">
          <section className="control-section" aria-labelledby="rain-settings">
            <h2 id="rain-settings">雨滴参数</h2>
            {RAIN_SLIDERS.map((slider) => (
              <label className="control-row" key={slider.key}>
                <span>{slider.label}</span>
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  value={settings[slider.key]}
                  onChange={(event) => {
                    onSettingChange(slider.key, Number(event.target.value));
                  }}
                />
                <output>{settings[slider.key]}</output>
              </label>
            ))}
            <label className="control-row toggle-row">
              <span>闪电</span>
              <input
                className="switch-input"
                type="checkbox"
                checked={settings.lightning}
                onChange={(event) => {
                  onSettingChange('lightning', event.target.checked);
                }}
              />
              <span className="switch-track" aria-hidden="true" />
            </label>
          </section>

          <div className="control-separator" />

          <section className="control-section" aria-labelledby="background-settings">
            <h2 id="background-settings">背景</h2>
            <label className="control-row">
              <span>聚散</span>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.spread}
                onChange={(event) => {
                  onSettingChange('spread', Number(event.target.value));
                }}
              />
              <output>{settings.spread}</output>
            </label>
          </section>

          <div className="control-separator" />

          <section className="control-section" aria-labelledby="sound-settings">
            <h2 id="sound-settings">声音</h2>
            <label className="control-row toggle-row">
              <span>雨声</span>
              <input
                className="switch-input"
                type="checkbox"
                checked={soundEnabled}
                onChange={(event) => onSoundEnabledChange(event.target.checked)}
              />
              <span className="switch-track" aria-hidden="true" />
            </label>
            <label className="control-row">
              <span>音量</span>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(volume * 100)}
                onChange={(event) => {
                  onVolumeChange(Number(event.target.value) / 100);
                }}
              />
              <output>{Math.round(volume * 100)}</output>
            </label>
          </section>

          <div className="control-separator" />

          <section className="control-section material-section" aria-labelledby="media-settings">
            <h2 id="media-settings">素材</h2>
            <div className="button-row">
              <label className="button button-primary" htmlFor="media-upload">
                上传图片/视频
              </label>
              <input
                id="media-upload"
                className="visually-hidden"
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
              />
              <button
                className="button button-secondary"
                type="button"
                onClick={() => onMediaChange(null)}
              >
                恢复默认
              </button>
            </div>
            {mediaName && <p className="media-name">{mediaName}</p>}
          </section>
        </div>
      </aside>
    </BorderGlow>
  );
}
