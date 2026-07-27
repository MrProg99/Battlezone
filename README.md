# Battlezone — prototype

Un premier prototype jouable de combat de tanks en 3D vectorielle rétro.

## Lancer le jeu en solo

Ouvrir `index.html` dans un navigateur moderne. Aucune installation ni connexion
Internet n’est nécessaire.

Pour une expérience plus fiable avec le verrouillage de la souris, il est aussi
possible de lancer un petit serveur local depuis ce dossier :

```powershell
py -m http.server 8000
```

Puis ouvrir `http://localhost:8000`.

## Configurer le mode coop avec Firebase

Le premier jalon multijoueur utilise Firebase Authentication anonyme et Firebase
Realtime Database. Le jeu local reste fluide à 60 images/s; les positions des
trois joueurs sont envoyées environ 10 fois par seconde puis interpolées.
Les données de ce jeu sont isolées sous `battlezone/rooms`, ce qui permet de
partager une Realtime Database avec un autre projet utilisant déjà `rooms`.

1. Créer ou ouvrir un projet dans la console Firebase.
2. Ajouter une application Web au projet.
3. Activer **Authentication > Sign-in method > Anonymous**.
4. Créer une **Realtime Database**.
5. Copier la configuration Web dans `firebase-config.js`.
6. Publier le contenu fusionné de `firebase.rules.json` dans l’onglet **Rules**
   de Realtime Database. Il conserve les règles du projet existant sous `rooms`
   et ajoute celles de Battlezone sous `battlezone/rooms`.
7. Servir le jeu en HTTP/HTTPS. Pour un essai local :

```powershell
py -m http.server 8000
```

Chaque joueur ouvre ensuite le jeu sur son propre ordinateur. Le premier choisit
**Créer coop** et partage le code de cinq caractères. Le second choisit
**Rejoindre** et entre ce code. Un troisième joueur peut utiliser le même code.
Dès que deux chars sont connectés, l’hôte peut lancer la mission ou attendre que
l’escouade de trois soit complète. Le largage démarre simultanément chez tous les
joueurs présents.

Le fichier `firebase.json` permet aussi de publier les règles et le site avec la
CLI Firebase une fois le projet associé :

```powershell
firebase use --add
firebase deploy
```

La configuration Web Firebase est publique par conception. Ne jamais y placer
de secret; l’accès est protégé par l’authentification anonyme et les règles de
Realtime Database.

### État du multijoueur

Ce premier jalon synchronise :

- le salon privé de deux à trois joueurs et son code d’invitation;
- la présence et la déconnexion;
- le type, la position, l’orientation, la tourelle et le blindage des trois chars;
- le départ de mission déclenché par l’hôte;
- la disposition des rochers grâce à une graine de monde commune.
- les vagues, les ennemis, leurs tourelles et leurs obus;
- l'altitude et le cycle d'attaque des drones volants;
- les tirs des trois joueurs et les dégâts infligés aux mêmes cibles;
- le score, les éliminations et le blindage partagé;
- la fin de mission commune si l’un des chars est détruit.

L’hôte est l’unique autorité de la simulation de combat. Les invités contrôlent
leur char localement pour conserver une conduite fluide, transmettent leurs tirs,
puis interpolent le monde partagé reçu depuis `battlezone/rooms/<code>/world`.

## Commandes

- `W` / `S` ou flèches haut / bas : avancer et reculer
- `A` / `D` ou flèches gauche / droite : tourner le tank
- Souris : orienter la tourelle
- `C` : recentrer progressivement la tourelle
- Clic gauche ou espace : tirer
- Clic droit : impulsion de choc défensive
- `P` : pause
- `R` : recommencer après une défaite

## Contenu du prototype

- Vue cockpit en perspective 3D
- Cadre de cockpit blindé avec radar et jauges intégrés
- Lune vectorielle avec cratères, croissant et parallaxe dans le ciel
- Largage aérien du tank avec altimètre et impact au sol
- Choix entre l’Éclaireur rapide à courte portée et le Bastion lent à longue portée
- Conduite et tourelle indépendantes
- Sept ennemis : assaut, chasseur léger, artillerie, Gardien, Fantôme, Kamikaze et Drone
- Obus d’artillerie en cloche avec zone d’impact, compte à rebours et dégâts de zone
- Kamikaze à charge directe, mèche sonore et explosion pouvant provoquer des réactions en chaîne
- Drone rapide qui plonge, attaque en rase-mottes sans s'arrêter, puis remonte
- Vagues progressives, score, blindage et radar
- IA coordonnée avec répartition coop, lignes de tir et manœuvres de flanc
- Effets sonores synthétisés et esthétique d’écran CRT
