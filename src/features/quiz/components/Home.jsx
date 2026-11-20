/* eslint-disable @next/next/no-img-element -- Educational assets retain their original dimensions and offline URLs. */
import { useState } from 'react';
import fffLogo from '../assets/fff-logo.png';
import district75Logo from '../assets/district75-logo.png';
import { resolveDefaultQuestionCount } from '../utils/settings.js';

function PresetButton({ title, detail, disabled, onClick }) {
  return (
    <button type="button" className="preset-card" disabled={disabled} onClick={onClick}>
      <span className="preset-title">{title}</span>
      <span className="preset-detail">{detail}</span>
    </button>
  );
}

export default function Home({
  allQuestions,
  onStart,
  resumable,
  resumeIndex,
  resumeTotal,
  resumeMode,
  onResume,
  onReset,
  settings,
  onNavigate,
  reviewCount = 0,
}) {
  const [category, setCategory] = useState('all');
  const [count, setCount] = useState(settings.defaultQuestionCount);
  const categories = [...new Set(allQuestions.map((question) => question.category))].sort();
  const poolSize =
    category === 'all'
      ? allQuestions.length
      : allQuestions.filter((question) => question.category === category).length;
  const totalQuestions = allQuestions.length;

  function handleReset() {
    if (window.confirm('Réinitialiser le quiz en cours ?')) onReset();
  }

  const standardCount = resolveDefaultQuestionCount(settings.defaultQuestionCount, totalQuestions);
  const quickCount = Math.min(10, totalQuestions);
  const noQuestionsAvailable = totalQuestions === 0;
  const questionTimeSeconds = settings.questionTimeSeconds;
  const standardTimeLimit = settings.defaultTimed ? standardCount * questionTimeSeconds : null;
  const quickTimeLimit = settings.defaultTimed ? quickCount * questionTimeSeconds : null;
  const isExamMode = settings.defaultMode === 'exam';

  function startCustomQuiz() {
    onStart({
      count: count === 'all' ? poolSize : Math.min(Number(count), poolSize),
      category,
      mode: settings.defaultMode,
      preset: 'custom',
      timeLimitSeconds: standardTimeLimit,
    });
  }

  return (
    <div className="screen home-screen">
      <div className="logos-row">
        <img src={fffLogo.src ?? fffLogo} alt="Logo FFF" className="logo logo-fff" />
        <img
          src={district75Logo.src ?? district75Logo}
          alt="Logo District 75 Paris"
          className="logo logo-district"
        />
      </div>

      <h1 className="app-title">Quiz Arbitrage</h1>
      <p className="app-subtitle">Entraînement CDA — District de Paris</p>

      {resumable ? (
        <div className="card setup-card">
          <p className="field-label">Quiz en pause</p>
          <p className="setup-text">
            Question {resumeIndex + 1} sur {resumeTotal} ·{' '}
            {resumeMode === 'exam' ? 'Mode examen' : 'Mode entraînement'}
          </p>
          <button type="button" className="btn btn-primary" onClick={onResume}>
            Reprendre le quiz
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            Réinitialiser et recommencer
          </button>
        </div>
      ) : (
        <>
          <div className="card setup-card">
            <p className="field-label">Choisir un entraînement</p>
            <div className="preset-grid">
              <PresetButton
                title={isExamMode ? '⚡ Examen rapide' : '⚡ Quiz rapide'}
                detail={`${quickCount} questions`}
                disabled={quickCount === 0}
                onClick={() =>
                  onStart({
                    count: quickCount,
                    preset: 'quick',
                    mode: settings.defaultMode,
                    timeLimitSeconds: quickTimeLimit,
                  })
                }
              />
              <PresetButton
                title={isExamMode ? '🎯 Examen' : '🎯 Entraînement'}
                detail={`${standardCount} questions`}
                disabled={standardCount === 0}
                onClick={() =>
                  onStart({
                    count: standardCount,
                    preset: 'training',
                    mode: settings.defaultMode,
                    timeLimitSeconds: standardTimeLimit,
                  })
                }
              />
            </div>
          </div>

          <div className="card setup-card custom-quiz-card">
            <p className="field-label">Quiz personnalisé</p>
            <label className="field-label">
              Catégorie
              <select
                aria-label="Catégorie du quiz"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="all">Toutes les catégories</option>
                {categories.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Nombre de questions
              <select
                aria-label="Nombre de questions du quiz"
                value={count}
                onChange={(event) => setCount(event.target.value)}
              >
                {[10, 20, 30].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
                <option value="all">Toutes</option>
              </select>
            </label>
            <button
              type="button"
              className="btn btn-primary"
              disabled={noQuestionsAvailable}
              onClick={startCustomQuiz}
            >
              Commencer le quiz
            </button>
          </div>
        </>
      )}

      <div className="quiz-extra-nav">
        <button
          className="button secondary"
          onClick={() =>
            onStart({
              count: standardCount,
              preset: 'adaptive',
              mode: settings.defaultMode,
              timeLimitSeconds: standardTimeLimit,
            })
          }
        >
          Entraînement adaptatif
        </button>
        <button
          className="button secondary"
          onClick={() =>
            onStart({
              count: standardCount,
              preset: 'weak',
              mode: settings.defaultMode,
              timeLimitSeconds: standardTimeLimit,
            })
          }
        >
          Travailler mes points faibles
        </button>
      </div>
      <div className="quiz-hub" aria-label="Révisions et outils">
        {[
          [
            'reviews',
            '★',
            'Révisions',
            `${reviewCount} question${reviewCount > 1 ? 's' : ''} à retravailler : favoris, erreurs, jamais validées`,
          ],
          ['terrain', '⚽', 'Terrain', 'Positions et situations de jeu en schémas'],
          ['notes', '✎', 'Notes', 'Fiches de synthèse et résumés'],
        ].map(([screen, icon, title, description]) => (
          <button
            type="button"
            className="settings-link-card"
            key={screen}
            onClick={() => onNavigate?.(screen)}
          >
            <span className="settings-link-icon" aria-hidden="true">
              {icon}
            </span>
            <span className="settings-link-copy">
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
            <span className="settings-link-arrow" aria-hidden="true">
              →
            </span>
          </button>
        ))}
      </div>
      <p className="footer-note">
        Questions issues du test théorique CDA — District Parisien de Football, saison 2026/2027. À
        but d’entraînement.
      </p>
    </div>
  );
}
