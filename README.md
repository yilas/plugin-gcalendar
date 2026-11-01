# Calendar Plus

Extension Chrome : **clic du milieu sur un événement Google Calendar → nouvel onglet en arrière-plan**. Le clic gauche reste inchangé. La page native peut afficher l’éditeur selon vos droits ; l’extension ne modifie aucun événement.

**Raccourcis :** Ctrl + clic sous Windows/Linux, ⌘ + clic sur Mac. Les combinaisons avec Alt ou Maj conservent leur comportement habituel.

**Ouverture :** depuis l’icône de l’extension, choisissez si le nouvel onglet devient actif. Le choix est mémorisé localement ; arrière-plan par défaut.

## Installation

1. Clonez le dépôt ou décompressez son ZIP (sélectionnez la branche pour tester une PR).
2. Ouvrez `chrome://extensions` et activez le **Mode développeur**.
3. Cliquez sur **Charger l’extension non empaquetée** et sélectionnez le dossier contenant `manifest.json`.
4. Rechargez Google Calendar, puis cliquez sur un événement avec la molette.

Aucune compilation ni clé API. Après une mise à jour, rechargez l’extension puis Google Calendar. Pour la désactiver, utilisez son interrupteur dans `chrome://extensions`.

## Confidentialité et limites

- Fonctionne uniquement sur Google Calendar, sans collecte de données ni serveur tiers.
- Prototype 0.1.0 : tests locaux simulés ; validation dans Google Calendar réel encore nécessaire, notamment pour les récurrences, calendriers partagés et comptes multiples.
- Dépend de l’interface de Google, qui peut évoluer. Les événements non reconnus, tâches et créneaux vides ne sont pas pris en charge.

## Tests et contributions

Avec Node.js, depuis la racine du dépôt :

```sh
node tests/run.cjs
```

Toute modification passe par une **PR**, avec des tests unitaires pour chaque changement de code. Voir [AGENTS.md](AGENTS.md).
