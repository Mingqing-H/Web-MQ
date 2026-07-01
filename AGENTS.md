# Repository Guidelines

## Project Structure & Module Organization

Application code lives in `src/`. Keep React UI components in `src/components/`, reusable browser behavior in `src/hooks/`, and rendering code and GLSL shaders in `src/webgl/`. Shared settings and domain types belong in `src/types.ts`; global and feature styles live under `src/styles/`.

Static images and audio are served from `public/` and referenced with root paths such as `/rain.mp3`. `legacy/` contains the pre-Vite single-file implementation and should remain reference-only. Design notes are in `DESIGN.md` and `doc/`; review artifacts belong in `audit/`. Production output is generated in `dist/` and must not be edited manually.

## Build, Test, and Development Commands

- `npm install` installs the locked dependencies from `package-lock.json`.
- `npm run dev` starts the Vite development server with hot reload.
- `npm run lint` checks TypeScript and TSX files with ESLint, React Hooks, and React Refresh rules.
- `npm run build` runs strict TypeScript checks and creates the production bundle in `dist/`.
- `npm run preview` serves the built bundle for a final local check.

Run `npm run lint` and `npm run build` before submitting changes.

## Coding Style & Naming Conventions

Use TypeScript with two-space indentation, single quotes, semicolons, and trailing commas, matching the existing source. Keep strict typing enabled; avoid `any`, unused declarations, and unchecked DOM assumptions. Name React components and exported types in PascalCase (`RainCanvas`, `RainSettings`), hooks with a `use` prefix (`useRainAudio`), and functions or values in camelCase. Use uppercase snake case for module constants.

Keep animation-frame rendering inside renderer classes rather than React state. Add new controls to `RainSettings`, expose them through `ControlPanel`, and consume them in `RainRenderer`.

## Testing Guidelines

No automated test framework or coverage threshold is currently configured. Treat linting and a production build as the required baseline. Manually verify rain rendering, audio controls, portal transitions, reduced-motion behavior, and the 3D robot view in a modern browser. If adding tests, use `*.test.ts` or `*.test.tsx` beside the code and add the runner command to `package.json`.

## Commit & Pull Request Guidelines

History favors concise, imperative commits such as `feat: 调整涟漪动画` and `refactor: 迁移至 Vite React`. Use an ASCII colon and one focused change per commit.

Pull requests should explain the user-visible result, list verification commands, and link relevant issues. Include screenshots or a short recording for visual, shader, animation, or responsive-layout changes. Note new assets, external scene URLs, or browser compatibility constraints explicitly.
