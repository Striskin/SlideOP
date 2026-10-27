import { useState } from 'react';
import { Plus, Search, ArrowUpRight, Type } from 'lucide-react';
import { fontGroups } from '../model/fonts';
import { useEditor } from '../store/editor';

export function TextLibrary() {
  const [query, setQuery] = useState('');
  const bundled = fontGroups
    .filter((g) => g.name !== 'System fonts')
    .flatMap((g) => g.fonts.map((name) => ({ name, category: g.name })))
    .filter((font) => `${font.name} ${font.category}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <button className="primary full" onClick={() => useEditor.getState().add('text')}>
        <Plus size={17} />
        Add a text box
      </button>
      <div className="section-heading">
        <h3>Start with the essentials</h3>
      </div>
      <div className="text-presets">
        <button
          className="text-heading"
          onClick={() =>
            useEditor
              .getState()
              .add('text', { text: 'Add a heading', fontSize: 72, fontWeight: 'bold', width: 700 })
          }
        >
          Add a heading
        </button>
        <button
          className="text-subheading"
          onClick={() =>
            useEditor.getState().add('text', { text: 'Add a subheading', fontSize: 36, width: 600 })
          }
        >
          Add a subheading
        </button>
        <button
          onClick={() =>
            useEditor
              .getState()
              .add('text', { text: 'A little bit of body text', fontSize: 22, width: 500 })
          }
        >
          A little bit of body text
        </button>
      </div>
      <div className="section-heading">
        <h3>Font collection</h3>
        <span>
          {fontGroups
            .filter((g) => g.name !== 'System fonts')
            .reduce((sum, g) => sum + g.fonts.length, 0)}{' '}
          LOCAL FAMILIES
        </span>
      </div>
      <label className="search-field">
        <Search size={16} />
        <input
          aria-label="Find a font"
          placeholder="Search fonts or styles"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="font-library">
        {bundled.map((font) => (
          <button
            key={font.name}
            aria-label={`Add ${font.name} text`}
            onClick={() =>
              useEditor.getState().add('text', {
                name: `${font.name} text`,
                text: 'Make something wonderful.',
                fontFamily: font.name,
                fontSize: 56,
                width: 800,
              })
            }
          >
            <span className="font-meta">
              <span>{font.name}</span>
              <small>{font.category}</small>
            </span>
            <strong style={{ fontFamily: font.name }}>Make it yours.</strong>
            <Plus size={14} />
          </button>
        ))}
      </div>
      {!bundled.length && (
        <div className="empty-state">
          <Type size={24} />
          <p>No matching fonts.</p>
        </div>
      )}
      <p className="small muted">
        Bundled with your studio. No external font service, no subscription. Six system fonts are
        also available in the inspector.
      </p>
      <div className="section-heading">
        <h3>Find your voice</h3>
      </div>
      <button
        className="type-card editorial"
        onClick={() =>
          useEditor.getState().add('text', {
            text: 'Less, but\nbetter.',
            fontFamily: 'Playfair Display',
            fontSize: 80,
            width: 600,
          })
        }
      >
        <span>THE EDITORIAL</span>
        <strong style={{ fontFamily: 'Playfair Display' }}>
          Less, but
          <br />
          <em>better.</em>
        </strong>
        <ArrowUpRight size={20} />
      </button>
      <button
        className="type-card bold-type"
        onClick={() =>
          useEditor.getState().add('text', {
            text: 'MAKE\nYOUR MARK.',
            fontFamily: 'Bebas Neue',
            fontSize: 92,
            width: 650,
          })
        }
      >
        <span>THE STATEMENT</span>
        <strong style={{ fontFamily: 'Bebas Neue' }}>
          MAKE
          <br />
          YOUR MARK.
        </strong>
        <ArrowUpRight size={20} />
      </button>
    </>
  );
}
