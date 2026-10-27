import type { Page } from '../model/document';

export function LayoutPreview({ page }: { page: Page }) {
  return (
    <div
      className="layout-miniature"
      style={{ aspectRatio: `${page.width} / ${page.height}`, background: page.background }}
      aria-hidden="true"
    >
      {page.elements.map((e) => (
        <div
          key={e.id}
          style={{
            position: 'absolute',
            left: `${(e.x / page.width) * 100}%`,
            top: `${(e.y / page.height) * 100}%`,
            width: `${(e.width / page.width) * 100}%`,
            height: `${(e.height / page.height) * 100}%`,
            background: e.kind === 'text' ? undefined : e.fill,
            color: e.fill,
            borderRadius: e.kind === 'ellipse' ? '50%' : `${(e.radius / page.width) * 20}cqw`,
            fontFamily: e.fontFamily,
            fontSize: `${((e.fontSize ?? 24) / page.width) * 100}cqw`,
            fontWeight: e.fontWeight,
            lineHeight: e.lineHeight,
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
          }}
        >
          {e.kind === 'text' ? e.text : ''}
        </div>
      ))}
    </div>
  );
}
