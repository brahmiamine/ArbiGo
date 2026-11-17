import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="loading-screen">
      <h1>Cette page est hors-jeu.</h1>
      <Link className="button primary" href="/app">
        Revenir à ArbiGo
      </Link>
    </main>
  );
}
