# Heartfelt Rain

一个使用 React 管理界面状态、WebGL2 渲染雨幕与点击涟漪的沉浸式网页。

## 开发

```bash
npm install
npm run dev
```

浏览器打开 Vite 输出的本地地址。不要再通过 `file://` 直接打开 React 入口。

## 构建

```bash
npm run lint
npm run build
npm run preview
```

生产文件会生成在 `dist/`。

## 目录

```text
public/
  background.png       默认背景
  rain.mp3             循环雨声
src/
  components/
    ControlPanel.tsx   参数、声音与素材控制
    RainCanvas.tsx     React 与渲染器的连接层
  hooks/
    useRainAudio.ts    双音轨无缝循环
  styles/
    main.css           页面与控制台样式
  webgl/
    RainRenderer.ts    WebGL 生命周期、纹理与交互
    shaders.ts         GLSL 着色器
  App.tsx              应用状态
  types.ts             参数类型与默认值
legacy/
  heartfelt-rain.html  迁移前的单文件备份
```

## 扩展方式

- 新的 WebGL 天气效果放入 `src/webgl/`，不要让 React 驱动逐帧渲染。
- 新控制项先加入 `RainSettings`，再由 `ControlPanel` 写入，由 `RainRenderer` 读取。
- 可复用的浏览器能力（音频、持久化、传感器）放入 `src/hooks/`。
- 图片、音频等静态文件放入 `public/`，通过 `/文件名` 引用。
