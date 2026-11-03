import type { ProductAccordion } from "@/data/catalogue";
import { parseProductAccordionRows } from "@/lib/product-accordions";

export function ProductDetailAccordions({ sections }: { sections: ProductAccordion[] }) {
  const visibleSections = sections.filter(section => section.active && section.title.trim() && section.content.trim());
  if (!visibleSections.length) return null;
  return <section className="product-detail-accordions" aria-label="Product information">
    <h2>Product information</h2>
    <div className="product-detail-accordion-list">
      {visibleSections.map(section => <details className="product-detail-accordion" key={section.id} open={section.defaultOpen}>
        <summary><span>{section.title}</span><span className="product-detail-accordion-icon" aria-hidden="true" /></summary>
        {(() => {
          const rows = section.format === "text" ? null : parseProductAccordionRows(section.content);
          return rows ? <dl className="product-detail-spec-list">{rows.map((row, index) => <div className="product-detail-spec-row" key={`${section.id}-${index}`}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl> : <p className="product-detail-accordion-content">{section.content}</p>;
        })()}
      </details>)}
    </div>
  </section>;
}
