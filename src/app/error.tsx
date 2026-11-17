'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="loading-screen">
      <h1>Impossible de charger la page.</h1>
      <p>Vos actions déjà enregistrées sur cet appareil sont conservées.</p>
      <button className="button primary" onClick={reset}>
        Réessayer
      </button>
    </main>
  );
}
