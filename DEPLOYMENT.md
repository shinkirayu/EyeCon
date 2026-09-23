# Deploying EyeCon

EyeCon is a static web app. Vite provides the local development server, while the production build copies the app's HTML, CSS, JavaScript, PWA manifest, and icon into `dist/`. Vercel is configured as the default host and deploys that folder.

## Local development

```sh
npm install
npm run dev
```

Run the pre-release checks with:

```sh
npm run quality
```

## First Vercel deployment

1. Import this repository into Vercel and select the `Other` framework preset.
2. Vercel will read `vercel.json`; it runs `npm run build` and publishes `dist/`.
3. Add the following repository secrets in GitHub: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`.
4. Merge to `main` for production; pull requests receive a preview URL when the Vercel secrets are present.

The Vercel workflows deliberately do nothing until those three secrets are added, so a fork or an unconfigured repository cannot publish the app accidentally.

## Release checklist

1. Run `npm run quality`.
2. Open the Vercel preview on desktop and a mobile device.
3. Confirm the first-run path, a mission submission, reward display, shop purchase, and PWA install prompt work as expected.
4. Merge the approved pull request into `main`.
