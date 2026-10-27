import { useState } from 'react';
import { Search, Plus, Shapes } from 'lucide-react';
import { shapePresets, regularPolygon } from '../model/shapes';
import { useEditor } from '../store/editor';
import { NumberField } from './ui';

export function ElementsLibrary() {
  const [search, setSearch] = useState(''),
    [sides, setSides] = useState(6);
  const visible = shapePresets.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <label className="search-field">
        <Search size={16} />
        <input
          aria-label="Find a shape"
          placeholder="Find a shape"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {(['Basics', 'Geometric', 'Expressive'] as const).map((category) => {
        const shapes = visible.filter((s) => s.category === category);
        return (
          shapes.length > 0 && (
            <section key={category}>
              <div className="section-heading">
                <h3>{category}</h3>
                <span>{shapes.length}</span>
              </div>
              <div className="shape-grid">
                {shapes.map((shape) => (
                  <button
                    key={shape.name}
                    aria-label={`Add ${shape.name.toLowerCase()}`}
                    title={`Add ${shape.name.toLowerCase()}`}
                    onClick={() =>
                      useEditor
                        .getState()
                        .add(shape.kind, { name: shape.name, ...shape.properties })
                    }
                  >
                    <svg viewBox="0 0 64 64" aria-hidden="true">
                      <path d={shape.preview} />
                    </svg>
                    <span>{shape.name}</span>
                  </button>
                ))}
              </div>
            </section>
          )
        );
      })}
      {!visible.length && (
        <div className="empty-state">
          <Shapes size={28} />
          <h3>No shapes found</h3>
          <p>Try “star”, “arrow”, or “heart”.</p>
        </div>
      )}
      <section className="custom-polygon">
        <div className="section-heading">
          <h3>Make your own polygon</h3>
          <Shapes size={16} />
        </div>
        <NumberField
          label="Sides"
          value={sides}
          min={3}
          max={24}
          onChange={(value) => setSides(Math.round(value))}
        />
        <button
          className="secondary full"
          onClick={() =>
            useEditor
              .getState()
              .add('polygon', {
                name: `${sides}-sided polygon`,
                width: 200,
                height: 200,
                points: regularPolygon(sides),
              })
          }
        >
          <Plus size={15} />
          Add {sides}-sided polygon
        </button>
      </section>
      <div className="tip">
        Hold <kbd>Shift</kbd> to select multiple objects. Every shape supports custom colors,
        gradients, strokes, and shadows.
      </div>
    </>
  );
}
