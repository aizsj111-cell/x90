# X90

X90 is a mobile-first weight-loss check-in app built with Next.js for iPhone Safari and home-screen use.

## Local Run

```bash
npm install
npm run dev -- --hostname 0.0.0.0
```

## Production Run

```bash
npm run build
npm run start -- --hostname 0.0.0.0
```

## Deploy To Vercel

1. Create a new GitHub repository.
2. Upload this project folder to the repository.
3. Sign in to Vercel with GitHub.
4. Create a new Vercel project from the repository.
5. Keep the default Next.js settings and click `Deploy`.

## Data Storage

User data is stored in the browser's local storage on each device. Data does not sync across devices or users.
