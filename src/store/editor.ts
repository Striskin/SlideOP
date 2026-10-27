import { create } from 'zustand';
import { produce } from 'immer';
import {
  cloneElements,
  makeElement,
  makePage,
  newDocument,
  starterDocument,
  uid,
} from '../model/document';
import type { DesignDocument, Element, Page } from '../model/document';
import { editScope, scopedPage, scopeGroup } from '../model/scope';

type Snapshot = { document: DesignDocument; pageId: string };
export type Tab = 'Design' | 'Build' | 'Elements' | 'Text' | 'Uploads' | 'Templates' | 'Layers';
type EditorState = {
  document: DesignDocument;
  pageId: string;
  selection: string[];
  cropId: string | null;
  scopePath: string[];
  gridSnap: boolean;
  enterGroup: (id: string) => void;
  exitGroup: () => void;
  past: Snapshot[];
  future: Snapshot[];
  tab: Tab;
  zoom: number;
  tool: 'select' | 'hand';
  grid: boolean;
  snapping: boolean;
  showGuides: boolean;
  theme: 'light' | 'dark';
  leftOpen: boolean;
  rightOpen: boolean;
  saved: 'saved' | 'saving' | 'error';
  textRevision: number;
  toast: string;
  ready: boolean;
  clipboard: Element[];
  commit: (change: (doc: DesignDocument) => void, pageId?: string) => void;
  set: (patch: Partial<EditorState>) => void;
  load: (document: DesignDocument) => void;
  newProject: () => void;
  select: (ids: string[]) => void;
  undo: () => void;
  redo: () => void;
  add: (kind: Element['kind'], props?: Partial<Element>) => void;
  update: (ids: string[], props: Partial<Element>) => void;
  replaceElements: (elements: Element[]) => void;
  remove: () => void;
  duplicate: () => void;
  copy: () => void;
  paste: () => void;
  addPage: () => void;
  duplicatePage: (id: string) => void;
  deletePage: (id: string) => void;
  movePage: (id: string, delta: number) => void;
  updatePage: (props: Partial<Page>) => void;
  reorder: (id: string, delta: number) => void;
};
const initial = starterDocument();
export const useEditor = create<EditorState>((set, get) => ({
  document: initial,
  pageId: initial.pages[0].id,
  selection: [],
  cropId: null,
  scopePath: [],
  gridSnap: false,
  past: [],
  future: [],
  tab: 'Design',
  zoom: 0.6,
  tool: 'select',
  grid: false,
  snapping: true,
  showGuides: true,
  theme: 'light',
  leftOpen: true,
  rightOpen: true,
  saved: 'saved',
  textRevision: 0,
  toast: '',
  ready: false,
  clipboard: [],
  set: (patch) =>
    set({
      ...patch,
      ...(patch.pageId ? { cropId: null } : {}),
      ...(patch.pageId && patch.pageId !== get().pageId ? { scopePath: [] } : {}),
    }),
  enterGroup: (id) => {
    const s = get(),
      group = currentPage().elements.find((e) => e.id === id);
    if (group?.kind === 'group' && !group.locked && s.scopePath.length < 5)
      set({ scopePath: [...s.scopePath, id], selection: [] });
  },
  exitGroup: () => set({ scopePath: get().scopePath.slice(0, -1), selection: [] }),
  commit: (change, pageId) => {
    const state = get();
    const changed = produce(state.document, (draft) => {
      change(draft);
    });
    if (changed === state.document) return;
    const next = produce(changed, (draft) => {
      draft.updatedAt = new Date().toISOString();
    });
    set({
      document: next,
      pageId: pageId ?? state.pageId,
      scopePath:
        pageId && pageId !== state.pageId
          ? []
          : scopeGroup(
                next.pages.find((p) => p.id === state.pageId) ?? next.pages[0],
                state.scopePath,
              )
            ? state.scopePath
            : [],
      past: [...state.past.slice(-79), { document: state.document, pageId: state.pageId }],
      future: [],
      saved: 'saving',
    });
  },
  load: (document) =>
    set({
      document,
      pageId: document.pages[0].id,
      selection: [],
      cropId: null,
      scopePath: [],
      past: [],
      future: [],
      clipboard: [],
      saved: 'saved',
      textRevision: 0,
      ready: true,
    }),
  newProject: () => {
    get().load(newDocument());
    set({ saved: 'saving' });
  },
  select: (selection) => set({ selection }),
  undo: () => {
    const s = get();
    const prev = s.past.at(-1);
    if (prev)
      set({
        ...prev,
        past: s.past.slice(0, -1),
        future: [{ document: s.document, pageId: s.pageId }, ...s.future],
        selection: [],
        cropId: null,
        scopePath: [],
        saved: 'saving',
      });
  },
  redo: () => {
    const s = get();
    const next = s.future[0];
    if (next)
      set({
        ...next,
        past: [...s.past, { document: s.document, pageId: s.pageId }],
        future: s.future.slice(1),
        selection: [],
        cropId: null,
        scopePath: [],
        saved: 'saving',
      });
  },
  add: (kind, props) => {
    const s = get();
    const p = currentPage();
    if (p.elements.length >= 2000) {
      set({ toast: 'A page can contain up to 2,000 objects.' });
      return;
    }
    const e = makeElement(kind, { x: p.width / 2 - 100, y: p.height / 2 - 80, ...props });
    s.commit((d) => {
      editScope(d, s.pageId, s.scopePath, (p) => {
        p.elements.push(e);
      });
    });
    set({ selection: [e.id], tool: 'select' });
  },
  update: (ids, props) => {
    const s = get();
    s.commit((d) => {
      editScope(d, s.pageId, s.scopePath, (p) => {
        const wanted = new Set(ids);
        for (const e of p.elements)
          if (wanted.has(e.id)) Object.assign(e, props, { id: e.id, kind: e.kind });
      });
    });
  },
  replaceElements: (elements) => {
    const s = get();
    const previous = currentPage().elements;
    const byId = new Map(previous.map((e) => [e.id, e]));
    const reconciled = elements.map((e) => {
      const old = byId.get(e.id);
      return old && JSON.stringify(old) === JSON.stringify(e) ? old : e;
    });
    if (reconciled.length === previous.length && reconciled.every((e, i) => e === previous[i]))
      return;
    s.commit((d) => {
      editScope(d, s.pageId, s.scopePath, (p) => {
        p.elements = reconciled;
      });
    });
  },
  remove: () => {
    const s = get();
    if (
      s.scopePath.length &&
      currentPage().elements.every((e) => s.selection.includes(e.id) && !e.locked)
    ) {
      set({ toast: 'Keep at least one object in a group, or exit the group to delete it.' });
      return;
    }
    s.commit((d) => {
      editScope(d, s.pageId, s.scopePath, (p) => {
        p.elements = p.elements.filter((e) => !s.selection.includes(e.id) || e.locked);
      });
    });
    set({ selection: [] });
  },
  copy: () => {
    const s = get();
    set({
      clipboard: structuredClone(currentPage().elements.filter((e) => s.selection.includes(e.id))),
      toast: 'Copied to editor clipboard',
    });
  },
  paste: () => {
    const s = get();
    if (!s.clipboard.length) return;
    if (currentPage().elements.length + s.clipboard.length > 2000) {
      set({ toast: 'A page can contain up to 2,000 objects.' });
      return;
    }
    const elements = cloneElements(s.clipboard);
    s.commit((d) => {
      editScope(d, s.pageId, s.scopePath, (p) => {
        p.elements.push(...elements);
      });
    });
    set({ selection: elements.map((e) => e.id) });
  },
  duplicate: () => {
    const s = get();
    const elements = cloneElements(
      currentPage().elements.filter((e) => s.selection.includes(e.id)),
    );
    if (currentPage().elements.length + elements.length > 2000) {
      set({ toast: 'A page can contain up to 2,000 objects.' });
      return;
    }
    s.commit((d) => {
      editScope(d, s.pageId, s.scopePath, (p) => {
        p.elements.push(...elements);
      });
    });
    set({ selection: elements.map((e) => e.id) });
  },
  addPage: () => {
    const s = get();
    if (s.document.pages.length >= 100) {
      set({ toast: 'A project can contain up to 100 pages.' });
      return;
    }
    const current = s.document.pages.find((p) => p.id === s.pageId)!;
    const p = makePage(current.width, current.height);
    p.name = `Page ${s.document.pages.length + 1}`;
    s.commit((d) => {
      d.pages.push(p);
    }, p.id);
    set({ selection: [] });
  },
  duplicatePage: (id) => {
    const s = get();
    if (s.document.pages.length >= 100) {
      set({ toast: 'A project can contain up to 100 pages.' });
      return;
    }
    const p = structuredClone(s.document.pages.find((p) => p.id === id)!);
    p.id = uid();
    p.name += ' copy';
    p.elements = cloneElements(p.elements, 0, true);
    s.commit((d) => {
      d.pages.splice(d.pages.findIndex((p) => p.id === id) + 1, 0, p);
    }, p.id);
    set({ selection: [] });
  },
  deletePage: (id) => {
    const s = get();
    if (s.document.pages.length === 1) return;
    const remaining = s.document.pages.filter((p) => p.id !== id);
    s.commit(
      (d) => {
        d.pages = remaining;
      },
      s.pageId === id ? remaining[0].id : s.pageId,
    );
    set({ selection: [] });
  },
  movePage: (id, delta) => {
    get().commit((d) => {
      const i = d.pages.findIndex((p) => p.id === id),
        j = i + delta;
      if (i >= 0 && j >= 0 && j < d.pages.length) {
        const [page] = d.pages.splice(i, 1);
        d.pages.splice(j, 0, page);
      }
    });
  },
  updatePage: (props) => {
    const s = get();
    if (s.scopePath.length) {
      set({ toast: 'Return to the page to change page settings.' });
      return;
    }
    s.commit((d) => {
      const p = d.pages.find((p) => p.id === s.pageId)!;
      Object.assign(p, props, { id: p.id });
    });
  },
  reorder: (id, delta) => {
    const s = get();
    s.commit((d) => {
      editScope(d, s.pageId, s.scopePath, (p) => {
        const i = p.elements.findIndex((e) => e.id === id),
          j = Math.max(0, Math.min(p.elements.length - 1, i + delta));
        if (i < 0) return;
        const [e] = p.elements.splice(i, 1);
        if (e) p.elements.splice(j, 0, e);
      });
    });
  },
}));
export const currentPage = () => {
  const s = useEditor.getState();
  return scopedPage(
    s.document.pages.find((p) => p.id === s.pageId)!,
    s.scopePath,
  );
};
