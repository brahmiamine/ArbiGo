'use client';
import { useEffect, useState } from 'react';
import {
  Bell,
  Smartphone,
  ShieldCheck,
  LogOut,
  CloudCheck,
  AlertTriangle,
  Volume2,
  RefreshCw,
  Pencil,
} from 'lucide-react';
import { useApp } from './app-provider';
import { api } from '@/lib/api';
import { ProfileAvatar } from './media';
import { ProfileEditor, BriefingEditor } from './profile-settings';
import { Button, Badge, Notice, Modal, PageHeader } from '@/components/ui';
export function Profile() {
  const app = useApp();
  const [devices, setDevices] = useState<
      { id: string; label: string; lastSeenAt: string; revokedAt: string | null }[]
    >([]),
    [message, setMessage] = useState(''),
    [sound, setSound] = useState(app.profile?.preferences.soundEnabled ?? true),
    [push, setPush] = useState(false),
    [deleting, setDeleting] = useState(false),
    [deleteBusy, setDeleteBusy] = useState(false),
    [editing, setEditing] = useState(false),
    [briefings, setBriefings] = useState(false);
  useEffect(() => {
    if (!app.demo && app.online)
      void api<typeof devices>('devices')
        .then(setDevices)
        .catch(() => {});
  }, [app.demo, app.online]);
  async function enablePush() {
    try {
      if (app.demo) throw new Error('Les notifications sont disponibles avec un compte.');
      if (
        !('Notification' in window) ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window)
      )
        throw new Error(
          'Notifications non prises en charge. Sur iPhone, installez d’abord ArbiGo sur l’écran d’accueil avec un système compatible.',
        );
      if (!app.profile?.vapidPublicKey)
        throw new Error('Les clés de notification du serveur ne sont pas encore configurées.');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted')
        throw new Error(
          'Notifications désactivées dans votre navigateur. Votre préparation reste utilisable.',
        );
      const registration = await navigator.serviceWorker.ready;
      const key = Uint8Array.from(
        atob(app.profile.vapidPublicKey.replace(/-/g, '+').replace(/_/g, '/')),
        (c) => c.charCodeAt(0),
      );
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key,
      });
      await api('push/subscriptions', 'POST', { ...sub.toJSON(), deviceId: app.deviceId });
      setPush(true);
      setMessage('Notifications activées sur cet appareil.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Activation impossible.');
    }
  }
  async function disablePush() {
    try {
      await api('push/subscriptions', 'DELETE');
      const registration = await navigator.serviceWorker.ready;
      await (await registration.pushManager.getSubscription())?.unsubscribe();
      setPush(false);
      setMessage('Notifications désactivées.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Erreur');
    }
  }
  return (
    <>
      <PageHeader title="Profil" />
      <div className="profile-grid">
        <section className="panel profile-account">
          <div className="profile-identity">
            <ProfileAvatar
              name={app.profile?.name ?? ''}
              photoId={app.profile?.preferences.avatarPhotoId}
              large
            />
            <div>
              <h2>{app.profile?.name}</h2>
              <p className="muted">{app.profile?.email}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil size={17} />
            Modifier mon profil
          </Button>
          <hr />
          <div className="setting">
            <CloudCheck />
            <div>
              <strong>
                {app.pending ? `${app.pending} action(s) à synchroniser` : 'Données synchronisées'}
              </strong>
              <p>
                {app.online ? 'Vous êtes connecté.' : 'Hors ligne · enregistré sur cet appareil.'}
              </p>
            </div>
            <button
              className="icon-button"
              aria-label="Synchroniser"
              onClick={() => void app.sync()}
            >
              <RefreshCw size={19} />
            </button>
          </div>
          <Button
            variant="secondary"
            onClick={() => void app.logout().catch((e) => setMessage(e.message))}
          >
            <LogOut size={17} />
            Se déconnecter
          </Button>
        </section>
        <section className="panel">
          <h2>Mes consignes</h2>
          <Button variant="secondary" onClick={() => setBriefings(true)}>
            <Pencil size={17} />
            Modifier les consignes
          </Button>
        </section>
        <section className="panel">
          <h2>Avant et pendant la rencontre</h2>
          <div className="setting">
            <Volume2 />
            <div>
              <strong>Sons discrets</strong>
              <p>Le bouton muet reste accessible dans le tunnel.</p>
            </div>
            <input
              aria-label="Activer les sons"
              type="checkbox"
              checked={sound}
              onChange={async (e) => {
                const enabled = e.target.checked;
                setSound(enabled);
                await app
                  .updateProfile({ preferences: { soundEnabled: enabled } })
                  .then(() => {
                    localStorage.setItem(`arbigo:mute:${app.profile?.id}`, String(!enabled));
                  })
                  .catch((e) => {
                    setSound(!enabled);
                    setMessage(e.message);
                  });
              }}
            />
          </div>
          <div className="setting">
            <Bell />
            <div>
              <strong>Notifications de préparation</strong>
              <p>Rappel du sac, préavis et horaire d’étape.</p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => void (push ? disablePush() : enablePush())}>
            {push ? 'Désactiver les notifications' : 'Activer sur cet appareil'}
          </Button>
          <p className="tiny muted">
            Hors ligne, les compteurs fonctionnent lorsque l’application est ouverte. Les alertes
            système à heure fixe ne sont pas garanties sans réseau.
          </p>
          {message && <Notice>{message}</Notice>}
        </section>
        <section className="panel">
          <h2>
            <Smartphone size={21} />
            Mes appareils
          </h2>
          {app.demo ? (
            <p className="muted">La gestion des appareils est disponible avec un compte.</p>
          ) : (
            devices.map((d) => (
              <div className="device-row" key={d.id}>
                <div>
                  <strong>{d.label}</strong>
                  <span>
                    {d.id === app.deviceId
                      ? 'Cet appareil'
                      : new Date(d.lastSeenAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <Badge tone={d.revokedAt ? 'gray' : 'green'}>
                  {d.revokedAt ? 'Révoqué' : 'Lié'}
                </Badge>
                {d.id !== app.deviceId && !d.revokedAt && (
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      await api(`devices/${d.id}`, 'DELETE');
                      setDevices(await api('devices'));
                    }}
                  >
                    Révoquer
                  </Button>
                )}
              </div>
            ))
          )}
        </section>
        <section className="panel">
          <h2>
            <ShieldCheck size={21} />
            Votre carnet, vos décisions
          </h2>
          <p className="muted">
            ArbiGo est une aide à la préparation. Les modèles doivent correspondre aux textes de
            votre organisateur et de votre saison.
          </p>
          <p className="muted">
            Vos informations sont privées. Les médias et journaux sont accessibles uniquement depuis
            votre compte. Le journal clôturé reste immuable ; vos notes ultérieures sont conservées
            séparément.
          </p>
          <a className="text-button" href="/privacy">
            Confidentialité et conservation →
          </a>
          {!app.demo && (
            <div className="form">
              <a className="button secondary" href="/api/me/data" download>
                Télécharger mes données personnelles (JSON)
              </a>
              <Button
                variant="danger"
                disabled={!app.online || app.pending > 0}
                onClick={() => setDeleting(true)}
              >
                Supprimer mon compte et mes données
              </Button>
            </div>
          )}
        </section>
      </div>
      {editing && (
        <Modal title="Modifier mon profil" onClose={() => setEditing(false)}>
          <ProfileEditor onDone={() => setEditing(false)} />
        </Modal>
      )}
      {briefings && (
        <Modal title="Mes consignes" onClose={() => setBriefings(false)}>
          <BriefingEditor onDone={() => setBriefings(false)} />
        </Modal>
      )}
      {deleting && (
        <Modal title="Supprimer mon compte" onClose={() => !deleteBusy && setDeleting(false)}>
          <form
            className="form"
            onSubmit={async (event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              setDeleteBusy(true);
              try {
                await api('me/data', 'DELETE', { password: String(data.get('password')) });
                await app.logout();
              } catch (error) {
                setMessage(error instanceof Error ? error.message : 'Suppression impossible.');
              } finally {
                setDeleteBusy(false);
              }
            }}
          >
            <Notice>
              La suppression retire vos rencontres, journaux, photos et appareils du service. Elle
              est définitive. Les sauvegardes chiffrées expirent selon leur rétention de 14 jours.
              Téléchargez vos données avant de continuer si vous souhaitez les conserver.
            </Notice>
            <label>
              Mot de passe actuel
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                maxLength={128}
              />
            </label>
            {message && <p role="alert">{message}</p>}
            <Button type="submit" variant="danger" disabled={deleteBusy}>
              {deleteBusy ? 'Suppression…' : 'Supprimer définitivement'}
            </Button>
          </form>
        </Modal>
      )}
      {app.conflicts.length > 0 && (
        <section className="panel conflicts">
          <h2>
            <AlertTriangle size={21} />
            Actions conservées à examiner
          </h2>
          <Notice>
            Ces actions ne sont pas fusionnées automatiquement. Le détail reste consultable
            ci-dessous. Reprendre l’état serveur conserve les actions écartées en quarantaine.
          </Notice>
          {app.conflicts.map((q) => (
            <div className="conflict-row" key={q.id}>
              <Badge tone="amber">{q.status}</Badge>
              <p>
                {q.reason} · {q.operation.action.type} ·{' '}
                {new Date(q.operation.occurredAt).toLocaleString('fr-FR')}
              </p>
              <details>
                <summary>Voir l’action conservée</summary>
                <pre>{JSON.stringify(q.operation.action, null, 2)}</pre>
              </details>
              <Button
                variant="secondary"
                onClick={() =>
                  void app.resolve(q.operation.matchId).catch((e) => setMessage(e.message))
                }
              >
                Reprendre l’état du serveur
              </Button>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
