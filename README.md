<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/15J7Dmeu0d3Sr10BscYOB5eCqUx5dpmdD

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Configuration Expo (.env) recommandée

Crée un fichier `.env` à la racine avec :

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...

# IA Gemini (Expo client)
EXPO_PUBLIC_GEMINI_API_KEY=...

# Google OAuth
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
# Obligatoire si vous testez dans Expo Go
EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=...
```

Puis redémarre Expo en vidant le cache :

```bash
npx expo start -c
```

## Google Calendar : checklist pour une connexion fiable

1. Dans Google Cloud Console, active **Google Calendar API**.
2. Configure l'écran de consentement OAuth (en mode *Testing* ou *Production*).
3. Crée les OAuth Client IDs correspondants :
   - **Web client** (pour web),
   - **iOS client** (bundle id `com.deepflow.app`),
   - **Android client** (package `com.deepflow.app` + SHA-1/SHA-256),
   - **Expo client** si test dans Expo Go.
4. Mets chaque client ID dans la variable `.env` correspondante.
5. Ajoute votre compte Google dans les testeurs OAuth si l'app est en mode *Testing*.
6. Relance l'app puis ouvre l'écran **Calendrier** et appuie sur l'icône Google.

> Note : sur Android/iOS, un client ID invalide (ou mauvais package/bundle/SHA) provoque une connexion refusée même si la clé est présente dans `.env`.
