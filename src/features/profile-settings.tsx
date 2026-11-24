'use client';
import { useState } from 'react';
import { useApp } from './app-provider';
import { ProfileAvatar } from './media';
import { FileDropzone } from '@/components/file-dropzone';
import { Button } from '@/components/ui';
import type { BriefingTexts, ProfilePatch } from '@/domain/profile';
import { defaultBriefings } from '@/domain/profile';
import {
  categoriesToPrice,
  indemnityRates,
  normalizeCategory,
  uncategorized,
} from '@/domain/indemnities';

export function ProfileEditor({ onDone }: { onDone: () => void }) {
  const app = useApp();
  const [initial] = useState({
    name: app.profile?.name ?? '',
    homeAddress: app.profile?.preferences.homeAddress ?? '',
    photoId: app.profile?.preferences.avatarPhotoId ?? null,
  });
  const [homeAddress, setHomeAddress] = useState(initial.homeAddress);
  const [name, setName] = useState(initial.name);
  const [photoId, setPhotoId] = useState(app.profile?.preferences.avatarPhotoId ?? null);
  const [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState(''),
    [reset, setReset] = useState(0);
  const offline = !app.demo && !app.online;
  return (
    <form
      className="form"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
          const patch: ProfilePatch = {};
          if (name.trim() !== initial.name) patch.name = name;
          if (photoId !== initial.photoId) patch.preferences = { avatarPhotoId: photoId };
          if (homeAddress.trim() !== initial.homeAddress)
            patch.preferences = { ...patch.preferences, homeAddress: homeAddress.trim() };
          if (patch.name !== undefined || patch.preferences) await app.updateProfile(patch);
          onDone();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset className="settings-fieldset" disabled={busy || uploading || offline}>
        <label>
          Nom
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={100}
            autoComplete="name"
          />
        </label>
        <label>
          Adresse de départ par défaut
          <input
            value={homeAddress}
            onChange={(event) => setHomeAddress(event.target.value)}
            maxLength={200}
            placeholder="Rue, code postal et ville"
          />
          <small>Utilisée pour calculer vos trajets vers les rencontres.</small>
        </label>
        <div className="profile-photo-editor">
          <ProfileAvatar name={name} photoId={photoId} large />
          {photoId && (
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setPhotoId(null);
                setReset((value) => value + 1);
              }}
            >
              Retirer la photo
            </Button>
          )}
        </div>
        <FileDropzone
          key={reset}
          label="Photo de profil"
          disabled={app.demo || offline || busy}
          busy={uploading}
          hint={
            app.demo
              ? 'Ajout de photos disponible avec un compte'
              : 'JPEG, PNG ou WebP · 10 Mo maximum'
          }
          onFile={async (file) => {
            setUploading(true);
            setError('');
            try {
              const data = new FormData();
              data.set('file', file);
              const response = await fetch('/api/media', { method: 'POST', body: data });
              const body = await response.json();
              if (!response.ok) throw new Error(body.error.message);
              setPhotoId(body.data.id);
            } finally {
              setUploading(false);
            }
          }}
        />
        <Button type="submit" disabled={!name.trim()}>
          Enregistrer mon profil
        </Button>
      </fieldset>
      {offline && <p className="muted">Connectez-vous pour modifier votre profil.</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </form>
  );
}

export function BriefingEditor({ onDone }: { onDone: () => void }) {
  const app = useApp();
  const [initial] = useState({ ...defaultBriefings, ...app.profile?.preferences.briefings });
  const [texts, setTexts] = useState(initial);
  const [resetDefaults, setResetDefaults] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const offline = !app.demo && !app.online;
  const field = (key: keyof typeof defaultBriefings, label: string) => (
    <label>
      {label}
      <textarea
        aria-label={label}
        rows={6}
        value={texts[key]}
        required
        maxLength={5000}
        onChange={(event) => setTexts((current) => ({ ...current, [key]: event.target.value }))}
      />
    </label>
  );
  return (
    <form
      className="form briefing-editor"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
          const changed = Object.fromEntries(
            Object.entries(texts).filter(
              ([key, value]) => resetDefaults || value !== initial[key as keyof BriefingTexts],
            ),
          ) as Partial<BriefingTexts>;
          if (Object.keys(changed).length)
            await app.updateProfile({ preferences: { briefings: changed } });
          onDone();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset className="settings-fieldset" disabled={busy || offline}>
        {field('captains', 'Consignes aux capitaines')}
        {field('assistants', 'Consignes aux assistants')}
        <details>
          <summary>Officiels de futsal</summary>
          {field('futsalOfficials', 'Consignes aux officiels (futsal)')}
        </details>
        <div className="row-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setTexts({ ...defaultBriefings });
              setResetDefaults(true);
            }}
          >
            Textes par défaut
          </Button>
          <Button type="submit">Enregistrer les consignes</Button>
        </div>
      </fieldset>
      {offline && <p className="muted">Connectez-vous pour modifier vos consignes.</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </form>
  );
}

export function IndemnityEditor({ onDone }: { onDone: () => void }) {
  const app = useApp();
  const saved = indemnityRates(app.profile?.preferences.indemnityRates);
  const [categories, setCategories] = useState(() => categoriesToPrice(app.matches, saved));
  const [values, setValues] = useState(() =>
    Object.fromEntries(Object.entries(saved).map(([key, value]) => [key, String(value)])),
  );
  const [extra, setExtra] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const offline = !app.demo && !app.online;
  const addCategory = () => {
    const category = normalizeCategory(extra);
    if (!extra.trim() || category === uncategorized) return;
    setCategories((current) => (current.includes(category) ? current : [...current, category]));
    setExtra('');
  };
  return (
    <form
      className="form"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
          const rates = Object.fromEntries(
            categories
              .map((category) => [category, Number(values[category]?.replace(',', '.'))] as const)
              .filter(([category, amount]) => values[category]?.trim() && Number.isFinite(amount)),
          );
          await app.updateProfile({ preferences: { indemnityRates: rates } });
          onDone();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="muted">
        Montant par défaut pour un match d’une catégorie, en euros. Il peut être ajusté match par
        match.
      </p>
      <fieldset className="settings-fieldset" disabled={busy || offline}>
        <div className="indemnity-rates">
          {categories.map((category) => (
            <label key={category}>
              {category}
              <input
                inputMode="decimal"
                pattern="[0-9]+([.,][0-9]{1,2})?"
                maxLength={7}
                placeholder="— €"
                value={values[category] ?? ''}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [category]: event.target.value }))
                }
              />
            </label>
          ))}
        </div>
        <div className="indemnity-add">
          <input
            aria-label="Nouvelle catégorie"
            placeholder="Nouvelle catégorie (ex. U14 D2)"
            maxLength={60}
            value={extra}
            onChange={(event) => setExtra(event.target.value)}
          />
          <Button type="button" variant="secondary" onClick={addCategory}>
            Ajouter
          </Button>
        </div>
        <Button type="submit">Enregistrer les indemnités</Button>
      </fieldset>
      {offline && <p className="muted">Connectez-vous pour modifier vos indemnités.</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </form>
  );
}
