'use client';
import { TeamIdentity } from '@/components/team-identity';
import { useEffect, useState } from 'react';
import { Button, Modal, Notice, Progress } from '@/components/ui';
import type { Match } from '@/domain/types';
import {
  computeProgress,
  getMissingFields,
  getUnfilledOptionalFields,
} from '@/domain/debrief/formModel';
import { buildDebriefText } from '@/domain/debrief/debriefText';
import { useMatchDebrief } from './use-match-debrief';
import IdentitySection from './components/IdentitySection';
import DebriefSections from './components/DebriefSections';
import ExportCard from './components/ExportCard';
import { loadLogoDataUrls } from './assets/logos';
import { copyToClipboard } from './services/clipboard';
import { BackButton } from '@/components/back-button';

export default function Debrief({ match, onBack }: { match: Match; onBack: () => void }) {
  const editor = useMatchDebrief(match);
  const { form } = editor;
  const [dialog, setDialog] = useState<'pdf' | 'clear' | null>(null);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const missing: string[] = getMissingFields(form);
  const optional: string[] = getUnfilledOptionalFields(form);
  useEffect(() => {
    // Prepare the PDF engine while this screen is open so the first export also works offline.
    void Promise.all([
      import('jspdf'),
      import('./services/pdf/debriefPdf'),
      loadLogoDataUrls(),
    ]).catch(() => {});
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
      <BackButton
        onClick={async () => {
          if (await editor.flush()) onBack();
          else setFailure('Enregistrez à nouveau le débrief avant de quitter.');
        }}
      />
      <header className="debrief-heading">
        <div>
          <h1>Débrief d’après-match</h1>
          <p>
            <TeamIdentity name={match.homeTeam} logoId={match.homeLogoId} /> /{' '}
            <TeamIdentity name={match.awayTeam} logoId={match.awayLogoId} />
          </p>
        </div>
      </header>
      <span className="sr-only debrief-save" role="status">
        {editor.saveState}
      </span>
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
