import type {LegalBlock, LegalDocument} from '../../legal/types';
import {getLegalContactEmail} from '../../lib/legalContact';

function interpolate(text: string): string {
  return text.replaceAll('{{CONTACT_EMAIL}}', getLegalContactEmail());
}

function LegalBlockView({block}: {block: LegalBlock}) {
  if (block.type === 'p') {
    return <p className="text-sm leading-relaxed text-slate-300">{interpolate(block.text)}</p>;
  }
  const Tag = block.type === 'ol' ? 'ol' : 'ul';
  const listClass =
    block.type === 'ol'
      ? 'list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-300'
      : 'list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-300';
  return (
    <Tag className={listClass}>
      {block.items.map((item) => (
        <li key={item.slice(0, 48)}>{interpolate(item)}</li>
      ))}
    </Tag>
  );
}

type Props = {
  document: LegalDocument;
};

export function LegalDocumentView({document}: Props) {
  return (
    <article className="space-y-8">
      {document.intro ? (
        <p className="text-sm leading-relaxed text-slate-300">{interpolate(document.intro)}</p>
      ) : null}
      {document.sections.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-6 space-y-3">
          <h2 className="text-base font-semibold text-white">{section.title}</h2>
          <div className="space-y-3">
            {section.blocks.map((block, index) => (
              <LegalBlockView key={`${section.id}-${index}`} block={block} />
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}
