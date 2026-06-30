export interface RainSettings {
  rain: number;
  speed: number;
  size: number;
  density: number;
  blur: number;
  refraction: number;
  zoom: number;
  lightning: boolean;
  spread: number;
}

export const DEFAULT_SETTINGS: RainSettings = {
  rain: 63,
  speed: 13,
  size: 64,
  density: 6,
  blur: 53,
  refraction: 100,
  zoom: 75,
  lightning: false,
  spread: 100,
};
