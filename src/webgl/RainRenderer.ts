import { DEFAULT_SETTINGS, type RainSettings } from '../types';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders';

const MAX_RIPPLES = 8;
const RIPPLE_LIFETIME = 3;
const RIPPLE_BASELINE = 60;

type TextureSource = HTMLCanvasElement | HTMLImageElement | HTMLVideoElement;

interface Ripple {
  x: number;
  y: number;
  startedAt: number;
  active: number;
}

interface Uniforms {
  resolution: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
  mouse: WebGLUniformLocation | null;
  channel: WebGLUniformLocation | null;
  rain: WebGLUniformLocation | null;
  blur: WebGLUniformLocation | null;
  refraction: WebGLUniformLocation | null;
  rippleStrength: WebGLUniformLocation | null;
  lightning: WebGLUniformLocation | null;
  speed: WebGLUniformLocation | null;
  dropSize: WebGLUniformLocation | null;
  density: WebGLUniformLocation | null;
  spread: WebGLUniformLocation | null;
  zoom: WebGLUniformLocation | null;
  ripples: WebGLUniformLocation | null;
}

export class RainRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vertexShader: WebGLShader;
  private readonly fragmentShader: WebGLShader;
  private readonly buffer: WebGLBuffer;
  private readonly texture: WebGLTexture;
  private readonly uniforms: Uniforms;
  private readonly rippleData = new Float32Array(MAX_RIPPLES * 4);
  private readonly ripples: Ripple[] = Array.from(
    { length: MAX_RIPPLES },
    () => ({ x: 0, y: 0, startedAt: -100, active: 0 }),
  );

  private settings: RainSettings = { ...DEFAULT_SETTINGS };
  private animationFrame = 0;
  private lastTimestamp = 0;
  private elapsed = 0;
  private mouseX = 0;
  private mouseY = 0;
  private mouseDown = 0;
  private rippleCursor = 0;
  private disposed = false;
  private backgroundImage: HTMLImageElement | null = null;
  private fallbackCanvas: HTMLCanvasElement | null = null;
  private mediaElement: HTMLImageElement | HTMLVideoElement | null = null;
  private mediaObjectUrl: string | null = null;
  private mediaVersion = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
    });
    if (!gl) throw new Error('当前浏览器不支持 WebGL2');
    this.gl = gl;

    this.vertexShader = this.compileShader(VERTEX_SHADER, gl.VERTEX_SHADER);
    this.fragmentShader = this.compileShader(FRAGMENT_SHADER, gl.FRAGMENT_SHADER);
    this.program = this.createProgram(this.vertexShader, this.fragmentShader);
    this.buffer = this.createFullscreenTriangle();
    this.texture = this.createTexture();
    this.uniforms = this.collectUniforms();

    this.generateFallbackBackground();
    this.resize();

    window.addEventListener('resize', this.resize);
    window.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.animationFrame = requestAnimationFrame(this.render);
  }

  async loadBackground(url: string): Promise<void> {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (this.disposed) return;
      this.backgroundImage = image;
      if (!this.mediaElement) this.uploadTexture(image);
    };
    image.onerror = () => {
      if (!this.mediaElement) this.generateFallbackBackground();
    };
    image.src = url;
  }

  setSettings(settings: RainSettings): void {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
  }

  async setMediaFile(file: File | null): Promise<void> {
    const version = ++this.mediaVersion;
    this.releaseMedia();

    if (!file) {
      this.restoreBackground();
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    this.mediaObjectUrl = objectUrl;

    if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = objectUrl;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';

      try {
        await this.waitForMedia(video, 'loadeddata');
        if (version !== this.mediaVersion || this.disposed) return;
        this.mediaElement = video;
        this.uploadTexture(video);
        await video.play();
      } catch {
        if (version === this.mediaVersion) this.restoreBackground();
      }
      return;
    }

    const image = new Image();
    image.decoding = 'async';
    image.src = objectUrl;

    try {
      await this.waitForMedia(image, 'load');
      if (version !== this.mediaVersion || this.disposed) return;
      this.mediaElement = image;
      this.uploadTexture(image);
      this.revokeMediaUrl();
    } catch {
      if (version === this.mediaVersion) this.restoreBackground();
    }
  }

  dispose(): void {
    this.disposed = true;
    this.mediaVersion += 1;
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.releaseMedia();

    const { gl } = this;
    gl.deleteTexture(this.texture);
    gl.deleteBuffer(this.buffer);
    gl.deleteProgram(this.program);
    gl.deleteShader(this.vertexShader);
    gl.deleteShader(this.fragmentShader);
  }

  private compileShader(source: string, type: number): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) throw new Error('无法创建 WebGL 着色器');
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const message = this.gl.getShaderInfoLog(shader) ?? '未知着色器错误';
      this.gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  private createProgram(
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader,
  ): WebGLProgram {
    const program = this.gl.createProgram();
    if (!program) throw new Error('无法创建 WebGL 程序');
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const message = this.gl.getProgramInfoLog(program) ?? '未知链接错误';
      this.gl.deleteProgram(program);
      throw new Error(message);
    }

    this.gl.useProgram(program);
    return program;
  }

  private createFullscreenTriangle(): WebGLBuffer {
    const buffer = this.gl.createBuffer();
    if (!buffer) throw new Error('无法创建 WebGL 缓冲区');
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      this.gl.STATIC_DRAW,
    );

    const position = this.gl.getAttribLocation(this.program, 'a_pos');
    this.gl.enableVertexAttribArray(position);
    this.gl.vertexAttribPointer(position, 2, this.gl.FLOAT, false, 0, 0);
    return buffer;
  }

  private createTexture(): WebGLTexture {
    const texture = this.gl.createTexture();
    if (!texture) throw new Error('无法创建 WebGL 纹理');
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.LINEAR_MIPMAP_LINEAR,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.LINEAR,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_S,
      this.gl.CLAMP_TO_EDGE,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_T,
      this.gl.CLAMP_TO_EDGE,
    );
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
    return texture;
  }

  private collectUniforms(): Uniforms {
    const get = (name: string) => this.gl.getUniformLocation(this.program, name);
    return {
      resolution: get('iResolution'),
      time: get('iTime'),
      mouse: get('iMouse'),
      channel: get('iChannel0'),
      rain: get('u_rainAmount'),
      blur: get('u_blurMix'),
      refraction: get('u_refraction'),
      rippleStrength: get('u_rippleStrength'),
      lightning: get('u_lightning'),
      speed: get('u_speed'),
      dropSize: get('u_dropSize'),
      density: get('u_density'),
      spread: get('u_spread'),
      zoom: get('u_zoom'),
      ripples: get('u_ripples[0]'),
    };
  }

  private generateFallbackBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 540;
    const context = canvas.getContext('2d');
    if (!context) return;

    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#111820');
    gradient.addColorStop(0.45, '#24313b');
    gradient.addColorStop(1, '#070a0d');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    this.fallbackCanvas = canvas;
    this.uploadTexture(canvas);
  }

  private restoreBackground(): void {
    this.mediaElement = null;
    if (this.backgroundImage) {
      this.uploadTexture(this.backgroundImage);
    } else if (this.fallbackCanvas) {
      this.uploadTexture(this.fallbackCanvas);
    }
  }

  private uploadTexture(source: TextureSource): void {
    if (this.disposed) return;
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      source,
    );
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  private releaseMedia(): void {
    if (this.mediaElement instanceof HTMLVideoElement) {
      this.mediaElement.pause();
      this.mediaElement.removeAttribute('src');
      this.mediaElement.load();
    }
    this.mediaElement = null;
    this.revokeMediaUrl();
  }

  private revokeMediaUrl(): void {
    if (!this.mediaObjectUrl) return;
    URL.revokeObjectURL(this.mediaObjectUrl);
    this.mediaObjectUrl = null;
  }

  private waitForMedia(
    media: HTMLImageElement | HTMLVideoElement,
    eventName: 'load' | 'loadeddata',
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      media.addEventListener(eventName, () => resolve(), { once: true });
      media.addEventListener('error', () => reject(new Error('素材加载失败')), {
        once: true,
      });
    });
  }

  private resize = (): void => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(this.canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(this.canvas.clientHeight * ratio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.gl.viewport(0, 0, width, height);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = 1 - (event.clientY - rect.top) / rect.height;
    this.mouseX = x * this.canvas.width;
    this.mouseY = y * this.canvas.height;
  };

  private handlePointerDown = (event: PointerEvent): void => {
    this.mouseDown = 1;
    const rect = this.canvas.getBoundingClientRect();
    const ripple = this.ripples[this.rippleCursor];
    ripple.x = (event.clientX - rect.left) / rect.width;
    ripple.y = 1 - (event.clientY - rect.top) / rect.height;
    ripple.startedAt = this.elapsed;
    ripple.active = 1;
    this.rippleCursor = (this.rippleCursor + 1) % MAX_RIPPLES;
  };

  private handlePointerUp = (): void => {
    this.mouseDown = 0;
  };

  private render = (timestamp: number): void => {
    if (this.disposed) return;
    this.animationFrame = requestAnimationFrame(this.render);
    const delta = this.lastTimestamp
      ? Math.min((timestamp - this.lastTimestamp) * 0.001, 0.1)
      : 0;
    this.lastTimestamp = timestamp;
    this.elapsed += delta;

    if (
      this.mediaElement instanceof HTMLVideoElement
      && !this.mediaElement.paused
      && this.mediaElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      this.uploadTexture(this.mediaElement);
    }

    const { gl, uniforms, settings } = this;
    const dropSize = 2.2 - (settings.size / 100) * 1.55;
    const density = 0.725 + (settings.density / 100) * 1.275;
    const zoom = 2 - (settings.zoom / 100) * 1.6;
    const ripple = Number.isFinite(settings.ripple)
      ? settings.ripple
      : DEFAULT_SETTINGS.ripple;

    gl.useProgram(this.program);
    gl.uniform3f(uniforms.resolution, this.canvas.width, this.canvas.height, 1);
    gl.uniform1f(uniforms.time, this.elapsed);
    gl.uniform4f(
      uniforms.mouse,
      this.mouseX,
      this.mouseY,
      this.mouseDown,
      0,
    );

    for (let index = 0; index < MAX_RIPPLES; index += 1) {
      const ripple = this.ripples[index];
      if (
        ripple.active
        && this.elapsed - ripple.startedAt >= RIPPLE_LIFETIME
      ) {
        ripple.active = 0;
      }
      const offset = index * 4;
      this.rippleData[offset] = ripple.x;
      this.rippleData[offset + 1] = ripple.y;
      this.rippleData[offset + 2] = ripple.startedAt;
      this.rippleData[offset + 3] = ripple.active;
    }

    gl.uniform4fv(uniforms.ripples, this.rippleData);
    gl.uniform1i(uniforms.channel, 0);
    gl.uniform1f(uniforms.rain, settings.rain / 100);
    gl.uniform1f(uniforms.blur, settings.blur / 100);
    gl.uniform1f(uniforms.refraction, settings.refraction / 100);
    gl.uniform1f(
      uniforms.rippleStrength,
      ripple / RIPPLE_BASELINE,
    );
    gl.uniform1f(uniforms.lightning, settings.lightning ? 1 : 0);
    gl.uniform1f(uniforms.speed, settings.speed / 10);
    gl.uniform1f(uniforms.dropSize, dropSize);
    gl.uniform1f(uniforms.density, density);
    gl.uniform1f(uniforms.spread, settings.spread / 100);
    gl.uniform1f(uniforms.zoom, zoom);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
}
