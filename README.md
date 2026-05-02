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
# Ne jamais coller la clé en dur dans le code (ex: services/ai.ts)

# Important: une seule ligne par variable (sans "\\n" littéral)
```

Puis redémarre Expo en vidant le cache :

```bash
npx expo start -c
```

## Dépannage IA Gemini (403 / clé compromise)

Si les logs affichent une erreur du type :

`Your API key was reported as leaked. Please use another API key.`

alors le problème ne vient pas d'Internet : la clé Gemini a été révoquée par Google.

1. Crée une nouvelle clé dans Google AI Studio / Google Cloud.
2. Mets à jour `.env` : `EXPO_PUBLIC_GEMINI_API_KEY=...`
3. Redémarre Expo avec cache vidé : `npx expo start -c`
4. (Recommandé) Restreins la clé (API + éventuellement IP/Android/iOS) pour éviter une nouvelle fuite.
