This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

### Environment variables

Copy `.env.example` to `.env.local` and fill in values. **Google Maps** uses the same API key as restaurant-hub:

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — for Maps JavaScript API and Places (address autocomplete, map picker, location discovery). Use the same key as in restaurant-hub's `.env.local` if you share that project.
- `NEXT_PUBLIC_APP_URL` — main platform URL (e.g. `https://yourplatform.com`). Required for custom domain support: middleware uses it to resolve tenant by host and to build "Admin login" links from tenant sites to the dashboard. See [docs/custom-domain-namecheap.md](docs/custom-domain-namecheap.md).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


in Ghana we have gigital address eg(AK-8834), this gives accurate location . can we use this?