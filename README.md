# Battlezone — prototype

Un premier prototype jouable de combat de tanks en 3D vectorielle rétro.

## Lancer le jeu

Ouvrir `index.html` dans un navigateur moderne. Aucune installation ni connexion
Internet n’est nécessaire.

Pour une expérience plus fiable avec le verrouillage de la souris, il est aussi
possible de lancer un petit serveur local depuis ce dossier :

```powershell
py -m http.server 8000
```

Puis ouvrir `http://localhost:8000`.

## Commandes

- `W` / `S` ou flèches haut / bas : avancer et reculer
- `A` / `D` ou flèches gauche / droite : tourner le tank
- Souris : orienter la tourelle
- `C` : recentrer progressivement la tourelle
- Clic gauche ou espace : tirer
- `P` : pause
- `R` : recommencer après une défaite

## Contenu du prototype

- Vue cockpit en perspective 3D
- Largage aérien du tank avec altimètre et impact au sol
- Choix entre l’Éclaireur rapide à courte portée et le Bastion lent à longue portée
- Conduite et tourelle indépendantes
- Trois ennemis : char d’assaut, chasseur léger et artillerie prioritaire
- Obus d’artillerie en cloche avec zone d’impact, compte à rebours et dégâts de zone
- Vagues progressives, score, blindage et radar
- Effets sonores synthétisés et esthétique d’écran CRT
