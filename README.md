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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Email Features

### Manual Email Sending
- Click the email icon in the dashboard navigation bar
- A dialog will appear on the right side asking for the recipient email address
- Enter the email and click "Send Email" to send the attendance sheet

### Scheduled Email (3:30 PM IST Daily)
The app includes automatic email sending to `suckzhum@gmail.com`, `braj@thesolfactory.com`, and `pukhraj.lp@gmail.com` at 3:30 PM IST daily.

**Features:**
- Sends **Total Attendance PDF Report** (not CSV)
- Sends to both email addresses simultaneously
- Automatically prevents duplicate sends on the same day

**Setup Options:**

1. **Client-Side Check (Automatic)**: If the dashboard page is open, it will automatically check and send emails at 3:30 PM IST. However, this requires the page to be open.

2. **External Cron Service (Recommended)**: For reliable daily emails, set up an external cron service:
   - Use services like [cron-job.org](https://cron-job.org), [EasyCron](https://www.easycron.com), or [Vercel Cron](https://vercel.com/docs/cron-jobs) (if deployed on Vercel)
   - Schedule a GET request to: `https://your-domain.com/api/scheduled-email` at 3:30 PM IST (15:30 IST)
   - The API will automatically prevent duplicate sends on the same day

3. **Manual Trigger**: You can manually trigger the scheduled email:
   - GET: `https://your-domain.com/api/scheduled-email?force=true` (forces send even if already sent today)
   - POST: `POST /api/scheduled-email` with `{ "force": true }` in body

**Note**: The scheduled email feature prevents duplicate sends on the same day by tracking the last sent date in a local file (`.last-scheduled-email-sent`). The email includes a PDF attachment with the complete Total Attendance Report.