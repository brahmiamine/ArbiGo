'use client';
import { useEffect, useState } from 'react';
import { Button, Modal, Notice, Progress } from '@/components/ui';
import { useApp } from '../app-provider';
import type { Match } from '@/domain/types';
import {
  computeProgress,
  getMissingFields,
  getUnfilledOptionalFields,
} from '@/domain/debrief/formModel';
import { buildDebriefText } from '@/domain/debrief/debriefText';
import { useMatchDebrief } from './use-match-debrief';
import { useDesignationOcr } from './hooks/useDesignationOcr';
import IdentitySection from './components/IdentitySection';
import DebriefSections from './components/DebriefSections';
import ExportCard from './components/ExportCard';
import OcrDock from './components/OcrDock';
import { copyToClipboard } from './services/clipboard';

export default function Debrief({ match, onBack }: { match: Match; onBack: () => void }) {
  const app = useApp();
  const editor = useMatchDebrief(match);
  const { form } = editor;
  const ocr = useDesignationOcr({ onApply: editor.updateMany });
  const [dialog, setDialog] = useState<'pdf' | 'clear' | null>(null);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const missing: string[] = getMissingFields(form);
  const optional: string[] = getUnfilledOptionalFields(form);
  useEffect(() => {
    // Prepare the PDF engine while this screen is open so the first export also works offline.
    void Promise.all([import('jspdf'), import('./services/pdf/debriefPdf')]).catch(() => {});
  }, []);
  async function exportPdf() {
    if (exporting) return;
    setExporting(true);
    setFailure('');
    try {
      const { exportDebriefPdf } = await import('./services/pdf/debriefPdf');
      await exportDebriefPdf(form);
      setDialog(null);
      setMessage('PDF téléchargé');
    } catch {
      setFailure('Le PDF n’a pas pu être créé. Réessayez.');
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="debrief-app">
      <button
        className="text-button"
        onClick={async () => {
          if (await editor.flush()) onBack();
          else setFailure('Enregistrez à nouveau le débrief avant de quitter.');
        }}
      >
        ← Bilan de la rencontre
      </button>
      <header className="debrief-heading">
        <div>
          <span className="eyebrow">APRÈS-MATCH</span>
          <h1>Débrief d’après-match</h1>
          <p>
            {match.homeTeam} / {match.awayTeam}
          </p>
        </div>
        <div className="debrief-logos" aria-label="FFF et District de Paris">
          {/* Official local assets are also used by the PDF exporter. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/debrief/logos/fff-logo.png" alt="Logo FFF" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/debrief/logos/district75-logo.png" alt="Logo District 75" />
        </div>
      </header>
      <div className="debrief-save" role="status">
        <span>{editor.saveState}</span>
        <span>
          {app.pending
            ? 'Synchronisation en attente'
            : app.demo
              ? 'Démonstration locale'
              : 'Synchronisé avec votre compte'}
        </span>
      </div>
      {editor.saveState === 'Enregistrement impossible' && (
        <Button variant="secondary" onClick={editor.retry}>
          Réessayer l’enregistrement
        </Button>
      )}
      <div className="debrief-progress">
        <span>Progression du débrief · {computeProgress(form)} %</span>
        <Progress value={computeProgress(form)} label="Progression du débrief" />
      </div>
      {failure && <Notice>{failure}</Notice>}
      <p className="sr-only" role="status">
        {message}
      </p>
      <div className="container">
        <IdentitySection form={form} onChange={editor.update} />
        <DebriefSections form={form} onChange={editor.update} />
        <ExportCard
          exporting={exporting}
          onRequestPdf={() => setDialog('pdf')}
          onCopyText={async () => {
            try {
              await copyToClipboard(buildDebriefText(form));
              setMessage('Copié dans le presse-papiers');
            } catch {
              setFailure('La copie automatique est indisponible dans ce navigateur.');
            }
          }}
          onRequestClear={() => setDialog('clear')}
        />
      </div>
      <OcrDock
        open={ocr.open}
        onClose={ocr.close}
        previewUrl={ocr.previewUrl}
        busy={ocr.busy}
        progress={ocr.progress}
        status={ocr.status}
        fields={ocr.fields}
        detectedCount={ocr.detectedCount}
        rawText={ocr.rawText}
        onSelectFile={ocr.selectFile}
        onRetry={ocr.retry}
        onClear={ocr.clear}
      />
      {dialog === 'pdf' && (
        <Modal
          title={missing.length ? 'Des champs restent à remplir' : 'Tout est prêt pour l’export'}
          onClose={() => setDialog(null)}
        >
          <div className="form">
            {failure && <Notice>{failure}</Notice>}
            <p>
              {missing.length
                ? 'Complétez le débrief ou exportez-le dans son état actuel.'
                : 'Le PDF reprend toutes les sections et les logos FFF / District 75.'}
            </p>
            {!!missing.length && (
              <ul>
                {missing.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            )}
            {!!optional.length && (
              <p className="muted">Facultatif, laissé vide : {optional.join(', ')}</p>
            )}
            <Button disabled={exporting} onClick={() => void exportPdf()}>
              {exporting
                ? 'Génération…'
                : missing.length
                  ? 'Exporter quand même'
                  : 'Exporter en PDF'}
            </Button>
            <Button variant="secondary" disabled={exporting} onClick={() => setDialog(null)}>
              Annuler
            </Button>
          </div>
        </Modal>
      )}
      {dialog === 'clear' && (
        <Modal title="Vider tous les champs ?" onClose={() => setDialog(null)}>
          <div className="form">
            <p>
              Seul le débrief de cette rencontre sera vidé. Les informations et le journal du match
              sont conservés.
            </p>
            <Button
              variant="danger"
              onClick={() => {
                ocr.clear();
                editor.reset();
                setDialog(null);
              }}
            >
              Oui, tout vider
            </Button>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Annuler
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
