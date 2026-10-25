# SlideOP

A local-first design studio built with React, TypeScript, Vite, Fabric.js, Zustand, and IndexedDB. No account, backend, paid API, or subscription is required. All project and image editing happens in your browser.

## Run locally

Use Node.js **22.12+ or 24 LTS** and npm.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. The development server binds to loopback only. Keep using the same origin and browser profile to access your local projects. `localhost` and `127.0.0.1` have separate browser storage.

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run build` produces a static `dist/` directory. The preview server normally uses port 4173, which also has a separate local project store.

### Browser checks

With the development server running, and Google Chrome installed:

```sh
npm run test:e2e
```

The Playwright configuration uses the installed Chrome browser. Change the channel in `playwright.config.ts` if you prefer an installed Playwright Chromium. Tests use isolated browser profiles and do not modify your personal editor projects.

The model inference test is opt-in because it downloads model data and runs on the CPU:

```powershell
$env:SLIDEOP_TEST_BACKGROUND = '1'
npm run test:e2e
```

## Included in this version

### Studio interface

- Design, Elements, Text, Uploads, Templates, and Layers panels.
- Collapsible side panels, light and dark themes, locally bundled fonts, contextual inspector, and canvas context menu.
- Page thumbnails, drag reordering plus accessible reorder buttons, duplication, deletion, and page names.
- Presentation preview with arrow-key navigation.
- A starter example document to explore. File → New design starts with a blank page.
- Templates has a dedicated Coming Soon view. There are no pre-made template galleries, accounts, public uploads, or publishing endpoints.

### Editing

- Native Fabric selection, dragging, resize handles, rotation, Shift multi-selection, duplication, deletion, and editor clipboard.
- Group and ungroup, nested group serialization, lock/unlock, show/hide, layer names, and layer ordering.
- Rectangles, rounded rectangles, ellipses, triangles, lines, arrows, hexagons, stars, and capsules.
- Precise position and size, rotation, flips, corner radius, solid or linear-gradient fills, strokes, opacity, and drop shadows.
- Direct on-canvas text editing, local system font families, size, weight, italic, underline, alignment, character spacing, and line spacing.
- PNG, JPEG, and WebP uploads with real image decoding and size limits. Image cropping has numeric source offsets and dimensions, plus reset.
- Alignment to page or selection bounds and horizontal/vertical distribution for three or more objects.
- Smart edge and center snapping, ruler-created guides, double-click guide removal, grid overlay, fit, zoom, and scroll-based panning.
- Eighty document-level undo snapshots, including page edits and page operations. Asset bytes are never copied into history.

### Files and persistence

- Debounced local autosave, manual save, reload recovery, local project list, and new/open/delete project actions.
- `.slideop` import/export includes the owned document format and all referenced image assets.
- Imported projects receive a new local project ID and asset IDs, keeping existing projects safe from accidental overwrite.
- PNG, JPEG, SVG with embedded images, and multi-page PDF exports.
- Import validation rejects unsupported versions, duplicate IDs, malformed geometry, missing image references, excessive nesting, and oversized files.
- SVG and HTML **imports are rejected**, rather than passed to a permissive sanitizer. Uploaded images must decode as supported raster images.
- Corrupt projects and missing assets produce recoverable error messages; stored copies are not silently deleted.

### Advanced tools

- Client-side image background removal through `@imgly/background-removal`, using its quantized ISNET model. Images are processed on the device and are not sent to an API.
- Slide Checker reports out-of-page bounds, text box overflow, overlapping text boxes, nearly aligned left edges, and basic text/page color contrast. Click a finding to select its object.
- Presentation, social post, story, A4-style poster, and desktop website mockup size presets, plus custom sizes.

## Keyboard shortcuts

| Action                              | Shortcut                         |
| ----------------------------------- | -------------------------------- |
| Undo / redo                         | Ctrl Z / Ctrl Shift Z, or Ctrl Y |
| Save locally                        | Ctrl S                           |
| Copy / cut / paste                  | Ctrl C / X / V                   |
| Duplicate                           | Ctrl D                           |
| Select all                          | Ctrl A                           |
| Group / ungroup                     | Ctrl G / Ctrl Shift G            |
| Delete                              | Delete or Backspace              |
| Nudge / larger nudge                | Arrow keys / Shift + arrow keys  |
| Select / pan                        | V / H                            |
| Temporary pan                       | Hold Space                       |
| Text / rectangle / ellipse          | T / R / O                        |
| Zoom                                | Ctrl + mouse wheel               |
| Clear selection / exit text editing | Escape                           |

Use Command in place of Ctrl on macOS. Shortcuts do not intercept text fields. The editor clipboard is internal; it does not read the system clipboard.

## Architecture

```text
src/
  model/document.ts       Versioned schema, types, factories, validation
  store/editor.ts         Zustand document, history, selection, tools, commands
  canvas/adapter.ts       Owned elements ↔ Fabric objects, offscreen rendering
  canvas/commands.ts      Geometry-dependent group and alignment operations
  components/             Studio panels, canvas, dialogs, and shared controls
  hooks/                  Autosave lifecycle and keyboard shortcuts
  services/
    assets.ts             Blob registry, decoding, and object URL lifetime
    persistence.ts        IndexedDB, project import/export, downloads
    export.ts             Raster, portable SVG, and multi-page PDF
    checker.ts            Basic design checks
    background.ts         Lazy-loaded local inference integration
```

The app-owned JSON has `format: "slideop"` and `version: 1`. Each document has stable IDs, metadata, and pages; each page owns its dimensions, background, guides, and ordered elements. Elements have explicit geometry and style, optional image asset references, and nested children for groups. Group children use group-local coordinates; transforms are converted at the Fabric boundary. The format does not embed Fabric's serialized object format.

IndexedDB stores documents and image Blobs separately. Portable files encode only referenced assets as base64. Undo snapshots contain asset IDs, never image bytes. Unchanged page references are retained to avoid rebuilding other page thumbnails on every edit. Rendering uses cancellation tokens to ignore stale asynchronous image loads; canvas instances and listeners are disposed on unmount.

Future synchronization can be added behind the persistence service. A community gallery can use the document/asset envelope without exposing Fabric internals. A future HTML/CSS builder should introduce a distinct layout document representation and renderer; visual canvas coordinates are not a responsive web layout engine.

## Background removal and offline use

The core editor and UI fonts are local after installation. Background removal lazy-loads its runtime, then downloads the quantized model (roughly 40 MB plus runtime resources) on first use from the library's default IMG.LY CDN. Downloads are cached by the browser/library, but cache persistence is browser-dependent. The UI reports progress and errors. Slow devices can take considerably longer to run inference.

For a fully self-hosted model:

1. Follow the library's [custom asset serving instructions](https://github.com/imgly/background-removal-js/tree/main/packages/web#custom-asset-serving) for version **1.7.0**.
2. Extract the matching package's `dist` contents under `public/background-model/`.
3. Create `.env.local` with `VITE_BACKGROUND_MODEL_BASE_URL=/background-model/`.
4. Restart Vite. No secret or key is needed. Do not put credentials in Vite variables; they are public client configuration.

The library is AGPL-3.0, its ISNET model is MIT, and ONNX Runtime is MIT according to the library's bundled `ThirdPartyLicenses.json`. This repository is distributed under **AGPL-3.0-only**, with the license included in `LICENSE`. See `THIRD_PARTY_NOTICES.md`.

## Deliberate limits and remaining work

- **Desktop-oriented UI:** panels adapt and collapse on smaller screens; touch-first phone editing is not implemented. The editor has a 650 px minimum layout width.
- **PDF is rasterized**, not vector text. PNG/JPEG/SVG export the current page; PDF exports all pages. SVG fonts must be installed on the receiving device.
- **Image crop is numeric**, not an interactive crop-overlay tool. Original image data is retained while the project is open; referenced source assets survive saving. Unreferenced uploads are not included in portable exports.
- **Text formatting is per text box.** Mixed styles within a string, custom font uploads, text on paths, and true fixed-height text frames are not implemented. Text boxes grow to fit content, so Slide Checker overflow warnings are conservative.
- **Checker findings are heuristics.** Contrast is against the page background, not a full composited pixel sample. Decorative shape overlaps are not flagged. Group interiors and complex rotated text need manual review.
- **Guides are added and removed**, but cannot yet be dragged. Snapping is to page/object edges, centers, and guides; grid snapping is not implemented.
- **Groups are selected as units.** Ungroup to edit individual children. There is no isolation mode, boolean shape geometry, freehand pen, or polygon-node editor.
- **Persistence is browser-local.** Clearing browser storage removes local projects. Export `.slideop` backups. There is no collaboration, recovery trash, cloud sync, or server.
- **Storage reclamation:** deleting projects does not currently garbage-collect orphaned asset records. This protects assets shared by other saved projects. A reference-aware cleanup command is future work.
- **Background removal has an upstream advisory:** the installed library bundles Zod 3 and npm reports a high-severity oversized-collection validation advisory through that dependency. SlideOP's imported projects use patched Zod 4 and explicit size/depth limits; the background library receives only fixed, application-owned configuration. No incompatible forced override is applied. Replace or update the library when an upstream compatible fix is available.
- **Website mockups are visual designs only.** No live HTML/CSS website export, marketplace, accounts, publishing, or template browser is implemented in v1.

## Verification scope

Unit tests cover versioned serialization, malformed imports, nested IDs, history immutability, redo branching, page operations, locked deletion, asset references, and bounded history. Browser checks cover real dragging, locking, text editing, group geometry, local reload, crop persistence, SVG asset embedding, image rejection, preview-related UI, project round trips, and raster/PDF downloads. The optional inference test exercises the real model, not a mock.

Browser tests run against Chrome. Firefox, Safari, touch devices, very large documents, screen-reader canvas manipulation, and print-production color fidelity still need broader validation.
