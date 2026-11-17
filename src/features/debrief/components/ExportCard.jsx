import { memo } from 'react';

function ExportCard({ onRequestPdf, onCopyText, onRequestClear, exporting }) {
  return (
    <section className="export-card">
      <div>
        <span className="export-kicker">Débrief prêt ?</span>
        <h2>Exporter et envoyer</h2>
        <p>
          Le PDF reprend les deux logos et l’identité visuelle FFF / District 75. « Copier le texte
          » en donne une version simple à coller dans un message.
        </p>
      </div>
      <div className="export-actions">
        <button
          className="btn btn--primary"
          type="button"
          onClick={onRequestPdf}
          disabled={exporting}
        >
          {exporting ? 'Génération…' : 'Exporter en PDF'}
        </button>
        <button className="btn btn--ghost" type="button" onClick={onCopyText}>
          Copier le texte
        </button>
        <button className="btn btn--danger" type="button" onClick={onRequestClear}>
          Vider les champs
        </button>
      </div>
    </section>
  );
}

export default memo(ExportCard);
