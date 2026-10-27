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

- Design, Build, Elements, Text, Uploads, Templates, and Layers panels.
- Collapsible side panels, light and dark themes, locally bundled fonts, contextual inspector, and canvas context menu.
- Warm orange accents in both themes, with matching selection handles and controls. Theme changes do not recolor existing designs.
- Page thumbnails, drag reordering plus accessible reorder buttons, duplication, deletion, and page names.
- Presentation preview with arrow-key navigation.
- A starter example document to explore. File → New design starts with a blank page.
- Templates includes 14 editable built-in layouts for slides, document pages, and social graphics. Community templates still has a Coming Soon section; there are no accounts, public uploads, or publishing endpoints.

### Editing

- Native Fabric selection, dragging, resize handles, rotation, Shift multi-selection, duplication, deletion, and editor clipboard. Right-click actions select the clicked object and preserve an existing multi-selection when appropriate.
- Group and ungroup, nested group serialization, lock/unlock, show/hide, layer names, and layer ordering.
- Double-click a group (or choose **Edit group contents**) to edit its children in isolation. Nested groups have an Exit group / Back to page navigation bar. Parent rotation, scaling, and position remain intact.
- Named text and shape styles, copy/paste formatting, and saved color palettes. Create styles in Properties, apply them in Design, and update unlocked linked instances across pages. Styles and palettes are included in editable project files.
- Twenty-four shapes, including hearts, stars, starbursts, speech bubbles, lightning bolts, diamonds, shields, and geometric shapes. A custom polygon builder supports 3 to 24 sides.
- Precise position and size, rotation, flips, corner radius, solid or linear-gradient fills, strokes, opacity, and drop shadows.
- Twenty-six font families: 20 bundled fonts plus six system fonts. Browse font previews in Text, or use the grouped inspector selector. New families include Nunito Sans, Raleway, Cormorant Garamond, Libre Baskerville, Anton, Caveat, Pacifico, and JetBrains Mono.
- Direct on-canvas text editing, size, weight, italic, underline, alignment, character spacing, and line spacing. Fonts load before Fabric measures text, including during exports and project restoration.
- PNG, JPEG, and WebP uploads with real image decoding and size limits. **Crop image visually** opens a draggable crop window with corner handles, aspect-ratio presets, numeric controls, reset, and cancellation. Applying a crop is one undo step; frame width is preserved without introducing distortion. Numeric source cropping remains available.
- **Crop** is available at the top of Properties and in the canvas right-click menu. Shapes, text, and groups use an editable crop mask with the same handles, aspect ratios, and numeric controls as images. Cropping preserves the object's position, transform, selection frame, and hidden content. **Reset element crop** restores the full element. Crops survive duplication, local saving, editable project files, and image/SVG/PDF export. Reset a group's crop before ungrouping; straight lines can be shortened with their width controls.
- Each upload has a **Delete upload** button. Confirmation permanently removes SlideOP's stored image and its placements from all local projects, saved versions, Trash, undo/redo history, and the editor clipboard. **Manage stored uploads** also lists older and unused stored copies with their sizes. Original files and downloaded exports are outside this browser storage and are not deleted.
- Alignment to page or selection bounds and horizontal/vertical distribution for three or more objects.
- Smart edge and center snapping, ruler-created guides, double-click guide removal, grid overlay, fit, zoom, and free panning, including when the page already fits the workspace. Fit resets the pan offset.
- Select a layer with one click; double-click its name to rename it. Object shortcuts remain available after selecting a layer. Space activates focused buttons; temporary Space-to-pan applies in the workspace.
- Hex color fields support Enter to apply and Escape to cancel. Numeric fields show their clamped values immediately. Line color controls and saved palette colors update the visible line stroke.
- Drag guides to reposition them, or focus a guide and use arrow keys (Shift for 10 px) and Delete. **Snap to grid** uses a 20 px grid and takes precedence over smart snapping.
- Eighty document-level undo snapshots, including page edits and page operations. Asset bytes are never copied into history.

### Files and persistence

- Debounced local autosave, manual save, reload recovery, local project list, and new/open/delete project actions.
- Active canvas text drafts autosave without closing text editing or adding undo steps. Save status tracks the captured draft revision so an older write cannot incorrectly mark newer typing as saved.
- **File > Local projects > Recovery & backups** provides named manual versions, automatic checkpoints, restore, a storage-usage estimate, and portable backup downloads. Up to 20 versions per project are retained. Automatic checkpoints preserve the previous saved document on the first edit, then at five-minute intervals while changes are saved. Restoring a version first saves the current document as a recovery checkpoint.
- Deleted projects move to recoverable **Trash**. Images referenced by saved versions and deleted projects remain in IndexedDB. The database migrates existing version-one stores without deleting their projects or assets.
- `.slideop` import/export includes the owned document format and all referenced image assets.
- Imported projects receive a new local project ID and asset IDs, keeping existing projects safe from accidental overwrite.
- PNG, JPEG, SVG with embedded images, and multi-page PDF exports.
- Optional transparent-background PNG exports, plus a direct PNG download for processed cutouts.
- Import validation rejects unsupported versions, duplicate IDs, malformed geometry, missing image references, excessive nesting, and oversized files.
- SVG and HTML **imports are rejected**, rather than passed to a permissive sanitizer. Uploaded images must decode as supported raster images.
- Corrupt projects and missing assets produce recoverable error messages; stored copies are not silently deleted.

### Advanced tools

- **Remix Studio** in Build converts a structured outline into up to 20 editable pages in one undoable action. Separate pages with `---`; use `- Heading: detail` for up to six items. The builder arranges your supplied text locally and selects layouts by content structure. It does not generate facts or call an AI service.
- **Content-preserving remix** rearranges a layout-generated page with a different layout and color/font pairing. It reads your edited on-canvas text and preserves custom additions. Locked generated parts prevent remixing until unlocked. A layout with insufficient slots reports an error rather than dropping content.
- **Generic layouts:** cover, split story, agenda, cards, comparison, quote, metrics, timeline, closing, project brief, report, resume, square social graphic, and portrait announcement. All text and shapes stay editable. Templates adds a fresh page; it does not replace existing work. Document layouts are visual canvas pages, not flowing word-processing documents.
- **Page looks:** ten coordinated color combinations in Design. Apply a look to theme-linked elements or recolor unlocked text and shapes across the current page. Images and locked groups are preserved. The builder also pairs heading and body fonts with each look.
- **Arrange & repeat** in Build tidies a selection into columns with a specified gap, or repeats the selection across a grid. Both work with real object bounds and are undoable.
- Client-side image background removal through `@imgly/background-removal`, using its quantized ISNET model. Images are processed on the device and are not sent to an API.
- Background removal shows download progress and processing status. Model jobs are serialized to avoid concurrent allocations; the original image remains available in the current session.
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

IndexedDB schema version 2 added `versions` (indexed by project ID) and `trash`; version 3 adds a project/creation-time index for checkpoint retention without loading all historical documents during autosave. Version snapshots reference the shared asset store rather than duplicating image blobs. These browser-local records are separate from the document's version-1 portable format; `.slideop` files contain the current document and referenced assets, not its local version history or Trash. Close other old SlideOP tabs if an IndexedDB upgrade is waiting for them to release the database.

`model/crop.ts`, `model/styles.ts`, and `model/scope.ts` hold geometry, style propagation, and group-local coordinate operations. Group isolation creates a temporary editing view with translated child coordinates; saves always use the original nested document. Group bounds remain fixed while editing.

`model/layouts.ts` and `model/themes.ts` define the layout catalog, bounded outline parser, content slots, and theme roles. `services/layouts.ts` measures text with the actual bundled fonts before committing pages, shrinking text to fit its allocated space and rejecting content that still cannot fit. The document format adds optional layout metadata and element roles while remaining compatible with existing version-1 files.

Edits use Immer structural sharing, so history retains unchanged pages and elements by reference. The live renderer reuses unchanged Fabric objects, thumbnails render only near the viewport with two concurrent jobs, and autosave skips already stored immutable image blobs. See [SCALABILITY.md](SCALABILITY.md) for measured checks and remaining limits.

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
- **Cropping** uses a separate source preview dialog. Element previews show their unrotated content, and their rectangular crop masks follow rotation and flips on the main canvas. Selection frames retain the original element dimensions. Original image data is retained; unreferenced uploads are not included in portable exports.
- **Text formatting is per text box.** Mixed styles within a string, custom font uploads, text on paths, and true fixed-height text frames are not implemented. Text boxes grow to fit content, so Slide Checker overflow warnings are conservative.
- Bundled font files cover Latin text. Families without a native italic or bold face use browser synthesis for that style. System-font availability depends on the device.
- **Checker findings are heuristics.** Contrast is against the page background, not a full composited pixel sample. Decorative shape overlaps are not flagged. Group interiors and complex rotated text need manual review.
- **Groups use fixed bounds.** Isolation shows group-local contents without the surrounding page or inherited group effects. There is no automatic group-bound resizing, boolean shape geometry, freehand pen, or polygon-node editor.
- **Styles are project-scoped.** There is no shared cross-project style library yet. Copy/paste formatting works within the open session; exporting a project carries its named styles and palette.
- **Persistence is browser-local.** Clearing browser storage removes projects, saved versions, and Trash. Export `.slideop` backups. There is no collaboration, cloud sync, or server. Trash has no automatic expiry or permanent-delete UI yet.
- **Storage reclamation:** deleting a project moves it to Trash and retains its images. Use Uploads > Manage stored uploads to permanently remove selected images, including unused stored copies. This removes matching image placements across local projects and recovery data after confirmation; there is no automatic asset cleanup. Deletion markers prevent queued saves and older tabs from restoring deleted image records.
- **Background removal has an upstream advisory:** the installed library bundles Zod 3 and npm reports a high-severity oversized-collection validation advisory through that dependency. SlideOP's imported projects use patched Zod 4 and explicit size/depth limits; the background library receives only fixed, application-owned configuration. No incompatible forced override is applied. Replace or update the library when an upstream compatible fix is available.
- **Website mockups are visual designs only.** No live HTML/CSS website export, marketplace, accounts, publishing, or community template browser is implemented in v1.

## Verification scope

Unit tests cover versioned serialization, malformed imports, nested IDs, history immutability, redo branching, page operations, locked deletion, asset references, and bounded history. Browser checks cover real dragging, locking, text editing, group geometry, local reload, crop persistence, SVG asset embedding, image rejection, preview-related UI, project round trips, and raster/PDF downloads. The optional inference test exercises the real model, not a mock.

Additional tests cover crop bounds/aspect ratios, non-distorting crop transforms, named-style round trips and propagation, nested group edits and undo, visual crop dragging/cancellation/reload, cross-page style updates, draggable guides, upgrading a version-one database, restoring an image-bearing saved version after reload, and recovering deleted projects.

Builder tests validate all layout/theme combinations, outline limits, content-preserving remix, all 14 generic layouts in Chrome, page looks, font loading, grid arrangement/repeat, and a 25-page / 5,000-object import/edit/save/undo workflow.

Control regression tests cover right-click target actions, keyboard button activation, layer-selection shortcuts, hex and numeric field confirmation, visible line colors, uninterrupted text autosave, and panning with correct canvas hit testing.

Element crop tests validate owned-format masks, undo and duplication, shape and rotated-group export pixels, SVG clipping, reload, reset, and right-click crop cancellation. Existing image-crop tests cover the shared dialog's ratio, dragging, cancellation, undo, and reload behavior.

Upload deletion tests cover nested and empty groups, immutable document updates, confirmation cancellation, stored image removal, saved projects/versions/Trash, undo/redo and clipboard cleanup, other open tabs (including an open crop dialog), unused stored images, and reload persistence.

Browser tests run against Chrome. Firefox, Safari, touch devices, very large documents, screen-reader canvas manipulation, and print-production color fidelity still need broader validation.
