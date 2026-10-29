# Aether Copilot AI - Frontend Architecture

## Overview
Aether Copilot AI uses a modern, performant, and highly interactive frontend architecture built with **React 19**, **Vite**, **TypeScript**, and **Tailwind CSS 4**. The primary goal is to provide a premium SaaS experience, particularly highlighted by the interactive Spatial Workspace.

## Tech Stack
- **Framework:** React 19 + TypeScript
- **Bundler:** Vite
- **Styling:** Tailwind CSS 4, Lucide React (Icons)
- **State Management:** Zustand (for global application and workspace state)
- **Routing:** React Router v7
- **Animations:** Framer Motion (Page transitions, element micro-interactions)
- **Data Visualization:** Plotly.js (`react-plotly.js`)
- **Spatial UI (Canvas):** React Flow (`@xyflow/react`)

## Key Architecture Decisions

### 1. Spatial UI (React Flow)
The core of the application is the `WorkspacePage.tsx`. We utilize `ReactFlowProvider` to wrap the canvas, allowing our custom nodes (`SpatialAnalyticsNode`) and the toolbar panels to access the global React Flow instance. This allows for deep interactivity like fit-to-view, zooming, and dynamic layout.

### 2. State Management (Zustand)
We use slice-based stores via Zustand to keep global state lean.
- `useWorkspaceStore`: Tracks active datasets, selected nodes, and spatial layouts.
- `useThemeStore`: Manages light/dark mode across the app globally. 

### 3. Service Layer (Mocking)
Currently operating in "Frontend First Mode", all API calls are abstracted into `src/services/mockServices.ts`. This allows rapid UI iteration and testing without being blocked by backend dependencies. Once the backend is unfrozen, these functions can seamlessly transition to real `fetch` / `axios` calls.

### 4. Shared Charting Component
`ChartCanvas.tsx` acts as a generic wrapper around `react-plotly.js`. This guarantees consistent styling, responsiveness, and automatic theme adaptation (light/dark mode colors) for all charts across the Analytics, Visualizations, and Patterns pages.

### 5. Page Transitions and Error Handling
`AppLayout.tsx` incorporates `AnimatePresence` from Framer Motion alongside a global React `<ErrorBoundary />`. This ensures graceful fallback if a component throws an error, and smooth slide/fade animations when navigating between routes, drastically enhancing the premium feel of the app.

## Theming
We enforce a strict aesthetic standard: vibrant colors, backdrop filters (glassmorphism), deep shadows, and subtle borders. Tailwind classes dynamically switch depending on the global `useThemeStore` state, transitioning smoothly between an `indigo/cyan` deep-dark theme and a crisp, clean light theme.
