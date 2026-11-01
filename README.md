# Calendar Plus — version 0.1.0 (prototype)

Clic du milieu sur un événement : ouverture de sa page native Google Calendar
dans un nouvel onglet en arrière-plan. Le clic gauche n'est pas intercepté.
La page ouverte utilise la route native `eventedit` : elle peut donc afficher
l'éditeur si vous avez les droits, mais l'extension ne modifie ni n'enregistre
aucun événement.

## Installer dans Chrome

1. Clonez ce dépôt (ou téléchargez et décompressez son archive ZIP). Pour tester une PR avant fusion, sélectionnez d'abord sa branche.
2. Saisissez `chrome://extensions` dans la barre d'adresse.
3. Activez **Mode développeur**.
4. Cliquez sur **Charger l'extension non empaquetée**.
5. Sélectionnez le dossier du dépôt qui contient `manifest.json`.
6. Rechargez vos onglets Google Calendar, puis cliquez sur un événement avec
   le bouton du milieu (pression sur la molette, pas défilement).

Aucune compilation, dépendance npm, clé API ou configuration OAuth nécessaire.
Pour mettre à jour : remplacez les fichiers, rechargez l'extension dans
`chrome://extensions`, puis rechargez Google Calendar.
Pour désactiver : utilisez l'interrupteur de l'extension sur cette même page.

## Confidentialité et permissions

Le script s'exécute seulement sur `https://calendar.google.com/calendar/*`.
Il lit le lien ou l'attribut d'identification de l'événement cliqué. Aucun
historique, titre ou contenu d'événement n'est enregistré ou envoyé à un serveur.
Seule la navigation demandée ouvre Google Calendar dans un nouvel onglet.
Pas de permission globale `tabs`, pas d'accès aux cookies, pas de code distant.

## Limites à connaître

Cette version a des tests automatisés locaux, mais n'a pas été validée dans
une session Google Calendar réelle. La compatibilité de l'interface doit
donc encore être vérifiée dans votre navigateur.

La résolution repose sur un lien natif d'événement ou l'attribut DOM
`data-eventid` contenant une paire événement/calendrier encodée en Base64.
Ce DOM et la route `eventedit` ne constituent pas une API publique garantie.
Un format inconnu est refusé : un message s'affiche si l'élément possède
`data-eventid`; si Google retire aussi cet attribut, le clic reste inchangé.
Les tâches et les créneaux vides ne sont pas pris en charge.

Le préfixe `/u/N/` et les paramètres `authuser` et `ctz` de la page source
sont conservés. L'identifiant complet est conservé, y compris un éventuel
suffixe d'occurrence. Cela ne garantit pas que Google expose un identifiant
d'occurrence distinct pour chaque événement récurrent : c'est à tester.

## Vérification manuelle avant usage quotidien

- Vue jour, semaine, mois et planning : un clic ouvre exactement un onglet,
  en arrière-plan, avec le bon événement.
- Clic gauche, clic droit, glisser-déposer, zones vides : comportement inchangé.
- Deux occurrences d'une série : vérifier les dates dans les onglets ouverts.
- Événement sur la journée et calendrier partagé : vérifier titre/date/calendrier.
- Plusieurs comptes connectés : tester notamment `/calendar/u/1/`.
- Liens Meet et pièces jointes : clic du milieu habituel du navigateur.
- Changer de semaine sans recharger : vérifier à nouveau le clic du milieu.

Si rien ne s'ouvre, vérifiez l'activation de l'extension et rechargez Calendar.
Un message « format non reconnu » indique qu'il faudra adapter le sélecteur
ou le décodage à votre version de Google Calendar, sans deviner les identifiants.

## Code et tests

- `manifest.json` : configuration Manifest V3.
- `calendar-url.js` : validation et construction des URL.
- `content.js` : détection des clics et message d'erreur local.
- `background.js` : validation du message et création de l'onglet.
- `tests/run.cjs` : tests locaux avec Node.js, sans dépendances.

Exécuter depuis ce dossier : `node tests/run.cjs`.

Documentation technique :
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- https://developer.chrome.com/docs/extensions/reference/api/tabs
- https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world
