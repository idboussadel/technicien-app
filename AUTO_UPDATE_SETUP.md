# Configuration des Mises à Jour Automatiques

Ce guide vous explique comment configurer les mises à jour automatiques pour votre application Tauri avec GitHub Releases.

## 🚀 Fonctionnalités

- ✅ Vérification automatique des mises à jour au démarrage
- ✅ Notification en français quand une mise à jour est disponible
- ✅ Barre de progression pendant l'installation
- ✅ Redémarrage automatique après mise à jour
- ✅ Support multi-plateforme (Windows, macOS, Linux)

## 📋 Prérequis

1. **Repository GitHub** avec accès aux Actions
2. **Clés de signature** pour la sécurité des mises à jour
3. **Tauri CLI** installé globalement

## 🔑 Configuration des Clés de Signature

### 1. Générer une paire de clés

```bash
# Installer tauri-cli si pas déjà fait
cargo install tauri-cli

# Générer une nouvelle paire de clés
cargo tauri signer generate -w ~/.tauri/geema.key
```

### 2. Extraire la clé publique

```bash
cargo tauri signer generate -w ~/.tauri/geema.key
```

### 3. Configurer les GitHub Secrets

Vous devez ajouter vos clés de signature comme secrets GitHub pour que les Actions puissent signer les releases :

1. Allez dans votre repository GitHub
2. Cliquez sur **Settings** → **Secrets and variables** → **Actions**
3. Cliquez sur **New repository secret**
4. Ajoutez ces deux secrets :

   **Nom:** `TAURI_PRIVATE_KEY`
   **Valeur:** Le contenu de votre fichier `~/.tauri/geema.key`

   **Nom:** `TAURI_KEY_PASSWORD`
   **Valeur:** Le mot de passe de votre clé (si vous en avez défini un)

### 4. Mettre à jour tauri.conf.json

Remplacez `YOUR_PUBLIC_KEY_HERE` par votre clé publique dans `src-tauri/tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": ["https://api.github.com/repos/VOTRE_USERNAME/VOTRE_REPO/releases/latest"],
      "dialog": false,
      "pubkey": "VOTRE_CLE_PUBLIQUE_ICI"
    }
  }
}
```

## 🏗️ Configuration du Repository

### 1. Mettre à jour tauri.conf.json

Remplacez `YOUR_USERNAME` et `YOUR_REPO` par vos informations:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": ["https://api.github.com/repos/VOTRE_USERNAME/VOTRE_REPO/releases/latest"],
      "dialog": false,
      "pubkey": "VOTRE_CLE_PUBLIQUE"
    }
  }
}
```

### 2. Configurer les Actions GitHub

Le fichier `.github/workflows/release.yml` est déjà configuré. Il se déclenche automatiquement quand vous poussez un tag version.

## 📦 Processus de Release

### 1. Préparer une nouvelle version

```bash
# Mettre à jour la version dans package.json et Cargo.toml
npm version patch  # ou minor, major

# Créer et pousser un tag
git tag v1.0.1
git push origin v1.0.1
```

### 2. Build automatique

Les Actions GitHub se déclenchent automatiquement et:

- Construisent l'app pour toutes les plateformes
- Créent un release GitHub
- Attachent les fichiers d'installation

### 3. Mise à jour automatique

Les utilisateurs recevront automatiquement une notification de mise à jour disponible.

## 🔧 Configuration Locale

### Variables d'environnement

Créez un fichier `.env.local`:

```env
VITE_APP_VERSION=1.0.0
VITE_UPDATE_ENDPOINT=https://api.github.com/repos/VOTRE_USERNAME/VOTRE_REPO/releases/latest
```

### Test local

```bash
# Build de développement
npm run dev

# Build de production
npm run build

# Build Tauri
npm run tauri build
```

## 🚨 Dépannage

### Erreur de clé publique

```
Error: Invalid public key
```

**Solution:** Vérifiez que la clé publique dans `tauri.conf.json` correspond à celle générée.

### Erreur de connexion GitHub

```
Error: Failed to fetch update info
```

**Solution:** Vérifiez que l'endpoint GitHub est correct et accessible.

### Build échoue

```
Error: Build failed
```

**Solution:** Vérifiez que toutes les dépendances sont installées et que Rust est à jour.

## 📱 Interface Utilisateur

### Composants inclus

- **UpdateNotification**: Notification de mise à jour disponible
- **UpdateProgress**: Barre de progression pendant l'installation
- **AutoUpdateManager**: Gestionnaire principal des mises à jour

### Personnalisation

Vous pouvez personnaliser l'apparence en modifiant:

- Les couleurs dans `UpdateNotification.tsx`
- Le style de la barre de progression dans `UpdateProgress.tsx`
- Les messages en français dans tous les composants

## 🔒 Sécurité

- Les mises à jour sont signées avec votre clé privée
- Seules les mises à jour signées sont acceptées
- Vérification automatique de l'intégrité des fichiers

## 📚 Ressources

- [Documentation Tauri Updater](https://tauri.app/v2/guides/distribution/updater/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Tauri CLI](https://tauri.app/v2/cli/)

## 🤝 Support

Si vous rencontrez des problèmes:

1. Vérifiez les logs de l'application
2. Consultez la documentation Tauri
3. Vérifiez que toutes les étapes de configuration sont suivies

---

**Note:** N'oubliez pas de garder votre clé privée en sécurité et de ne jamais la commiter dans le repository!
