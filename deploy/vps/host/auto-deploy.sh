#!/usr/bin/env bash
# Redéploie une application quand origin/main a changé : git pull, docker compose up --build, test de santé,
# retour à la version précédente en cas d'échec. Lancé chaque minute par app-deploy.timer.
set -uo pipefail
ROOT="$HOME/repos"; DIR="$HOME/deploy"; LOG="$DIR/deploy.log"; STATE="$DIR/state"
APPS="abonnement editor matches 9adhiya civi monitor fr smartphone distanceCalc carvizo ArbiGo"
log() { echo "$(date -u +%FT%TZ) $*" >> "$LOG"; }
[ -f "$LOG" ] && [ "$(stat -c%s "$LOG")" -gt 2000000 ] && tail -n 2000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"

exec 9>"$DIR/.lock"
flock -n 9 || exit 0   # un déploiement est déjà en cours

healthy() { # <conteneur> : attend jusqu'à 60 s que l'API réponde
  if [ "$1" = distancecalc-web ]; then
    for _ in $(seq 1 30); do
      docker exec distancecalc-web wget -qO- http://127.0.0.1:8080/healthz 2>/dev/null | grep -qx ok && return 0
      sleep 2
    done
    return 1
  fi
  if [ "$1" = fr-api ]; then # Parle+ (Next.js, port 3000, pas de wget dans l'image)
    for _ in $(seq 1 30); do
      docker exec parle-web node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null && return 0
      sleep 2
    done
    return 1
  fi
  for _ in $(seq 1 30); do
    docker exec "$1" wget -qO- http://127.0.0.1:8080/api/health 2>/dev/null | grep -q '"ok":true' && return 0
    sleep 2
  done
  return 1
}

deploy() { # <app> : construit et démarre le commit courant du dépôt
  # Monitor n'est pas un conteneur : c'est un service systemd, mis à jour par son propre script (copie, redémarrage, test de santé).
  if [ "$1" = ArbiGo ]; then
    (cd "$ROOT/ArbiGo/deploy/vps" && timeout 1500 docker compose --progress quiet up -d --build >> "$LOG" 2>&1) &&
      for _ in $(seq 1 30); do
        docker exec arbigo-web node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null &&
          [ "$(docker inspect arbigo-worker --format '{{.State.Health.Status}}' 2>/dev/null)" = healthy ] && return 0
        sleep 2
      done
    return 1
  fi
  if [ "$1" = monitor ]; then (cd "$ROOT/monitor" && timeout 900 ./deploy/update.sh >> "$LOG" 2>&1); return; fi
  if [ "$1" = distanceCalc ]; then
    (cd "$ROOT/distanceCalc/server" && timeout 1200 docker compose --progress quiet up -d --build >> "$LOG" 2>&1) && healthy distancecalc-web
    return
  fi
  if [ "$1" = carvizo ]; then
    (cd "$DIR/carvizo" && timeout 1500 docker compose --progress quiet up -d --build >> "$LOG" 2>&1) && \
      for _ in $(seq 1 30); do docker exec carvizo-web node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))" 2>/dev/null && return 0; sleep 2; done
    return 1
  fi
  if [ "$1" = fr ]; then (cd "$ROOT/fr/deploy/vps" && timeout 1500 docker compose --progress quiet up -d --build >> "$LOG" 2>&1) && healthy fr-api; return; fi
  (cd "$ROOT/$1/server" && timeout 1200 docker compose --progress quiet up -d --build >> "$LOG" 2>&1) && healthy "$1-api"
}

for app in $APPS; do
  cd "$ROOT/$app" || continue
  timeout 60 git fetch -q origin main 2>>"$LOG" || { log "$app: git fetch impossible"; continue; }
  latest=$(git rev-parse origin/main)
  deployed=$(cat "$STATE/$app.deployed" 2>/dev/null || true)   # dernier commit réellement construit et en service
  [ "$latest" = "$deployed" ] && continue
  # Un commit déjà refusé n'est pas retenté en boucle : on attend le suivant.
  [ "$latest" = "$(cat "$STATE/$app.bad" 2>/dev/null)" ] && continue

  if [ "$(git rev-parse HEAD)" != "$latest" ] && ! git merge --ff-only -q origin/main 2>>"$LOG"; then
    log "$app: mise à jour impossible (modifications locales ou historique divergent), $latest ignoré"
    echo "$latest" > "$STATE/$app.bad"; continue
  fi
  log "$app: ${deployed:-inconnu} -> $latest, construction"
  if deploy "$app"; then
    echo "$latest" > "$STATE/$app.deployed"; rm -f "$STATE/$app.bad"
    # Copie lisible par Monitor (page « Projets » : dernier déploiement).
    [ -d /opt/monitor/deploy-state ] && printf '{"sha":"%s","at":%s}\n' "$latest" "$(date +%s)" > "/opt/monitor/deploy-state/$app.json" 2>/dev/null
    log "$app: déployé ($latest)"
  else
    echo "$latest" > "$STATE/$app.bad"
    if [ -n "$deployed" ]; then
      log "$app: ÉCHEC du déploiement de $latest, retour à $deployed"
      git reset -q --hard "$deployed"
      deploy "$app" && log "$app: version précédente rétablie" || log "$app: ATTENTION, la version précédente ne répond pas non plus"
    else
      log "$app: ÉCHEC du déploiement de $latest (aucune version précédente connue)"
    fi
  fi
done

# Ménage : images et cache de build inutilisés depuis plus d'une semaine.
docker image prune -f --filter "until=168h" >/dev/null 2>&1
docker builder prune -f --filter "until=168h" >/dev/null 2>&1
exit 0
