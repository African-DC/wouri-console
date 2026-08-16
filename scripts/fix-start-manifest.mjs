#!/usr/bin/env node
// Contournement d'un bug amont TanStack Start + Nitro (start 1.168 / nitro 3 beta).
//
// LE BUG. Le build produit DEUX manifestes de démarrage côté serveur :
//   - le vrai, `_tanstack-start-manifest_v-<hash>.mjs`, qui pointe le script
//     d'entrée vers le bundle client réel `/assets/index-<hash>.js` ;
//   - un stub, `_tanstack-start-manifest_v.mjs`, resté en mode développement,
//     qui pointe vers l'entrée virtuelle `/@id/virtual:tanstack-start-dev-client-entry`.
// Le runtime de `@tanstack/react-start`, bundlé dans son propre chunk, importe le
// STUB. Résultat : en production, `<Scripts />` émet un <script src> vers une
// ressource qui n'existe pas (404), la page ne s'hydrate jamais, et TOUTE
// interactivité du site est morte (pas seulement la démo de traduction).
//
// LE CORRECTIF. Après le build, on recopie le contenu du vrai manifeste sur le
// stub. Déterministe, idempotent, indépendant des hash (recalculés à chaque
// build). Fonctionne pour la sortie locale (`.output`) comme pour Vercel
// (`.vercel/output`).
//
// À RETIRER quand l'amont corrige la double résolution du module virtuel
// `\0tanstack-start-manifest:v`. Vérifier alors qu'un build produit un HTML
// dont le <script type="module"> pointe vers `/assets/index-*.js`.

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const RACINES = [
  '.output/server',
  '.vercel/output/functions/__server.func',
]

const NOM_STUB = '_tanstack-start-manifest_v.mjs'
const MOTIF_REEL = /^_tanstack-start-manifest_v-.+\.mjs$/
const MARQUEUR_DEV = 'tanstack-start-dev-client-entry'
const MARQUEUR_REEL = '/assets/'

let corrige = 0
let inspecte = 0
let stubVus = 0

for (const racine of RACINES) {
  if (!existsSync(racine)) continue
  inspecte += 1

  const fichiers = readdirSync(racine)
  const stub = fichiers.includes(NOM_STUB) ? join(racine, NOM_STUB) : null
  if (!stub) continue
  stubVus += 1

  const contenuStub = readFileSync(stub, 'utf8')
  if (!contenuStub.includes(MARQUEUR_DEV)) {
    // Déjà corrigé (idempotence) ou stub sain : rien à faire.
    continue
  }

  // Le vrai manifeste est le fichier hashé qui référence un bundle d'assets.
  const reel = fichiers
    .filter((f) => MOTIF_REEL.test(f))
    .map((f) => join(racine, f))
    .find((chemin) => readFileSync(chemin, 'utf8').includes(MARQUEUR_REEL))

  if (!reel) {
    console.error(
      `[fix-start-manifest] Stub de dev trouvé dans ${racine} mais aucun manifeste réel : build incomplet ?`,
    )
    process.exitCode = 1
    continue
  }

  writeFileSync(stub, readFileSync(reel, 'utf8'))
  console.log(`[fix-start-manifest] ${racine} : stub remplacé par ${reel.split(/[\\/]/).pop()}`)
  corrige += 1
}

if (inspecte === 0) {
  console.error('[fix-start-manifest] Aucune sortie serveur trouvée (.output / .vercel). Build lancé ?')
  process.exitCode = 1
} else if (stubVus === 0) {
  // Le fichier stub attendu n'existe nulle part. Deux lectures possibles : soit
  // l'amont a corrigé le bug (tant mieux), soit il a renommé le manifeste et ce
  // garde-fou ne protège plus rien. On l'annonce clairement au lieu de le
  // confondre avec un « déjà propre », pour que quelqu'un vérifie que le HTML de
  // prod pointe bien vers /assets/index-*.js.
  console.warn(
    `[fix-start-manifest] Stub attendu (${NOM_STUB}) introuvable. Verifier que ` +
      "le bug amont est corrige : le <script> d'entree doit pointer vers /assets/index-*.js.",
  )
} else if (corrige === 0) {
  console.log('[fix-start-manifest] Rien à corriger : stub déjà sain.')
}
