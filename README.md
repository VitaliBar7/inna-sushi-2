This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js deployment](https://nextjs.org/docs/app/building-your-application/deploying) — `next build` ואז `next start` על כל שרת Node, או Docker / ספק אירוח אחר לפי בחירתך.

## Environment

Set variables in `.env.local` (see Supabase and Resend setup in code comments).  
**`SUPABASE_SERVICE_ROLE_KEY`** must exist only on the **server** that runs the Next app (never in the browser).
