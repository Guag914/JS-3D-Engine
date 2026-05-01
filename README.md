# JS-3D Engine

A custom WebGL 3D engine built from scratch in vanilla JavaScript. No libraries, no frameworks — just raw math and GPU calls.

---

## What It Is

A real-time 3D renderer that runs in the browser using WebGL2. It handles mesh loading, a full lighting pipeline (point, spot, and directional lights), volumetric shadow casting via shadow volumes, quaternion-based camera movement, and multiplayer via WebSocket.

The engine processes geometry through a custom CPU-side pipeline before handing it off to WebGL for rasterization.

---

## How to Use

### Controls

| Key | Action |
|-----|--------|
| `W A S D` | Move forward / left / back / right |
| `Space` | Move up |
| `Shift` | Move down |
| `↑ ↓ ← →` | Rotate (pitch / yaw) |
| `Q E` | Roll |

### NPM

- npm run server - starts server
- npm run engine - starts 3d engine

- npm run webgl-test - test if webgl works in your browser
- npm run server-test - test websocket connection

### Loading a Model

- Click **Open .obj file** in the side panel, or drag and drop a `.obj` file onto the viewport
- Models are auto-normalized to fit the scene on load

### Lighting

- Add point, spot, or directional lights from the side panel using the `+` buttons
- Set position via the X / Y / Z inputs on each light
- Adjust intensity with the slider
- A camera-attached point light is always active as a fill light

### Settings

| Toggle | Effect                                                      |
|--------|-------------------------------------------------------------|
| FPS Mode | Locks vertical movement in WASD key inputs                  |
| Wireframe | Renders edges instead of filled triangles                   |
| Advanced Shadows | Enables stencil shadow volumes — more accurate, higher cost |

---

## Why Not Three.js?

Three.js is a great library — but using it wouldn't teach me anything about how 3D rendering actually works.

The goal here was to understand the full pipeline from scratch: how perspective projection works, why quaternions avoid gimbal lock, how the GPU uses stencil buffers for shadow volumes, what vertex normal smoothing actually does to geometry. None of that comes from calling `THREE.MeshStandardMaterial`.

Building this also meant confronting the parts that libraries hide — near-plane clipping, coordinate system mismatches between OBJ exporters and your own engine, VAO state leaking between draw calls. Those are the problems that actually build intuition.

---

## Known Issues

- **WebSocket dependency** — the multiplayer code runs on connection attempt at startup. If no local server is running on `ws://localhost:3000`, a connection error is logged every frame. This does not affect single-player use.
- **Large mesh performance** — the adjacency map and silhouette detection are rebuilt on model load and are O(n) per frame for shadow casting. Very high poly meshes will drop framerate noticeably with advanced shadows on.
- **No `.mtl` support** — OBJ material files are ignored. All meshes render with a single flat color.
- **Single Layer Meshes** — The lighting system has been optimized for OBJ files only, and not single layer meshes like in the demo.

---

## Stack

- WebGL2 (GLSL ES 3.0)
- Vanilla JavaScript
- WebSocket (Node.js server, optional)