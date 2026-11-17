import Link from 'next/link';
export default function Privacy() {
  return (
    <main className="legal">
      <Link href="/app" className="brand">
        ArbiGo<span>.</span>
      </Link>
      <h1>Confidentialité</h1>
      <p>
        ArbiGo conserve votre e-mail, le hash de votre mot de passe, vos préférences, appareils,
        inventaire, photos et journaux de préparation pour fournir le service. Vos préparations sont
        privées et isolées par compte.
      </p>
      <h2>Sur votre appareil</h2>
      <p>
        Les rencontres et actions sont enregistrées dans IndexedDB afin de permettre la préparation
        hors ligne. Les données sont supprimées localement à la déconnexion après synchronisation.
        Un appareil partagé doit être déconnecté après usage. Une perte de stockage local peut
        supprimer les actions qui n’ont pas encore été synchronisées.
      </p>
      <h2>Sur le serveur</h2>
      <p>
        Les données et photos restent conservées tant que votre compte est actif. Les journaux
        clôturés ne peuvent être modifiés dans l’application ; une note complémentaire peut être
        ajoutée. Ce verrou métier n’empêche pas l’exercice de vos droits sur les données
        personnelles.
      </p>
      <h2>Notifications</h2>
      <p>
        Votre permission est volontaire et révocable dans le profil ou le navigateur. L’adresse
        technique de l’abonnement est conservée pour l’envoi des alertes. Aucun outil publicitaire
        ni mesure d’audience externe n’est intégré.
      </p>
      <h2>Avant l’ouverture du service</h2>
      <p>
        Le responsable de traitement, son contact, les durées de conservation détaillées, les
        sous-traitants et les procédures d’accès, suppression et rectification doivent être
        renseignés par l’exploitant avant lancement public. Cette version est destinée à la recette
        privée.
      </p>
      <Link href="/app">Retour à mon espace →</Link>
    </main>
  );
}
