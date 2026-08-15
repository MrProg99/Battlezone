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

Pour tester directement une vague précise, ajouter le paramètre `wave` à
l'adresse. Par exemple, `http://localhost:8000/?wave=5` commence à la vague du
Behemoth. Les valeurs invalides sont ignorées et les valeurs acceptées sont
limitées de 1 à 99. En Coop, seul le paramètre utilisé par l'hôte est appliqué;
les invités reçoivent automatiquement la vague choisie.

La mission Champ de mines peut être testée directement avec
`http://localhost:8000/?wave=10`.

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

- un identifiant unique par mission (protocole v3) qui rejette les états, les tirs et les mondes d'une partie précédente;
- le salon privé de deux à trois joueurs et son code d’invitation;
- la présence et la déconnexion;
- le nom des pilotes et leur identification au-dessus des chars alliés;
- le type, la position, l’orientation, la tourelle et le blindage des trois chars;
- le départ de mission déclenché par l’hôte;
- la disposition des rochers grâce à une graine de monde commune.
- les vagues, les ennemis, leurs tourelles et leurs obus;
- la remise en formation des joueurs à gauche et des ennemis à droite à chaque vague;
- l'altitude et le cycle d'attaque des drones volants;
- les tirs des trois joueurs et les dégâts infligés aux mêmes cibles;
- les déploiements du Soutien, ses tourelles automatiques et ses modules d'armure;
- le classement Coop des destructions individuelles entre les vagues;
- le score, les éliminations et le blindage partagé;
- la fin de mission commune si l’un des chars est détruit.

L’hôte est l’unique autorité de la simulation de combat. Les invités contrôlent
leur char localement pour conserver une conduite fluide, transmettent leurs tirs,
puis interpolent le monde partagé reçu depuis `battlezone/rooms/<code>/world`.

## Organisation du JavaScript

- `config.js` : paramètres de jeu, châssis, ennemis, missions et constantes de rendu;
- `terrain.js` : génération déterministe des rochers, rampes et volcans, surfaces et règles de placement;
- `missions.js` : catalogue des missions, rotation, environnement et planification des vagues;
- `audio.js` : chargement des sons, moteur, spatialisation et tonalités synthétiques;
- `ui.js` : éléments HTML et rendu des écrans de salon, classement, amélioration et fin;
- `multiplayer.js` : connexion Firebase, salons et transport des états;
- `game.js` : orchestration de la simulation, du combat et du rendu vectoriel.

Ces fichiers utilisent des API globales `Battlezone*` afin de rester compatibles
avec l’ouverture directe de `index.html`, sans installation ni étape de compilation.

## Commandes

- `W` / `S` ou flèches haut / bas : avancer et reculer
- `A` / `D` ou flèches gauche / droite : tourner le tank
- Souris : orienter la tourelle
- `C` : recentrer progressivement la tourelle
- Clic gauche ou espace : tirer
- Clic droit : impulsion de choc défensive
- `Q` avec l’Éclaireur : activer le Turbo vectoriel pendant 4 secondes avec effet
- `E` avec l’Éclaireur après déblocage : déposer un leurre holographique qui attire les ennemis, absorbe quatre impacts puis explose
- `Q` avec le Soutien : immobiliser le char 2 secondes et déployer une tourelle automatique pour 10 secondes
- `Q` avec le Bastion : lancer cinq bombes orbitales dans l'axe de la tourelle
- `Q` avec le Spectre : activer le camouflage de phase pendant 5 secondes; tirer ou utiliser l'impulsion le désactive
- Avec Embuscade spectrale débloquée : la sortie du camouflage charge pendant 4 secondes un obus violet à dégâts doublés qui brise le bouclier Gardien et traverse un premier tank
- `E` avec le Soutien : déployer un powerup d'armure pour l'escouade
- `P` : pause
- `R` : recommencer après une défaite
- Rampe : repérer sa flèche sur le terrain, entrer par le côté bas et accélérer avec `W`; la hauteur du saut dépend de la vitesse

## Contenu du prototype

- Vue cockpit en perspective 3D
- Terrain agrandi avec zones de départ opposées et formation Coop espacée
- Rampe vectorielle procédurale : position et orientation variables, sens unique, saut physique et synchronisation Coop par la graine du monde
- Cadre de cockpit blindé avec radar et jauges intégrés
- Pare-brise endommagé progressivement : fissures supplémentaires sous 62 %, 42 %, 25 % et 12 % de santé
- Lune vectorielle avec cratères, croissant et parallaxe dans le ciel
- Largage aérien du tank avec altimètre et impact au sol
- Quatre châssis jouables : l’Éclaireur rapide, le Bastion à longue portée, le Soutien polyvalent et le Spectre d’infiltration
- Atelier entre les vagues : propulsion, blindage, portée, cadence du canon, recharge de la capacité propre à chaque châssis, Canon jumelé du Bastion, Leurre holographique du Scout et Embuscade spectrale du Spectre après la première vague
- Modules spécialisés limités à cinq niveaux : capacités jusqu’à -40 % de recharge et canon jusqu’à -20 % de temps de rechargement
- Éclaireur : Turbo vectoriel avec vitesse avant +60 %, accélération doublée, rotation +30 % et recharge de 18 secondes
- Éclaireur : Leurre holographique déblocable, prioritaire pour les ennemis dans un rayon de 42 mètres, doté de 4 PV et d’une explosion offensive
- Soutien : vitesse et portée moyennes, tourelle destructible de 3 PV, cadence automatique et module d'armure à recharge longue
- Bastion : bombardement orbital de cinq impacts successifs avec zones d'avertissement, recharge de 35 secondes et Canon jumelé déblocable qui tire deux obus parallèles
- Spectre : vitesse et portée élevées, camouflage de phase de 5 secondes, détection ennemie limitée à courte distance et recharge de 22 secondes
- Spectre : Embuscade spectrale déblocable; la sortie de camouflage charge un tir de 2 dégâts pendant 4 secondes, brise un bouclier Gardien et peut toucher deux tanks alignés
- Conduite et tourelle indépendantes
- Dix ennemis : assaut, chasseur léger, Guêpe, Poseur de mines, artillerie, Gardien, Fantôme, Kamikaze, Drone et le boss Behemoth
- Guêpe dès la vague 8 : flanqueur très rapide et fragile, esquive télégraphiée, deux canons à rafale légère et bref ralentissement pendant le tir
- Poseur de mines dès la vague 4 : tank rapide, canon léger à cadence élevée et mines de proximité déclenchables par les tirs
- Gardien de soutien : protège les unités proches et brouille les radars des joueurs dans un rayon de 640 m
- Behemoth à la vague 5 : blindage massif, deux canons, mortier à salves et poursuite accélérée pendant sa phase Enragée sous 50 % de vie
- Obus d’artillerie en cloche avec zone d’impact, compte à rebours et dégâts de zone
- Kamikaze à charge directe, mèche sonore et explosion pouvant provoquer des réactions en chaîne
- Drone rapide qui plonge, attaque en rase-mottes sans s'arrêter, puis remonte
- Vagues progressives, score, blindage et radar
- Six missions scriptées cycliques dès la vague 6 : défendre un relais, éliminer une vague de Fantômes, détruire un centre de commandement en 55 secondes, intercepter un train blindé, traverser un champ de mines, puis survivre pendant deux minutes
- Survie dès la vague 11 : chronomètre de 120 secondes, remplacement de chaque ennemi détruit après 10 secondes et largage aérien télégraphié avant sa reprise du combat
- Champ de mines dès la vague 10 : 24 mines préinstallées en solo, quatre de plus par allié, grappes irrégulières, trois passages praticables, détection radar à courte portée et deux Poseurs de mines
- Défense du relais : 180 PV, +30 PV par allié supplémentaire et bouclier de déploiement de 2 secondes
- Brouillard dense sur les missions de défense dès la vague 6 : visibilité vectorielle réduite avec radar toujours opérationnel
- Pluie battante sur les chasses aux Fantômes dès la vague 7 : traînées vectorielles animées et légère atténuation de la vision lointaine
- IA coordonnée avec répartition coop, lignes de tir et manœuvres de flanc
- Effets sonores synthétisés et esthétique d’écran CRT
