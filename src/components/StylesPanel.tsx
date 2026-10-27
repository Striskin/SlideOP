import { useState } from 'react';
import { create } from 'zustand';
import { BookmarkPlus, Copy, Paintbrush, Unlink, Trash2 } from 'lucide-react';
import { useEditor, currentPage } from '../store/editor';
import { uid } from '../model/document';
import type { Element, SavedStyle } from '../model/document';
import { applyStyle, extractStyle, styleKind, updateLinkedStyle } from '../model/styles';
import { useEditingPage } from '../hooks/useEditingPage';
import { editScope } from '../model/scope';
import { IconButton, ColorField } from './ui';

const useStyleClipboard = create<{ value: SavedStyle | null }>(() => ({ value: null }));
function applyToSelection(style: SavedStyle) {
  const s = useEditor.getState();
  s.replaceElements(
    currentPage().elements.map((e) => (s.selection.includes(e.id) ? applyStyle(e, style) : e)),
  );
}

export function StyleControls({ element }: { element: Element }) {
  const styles = useEditor((s) => s.document.styles);
  const clipboard = useStyleClipboard((s) => s.value);
  const [name, setName] = useState('');
  const kind = styleKind(element),
    linked = styles?.find((s) => s.id === element.styleId);
  if (!kind) return null;
  return (
    <section className="style-controls">
      <div className="section-heading">
        <h3>Style</h3>
        <span className="tag">REUSABLE</span>
      </div>
      <div className="two-buttons">
        <button
          className="secondary"
          onClick={() =>
            useStyleClipboard.setState({
              value: { id: '', name: 'Copied style', kind, properties: extractStyle(element) },
            })
          }
        >
          <Copy size={14} />
          Copy style
        </button>
        <button
          className="secondary"
          disabled={element.locked || clipboard?.kind !== kind}
          onClick={() => {
            if (clipboard) {
              const s = useEditor.getState();
              s.update([element.id], { ...applyStyle(element, clipboard), styleId: undefined });
            }
          }}
        >
          <Paintbrush size={14} />
          Paste style
        </button>
      </div>
      <label className="stack-label">
        Style name
        <input
          value={name}
          maxLength={100}
          placeholder={kind === 'text' ? 'e.g. Section heading' : 'e.g. Accent card'}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <button
        className="secondary full"
        disabled={element.locked || !name.trim() || (styles?.length ?? 0) >= 100}
        onClick={() => {
          const style: SavedStyle = {
            id: uid(),
            name: name.trim(),
            kind,
            properties: extractStyle(element),
          };
          const state = useEditor.getState();
          state.commit((doc) => {
            doc.styles = [...(doc.styles ?? []), style];
            editScope(doc, state.pageId, state.scopePath, (p) => {
              p.elements = p.elements.map((e) =>
                state.selection.includes(e.id) ? applyStyle(e, style) : e,
              );
            });
          });
          setName('');
        }}
      >
        <BookmarkPlus size={15} />
        Save named style
      </button>
      {linked && (
        <div className="linked-style">
          <span>
            Linked to <strong>{linked.name}</strong>
          </span>
          <button
            className="text-button"
            disabled={element.locked}
            onClick={() =>
              useEditor
                .getState()
                .commit((doc) =>
                  updateLinkedStyle(doc, { ...linked, properties: extractStyle(element) }),
                )
            }
          >
            Update style across project
          </button>
          <button
            className="text-button"
            onClick={() => useEditor.getState().update([element.id], { styleId: undefined })}
          >
            <Unlink size={13} />
            Detach style
          </button>
        </div>
      )}
    </section>
  );
}

export function StylesPanel() {
  const styles = useEditor((s) => s.document.styles),
    palette = useEditor((s) => s.document.palette);
  const selection = useEditor((s) => s.selection),
    page = useEditingPage();
  const [color, setColor] = useState('#d46b2d');
  const selected = page.elements.filter((e) => selection.includes(e.id));
  return (
    <section className="saved-styles">
      <div className="section-heading">
        <h3>Project styles</h3>
        <Paintbrush size={16} />
      </div>
      <p className="small muted">
        Save a selected object's style in Properties. Apply it here, then update linked objects
        together.
      </p>
      <div className="style-list">
        {styles?.map((style) => (
          <div className="saved-style" key={style.id}>
            <button
              className="style-apply"
              disabled={!selected.some((e) => styleKind(e) === style.kind && !e.locked)}
              onClick={() => applyToSelection(style)}
              aria-label={`Apply style ${style.name}`}
            >
              <span
                className="style-swatch"
                style={{
                  color: style.properties.fill,
                  background: style.kind === 'shape' ? style.properties.fill : undefined,
                  fontFamily: style.properties.fontFamily,
                }}
              >
                {style.kind === 'text' ? 'Aa' : ''}
              </span>
              <span>
                <strong>{style.name}</strong>
                <small>{style.kind === 'text' ? 'Text style' : 'Shape style'}</small>
              </span>
            </button>
            <IconButton
              label={`Delete style ${style.name}`}
              onClick={() =>
                useEditor.getState().commit((doc) => {
                  doc.styles = doc.styles?.filter((s) => s.id !== style.id);
                  const detach = (elements: Element[]) =>
                    elements.forEach((e) => {
                      if (e.styleId === style.id) delete e.styleId;
                      if (e.children) detach(e.children);
                    });
                  doc.pages.forEach((p) => detach(p.elements));
                })
              }
            >
              <Trash2 size={14} />
            </IconButton>
          </div>
        ))}
      </div>
      {!styles?.length && (
        <div className="tip">
          Your named styles will appear here. They travel with your SlideOP project file.
        </div>
      )}
      <h3>Saved colors</h3>
      <div className="saved-colors">
        {palette?.map((value) => (
          <div key={value}>
            <button
              aria-label={`Apply saved color ${value}`}
              title={value}
              style={{ background: value }}
              onClick={() => {
                const s = useEditor.getState();
                if (selection.length)
                  s.replaceElements(
                    page.elements.map((e) =>
                      selection.includes(e.id) && !e.locked
                        ? {
                            ...e,
                            ...(e.kind === 'line'
                              ? { stroke: value }
                              : { fill: value, gradient: undefined }),
                          }
                        : e,
                    ),
                  );
                else s.updatePage({ background: value });
              }}
            />
            <button
              className="remove-color"
              aria-label={`Remove saved color ${value}`}
              onClick={() =>
                useEditor.getState().commit((doc) => {
                  doc.palette = doc.palette?.filter((c) => c !== value);
                })
              }
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <ColorField label="Palette color" value={color} onChange={setColor} />
      <button
        className="secondary full"
        disabled={(palette?.length ?? 0) >= 32 || palette?.includes(color)}
        onClick={() =>
          useEditor.getState().commit((doc) => {
            doc.palette = [...(doc.palette ?? []), color];
          })
        }
      >
        Save color to palette
      </button>
    </section>
  );
}
