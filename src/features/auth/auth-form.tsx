'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Button, Notice } from '@/components/ui';
import { api } from '@/lib/api';
import { ArrowRight, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { PitchArt } from '../dashboard';
export function AuthForm({ mode }: { mode: 'login' | 'register' | 'forgot' | 'reset' | 'verify' }) {
  const params = useSearchParams();
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const titles = {
    login: 'Le terrain vous attend.',
    register: 'Votre prochain match commence ici.',
    forgot: 'Retrouvez votre accès.',
    reset: 'Un nouveau départ.',
    verify: 'Confirmez votre adresse.',
  };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(e.currentTarget);
    try {
      if (mode === 'login') {
        const result = await signIn('credentials', {
          email: data.get('email'),
          password: data.get('password'),
          redirect: false,
        });
        if (result?.error)
          throw new Error('Adresse, mot de passe ou vérification de l’e-mail à vérifier.');
        router.replace('/app');
        return;
      }
      const routes = {
        register: 'register',
        forgot: 'forgot-password',
        reset: 'reset-password',
        verify: 'verify-email',
      };
      const result = await api<{ message: string }>(`auth/${routes[mode]}`, 'POST', {
        name: data.get('name'),
        email: data.get('email'),
        password: data.get('password'),
        token: params.get('token'),
      });
      setMessage(result.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Le service est indisponible.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <Link className="brand" href="/">
          ArbiGo<span>.</span>
        </Link>
        <div>
          <span className="eyebrow">LE CARNET D’AVANT-MATCH DES ARBITRES</span>
          <h1>
            Arrivez prêt.
            <br />
            Arbitrez l’esprit
            <br />
            libre<span>.</span>
          </h1>
          <p>
            Du sac au premier coup de sifflet,
            <br />
            votre préparation tient dans la poche.
          </p>
          <PitchArt />
        </div>
        <span className="tiny">UN OUTIL POUR VOUS. LES DÉCISIONS RESTENT LES VÔTRES.</span>
      </section>
      <section className="auth-panel">
        <Link href="/" className="brand mobile-brand">
          ArbiGo<span>.</span>
        </Link>
        <div className="auth-form-wrap">
          <span className="eyebrow">
            {mode === 'login' ? 'CONTENT DE VOUS REVOIR' : 'BIENVENUE CHEZ ARBIGO'}
          </span>
          <h2>{titles[mode]}</h2>
          <p className="muted">
            {mode === 'login'
              ? 'Retrouvez vos matchs, votre matériel et vos repères.'
              : 'Votre compte personnel de préparation d’avant-match.'}
          </p>
          {message ? (
            <div className="form">
              <Notice tone="green">{message}</Notice>
              <Link className="button primary" href="/auth/login">
                Se connecter
                <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <form className="form" onSubmit={submit}>
              {mode === 'register' && (
                <label>
                  Prénom ou nom
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={100}
                    placeholder="Amine"
                  />
                </label>
              )}
              {['login', 'register', 'forgot'].includes(mode) && (
                <label>
                  Adresse e-mail
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={191}
                    placeholder="vous@exemple.fr"
                  />
                </label>
              )}
              {['login', 'register', 'reset'].includes(mode) && (
                <label>
                  Mot de passe
                  <input
                    name="password"
                    type="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    minLength={mode === 'login' ? 1 : 12}
                    maxLength={128}
                    required
                    placeholder={mode === 'login' ? 'Votre mot de passe' : '12 caractères minimum'}
                  />
                </label>
              )}
              {mode === 'login' && (
                <Link className="forgot-link" href="/auth/forgot">
                  Mot de passe oublié ?
                </Link>
              )}
              {mode === 'verify' && (
                <Notice>
                  Confirmez votre adresse en appuyant sur le bouton. Le lien est temporaire et à
                  usage unique.
                </Notice>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={busy}>
                {busy
                  ? 'Un instant…'
                  : {
                      login: 'Se connecter',
                      register: 'Créer mon compte',
                      forgot: 'Recevoir le lien',
                      reset: 'Enregistrer le mot de passe',
                      verify: 'Confirmer mon adresse',
                    }[mode]}
                <ArrowRight size={18} />
              </Button>
            </form>
          )}
          <p className="auth-switch">
            {mode === 'login' ? (
              <>
                Pas encore de compte ? <Link href="/auth/register">Rejoindre ArbiGo</Link>
              </>
            ) : (
              <Link href="/auth/login">Retour à la connexion</Link>
            )}
          </p>
          {mode === 'login' && (
            <Link className="demo-link" href="/demo">
              Découvrir la démo sans compte
              <ArrowUpRight size={17} />
            </Link>
          )}
          <p className="privacy-hint">
            <ShieldCheck size={15} />
            Vos préparations restent privées. <Link href="/privacy">Confidentialité</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
