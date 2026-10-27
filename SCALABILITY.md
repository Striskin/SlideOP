# Scalability check

Checked on the local development machine in Chrome and Node.js. These are bounded local checks, not a promise of equal performance on every device.

## Improvements implemented

- **History:** replaced full-document cloning and repeated document JSON comparisons with Immer structural sharing. Unchanged pages and objects are shared across the 80-entry undo history. Canvas commits reconcile unchanged elements by ID.
- **Canvas:** reuse existing Fabric objects when their source elements are unchanged. Replaced objects and cancelled asynchronous renders are disposed.
- **Thumbnails:** use viewport observation and a queue with at most two concurrent canvas renders. Off-screen page thumbnails defer work until they approach view.
- **Persistence:** immutable image blobs are written once per asset ID. Checkpoint retention uses a compound index and keys, avoiding reads of all stored version documents on every autosave. The database migration retains existing projects, versions, Trash, and assets.
- **Slide Checker:** inspect object geometry on a 1 × 1 canvas rather than allocating a page-sized bitmap. Use an ID map and stop generating pair warnings after the displayed finding limit.
- **Builder:** parse bounded outlines, build at most 20 pages per action, fit text before committing, and apply generated pages as one undo entry. Invalid or oversized content produces a recoverable error.

## Measured checks

| Check                                                                       | Result                                                                  |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Node state test: 25 pages, 200 objects each, 40 edits                       | Approximately 35 ms total on this machine                               |
| Retained object references across those 40 snapshots                        | 5,039 unique references; unchanged objects are shared                   |
| Chrome: import, render, edit, save, and undo the same 5,000-object document | Approximately 5.8 seconds for the entire automated interaction sequence |
| Existing page and object contents after edits/undo                          | Preserved; verified by tests                                            |

The browser time includes automation, UI waits, IndexedDB work, and layer selection. It is not a frame-rate measurement. The state timing includes the first edit's freezing work and does not measure Fabric rendering.

Reproduce with the local dev server running:

```sh
npm test -- src/store/scalability.test.ts --reporter=verbose
npm run test:e2e -- e2e/builder.spec.ts
```

## Current limits and next bottlenecks

- The page limit is 100, with 2,000 top-level objects per page. Imports also have total complexity and nesting limits. These are safety bounds, not a performance guarantee at every maximum simultaneously.
- The current page's layer list still mounts all its rows; virtualization would help when working near the 2,000-object limit.
- The owned document is stored as one IndexedDB record. Saving and opening still serialize the current document. Saved-version and project pickers read complete records; metadata-only indexes would help workspaces containing many large projects.
- Raster exports and high-resolution images can dominate memory. PDF is rasterized. Background removal runs serially and remains a large, lazy-loaded computation.
- The checker still has pairwise overlap/alignment logic. Its findings are capped; a spatial index is the next step for dense pages.
- Automatic layout is a bounded content-to-canvas generator, not a responsive HTML layout engine. Long content may require a roomier layout or additional pages. Remixes preserve custom additions at their existing coordinates, so review those additions after changing page dimensions.
- All data remains browser-local. Trash and version history do not protect against browser storage being cleared. Export portable `.slideop` backups.

Before expanding beyond this local editor, profile target devices and large-image workloads. The existing document, asset, and persistence boundaries can support page-level storage and synchronization later.
