<div align="center">
# GEEMA - Technicien App

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-blue.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-3-blue.svg)](https://www.sqlite.org/)

</div>

> **GEEMA** est une application desktop moderne et performante pour la gestion complète des élevages avicoles, construite avec Tauri, React et SQLite.

## Architecture Technique

### Backend Rust avec Tauri 2.0

L'application utilise Tauri 2.0 comme framework principal, combinant la performance native de Rust avec la flexibilité de React. Le backend Rust gère toute la logique métier, les opérations de base de données et l'API des commandes Tauri.

**Caractéristiques techniques :**

- **Pool de connexions SQLite** : Utilise r2d2 pour gérer jusqu'à 15 connexions simultanées
- **Mode WAL** : Optimise les performances concurrentes de SQLite
- **Gestion d'erreurs robuste** : Implémente des types d'erreur personnalisés avec thiserror
- **Architecture en couches** : Repository pattern, services métier, et commandes Tauri séparés

### Frontend React avec TypeScript

L'interface utilisateur est construite avec React 18.3 et TypeScript 5.6, utilisant shadcn/ui comme système de composants et Tailwind CSS pour le styling.

**Composants clés :**

- **Tableaux de données interactifs** avec édition en ligne
- **Formulaires avec validation** utilisant React Hook Form et Zod
- **Système de navigation** avec React Router
- **Gestion d'état** avec hooks React personnalisés

## Structure de Gestion Hebdomadaire

### Organisation des Données

GEEMA implémente un système de suivi hebdomadaire sophistiqué où chaque bande peut avoir **5 à 9 semaines** de suivi, et chaque semaine contient **7 jours** de données détaillées.

**Hiérarchie des données :**

```
Ferme → Bande → Bâtiment → Semaines (5-9) → Jours (7 par semaine)
```

### Tableau de Suivi Quotidien

Le cœur de l'application est le tableau de suivi hebdomadaire qui affiche les données de manière organisée et éditable :

**Structure du tableau :**

````

**Structure des headers fusionnés :**

- **Décès** : Fusionne "Jour" et "Total" sur 2 colonnes
- **Alimentation** : Fusionne "Jour" et "Total" sur 2 colonnes
- **Soins** : Fusionne "Traitement" et "Quantité" sur 2 colonnes
- **Jour, Date, Analyses, Remarques** : Headers simples sur 1 colonne chacun

### Logique de Calcul Automatique

L'application implémente des calculs automatiques sophistiqués :

**Totaux cumulatifs :**

- **Décès total** = Décès du jour + Total du jour précédent
- **Alimentation total** = Alimentation du jour + Total du jour précédent

**Validation des données :**

- Impossible de saisir des données pour un jour sans avoir rempli le jour précédent
- Contrôle de progression par semaine (semaine N+1 nécessite des données en semaine N)
- Gestion des poids hebdomadaires avec validation séquentielle

## 🗄️ Base de Données et Performance

### Schéma Optimisé

La base de données SQLite est conçue pour la performance à long terme :

**Tables principales :**

- `fermes` : Gestion des fermes avec nom et nombre de meubles
- `bandes` : Groupes de poussins avec dates d'entrée et notes
- `batiments` : Bâtiments d'élevage avec affectation personnel/poussins
- `semaines` : Suivi hebdomadaire avec poids moyen
- `suivi_quotidien` : Données quotidiennes détaillées
- `soins` : Catalogue des soins et médicaments
- `maladies` : Gestion des problèmes sanitaires
- `personnel` : Responsables et personnel d'élevage

**Optimisations de performance :**

- **Index composites** sur les colonnes fréquemment interrogées
- **Pool de connexions** pour éviter les verrous de base de données
- **Mode WAL** pour les performances concurrentes
- **Requêtes optimisées** avec jointures efficaces

## Système d'Authentification

GEEMA implémente un système d'authentification complet et sécurisé :

**Fonctionnalités :**

- Inscription et connexion utilisateurs
- Hachage sécurisé des mots de passe
- Gestion des profils utilisateurs
- Sessions persistantes
- Mise à jour des mots de passe

**Sécurité :**

- Validation côté serveur de toutes les entrées
- Gestion des erreurs sans exposition de données sensibles
- Contraintes de base de données pour l'intégrité des données

## 📈 Fonctionnalités Avancées

### Export PDF

L'application génère des rapports PDF détaillés avec plusieurs formats :

**Types de rapports :**

1. **PDF Normal** : Vue complète avec toutes les semaines
2. **PDF Compact** : 2 semaines côte à côte pour économiser l'espace
3. **PDF Arabe** : Support RTL avec polices arabes intégrées

**Contenu des rapports :**

- Tableau de synthèse (ferme, bâtiment, personnel, poussins)
- Données hebdomadaires complètes
- Tableau des résultats finaux
- Calculs automatiques (facteur de conversion, mortalité)

### Gestion des Maladies

Système intégré de suivi sanitaire :

**Fonctionnalités :**

- Catalogue des maladies
- Association maladies-bâtiments
- Application en lot sur plusieurs bâtiments
- Historique des problèmes sanitaires

### Suivi de l'Alimentation

Gestion complète de la nutrition :

**Caractéristiques :**

- Historique détaillé des consommations
- Calculs des contours d'alimentation
- Suivi des quantités par jour et totales
- Export des données pour analyse

## Interface Utilisateur

### Design System

GEEMA utilise shadcn/ui comme fondation avec Tailwind CSS :

**Composants principaux :**

- **Tableaux interactifs** avec édition en ligne
- **Formulaires modaux** pour la création/modification
- **Navigation intuitive** entre les différentes sections
- **Thème sombre/clair** avec support des préférences système

### Expérience Utilisateur

**Fonctionnalités UX :**

- Édition en ligne avec validation en temps réel
- Navigation contextuelle entre fermes, bandes et bâtiments
- Notifications toast pour les actions utilisateur
- États de chargement et gestion d'erreurs

## Installation et Démarrage

### Prérequis Système

- **Node.js** 18+ avec npm
- **Rust** 1.70+ avec Cargo
- **Git** pour le clonage du repository

### Installation Rapide

```bash
# Cloner le projet
git clone https://github.com/idboussadel/technicien-app.git
cd geema

# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Build de production
npm run build:win-msi  # Windows
npm run build:mac      # macOS
npm run build:linux    # Linux
````

### Configuration de Développement

```bash
# Formatage du code
npm run format

# Vérification du formatage
npm run format:check

# Build Tauri
npm run tauri dev
```

## 🔧 Développement et Contribution

### Architecture du Code

**Structure du projet :**

```
src-tauri/           # Backend Rust
├── src/
│   ├── commands/    # Commandes Tauri
│   ├── models/      # Modèles de données
│   ├── repositories/# Couche d'accès aux données
│   ├── services/    # Logique métier
│   └── database/    # Gestion de la base de données

src/                 # Frontend React
├── components/      # Composants réutilisables
├── pages/          # Pages de l'application
├── hooks/          # Hooks React personnalisés
└── types/          # Définitions TypeScript
```

### Standards de Code

**Rust :**

- Formatage avec `cargo fmt`
- Linting avec `cargo clippy`
- Documentation rustdoc complète
- Gestion d'erreurs avec types personnalisés

**TypeScript/React :**

- ESLint avec règles strictes
- Prettier pour le formatage
- TypeScript strict mode
- JSDoc pour tous les composants

### Tests et Qualité

- Tests unitaires pour la logique métier Rust
- Tests de composants React
- Validation des schémas avec Zod
- Gestion d'erreurs robuste

## Cas d'Usage Réels

### Workflow Typique d'Élevage

1. **Création de la ferme** avec nom et affectation du personnel
2. **Création d'une bande** avec date d'entrée et paramètres initiaux
3. **Configuration des bâtiments** avec affectation des poussins et personnel
4. **Suivi hebdomadaire** avec saisie quotidienne des données
5. **Gestion des soins** et traitements selon les besoins
6. **Analyse des performances** via les tableaux de bord
7. **Export des rapports** pour la documentation et l'analyse

### Gestion des Données

**Exemple de saisie quotidienne :**

- Jour 1 : 40 poussins, 40 kg alimentation, traitement "Roxassin 5L"
- Jour 2 : 30 décès, 40 kg alimentation, total cumulatif calculé automatiquement
- Semaine 1 : Poids moyen de 45g enregistré
- Progression séquentielle validée automatiquement

## Performance et Scalabilité

### Optimisations Implémentées

- **Index de base de données** sur toutes les colonnes de recherche
- **Pool de connexions** pour éviter les verrous
- **Requêtes optimisées** avec jointures efficaces
- **Mise en cache** des données fréquemment accédées

### Gestion de la Croissance

L'application est conçue pour gérer des années de données sans perte de performance :

- **Archivage automatique** des anciennes données
- **Pagination côté serveur** pour les grandes listes
- **Filtrage et recherche** optimisés
- **Export des données** pour libérer l'espace

**GEEMA** représente l'avenir de la gestion d'élevage avicole, combinant la puissance de Rust, la flexibilité de React, et la simplicité de SQLite pour offrir une solution complète et performante. L'application démontre qu'il est possible de créer des outils professionnels de gestion agricole avec des technologies modernes, tout en maintenant la simplicité d'utilisation et la performance à long terme.

_Développé avec ❤️ pour la communauté agricole_
