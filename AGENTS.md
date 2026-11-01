# Consignes de contribution

- Toute modification doit être proposée sur une branche dédiée et faire l'objet d'une Pull Request.
- Ne pas pousser directement sur `main`.
- Ne pas fusionner une PR sans demande explicite de l'utilisateur.

## Tests unitaires obligatoires

- À chaque modification de code, ajouter ou mettre à jour des tests unitaires pertinents dans la même PR, y compris pour les corrections et les refactorisations.
- Couvrir le comportement modifié, les cas limites et les erreurs applicables. Pour une correction de bug, ajouter un test de non-régression qui échoue avant la correction et réussit après.
- Exécuter la suite complète avec `node tests/run.cjs` après les modifications et corriger les échecs avant livraison.
- Indiquer dans la description de la PR les tests ajoutés ou modifiés, la commande exécutée et le résultat. Si l'exécution est impossible, le signaler explicitement sans annoncer de réussite.
- Distinguer les tests unitaires en environnement simulé des validations dans Google Calendar réel ; les premiers ne remplacent pas les secondes.
- Pour une modification exclusivement documentaire, indiquer « Tests unitaires : non applicables, documentation uniquement » dans la PR ; ne pas ajouter de tests artificiels sans comportement à vérifier.
