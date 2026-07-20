# Chess Tournament Manager

A static GitHub Pages-ready chess tournament manager.

## Features

- Local browser storage by default
- Player registration
- Swiss-style pairings
- Result entry
- Live leaderboard
- Import and export JSON
- Projector mode
- Optional public hosting through Firebase Realtime Database

## GitHub Pages

Deploy the contents of this folder directly to GitHub Pages.

Recommended repository layout:

```text
/
├── index.html
├── style.css
├── script.js
├── .nojekyll
├── js/
├── data/
└── assets/
```

GitHub Pages settings:

1. Push this folder to a GitHub repository.
2. Open repository Settings.
3. Go to Pages.
4. Set source to `Deploy from a branch`.
5. Choose the branch and root folder.
6. Save.

## Public Hosting

The app works locally without setup. To publish a shareable online tournament, open the app and use the `Optional public hosting` setup fields.

Firebase Realtime Database rules:

```json
{
  "rules": {
    "publicTournaments": {
      ".read": true,
      ".write": true
    }
  }
}
```

The generated viewer link includes the public Firebase web config, so viewers do not need to edit files.
