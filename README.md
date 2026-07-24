# Payment Verification Backend

## Why this folder exists

Your Paystack **public key** (`pk_live_...`) is safe to put in `dashboard.html` -
that's how Paystack's checkout popup is meant to be used from a browser.

Your Paystack **secret key** (`sk_live_...`) must never appear in `dashboard.html`,
in any file served to a browser, or in a public GitHub repo. It can move real
money, so anyone who can view page source can copy it and use it directly
against your Paystack account. That's why it lives here instead, inside a
Cloud Function that only runs on Google's servers.

## What it does

`index.js` exposes one function, `verifyPaystackPayment`, which:
1. Takes a payment `reference` from the frontend after the Paystack popup
   reports success.
2. Asks Paystack directly (server-to-server, using the secret key) whether
   that transaction really succeeded, and for how much.
3. Tells the frontend `{ verified: true }` or `{ verified: false }`.

This closes the gap where someone could otherwise fake a "successful payment"
message in their own browser without actually paying.

## Deploying it (one-time setup)

```bash
npm install -g firebase-tools
firebase login
firebase init functions   # pick your existing mark-kenya project
firebase functions:secrets:set PAYSTACK_SECRET_KEY   # paste your secret key here
firebase deploy --only functions
```

Firebase will print a URL. Paste it into `PAYSTACK_VERIFY_URL` near the top of
`dashboard.html`.

## Important: rotate your key

Because the secret key was shared in a chat message, treat it as compromised.
Before deploying, go to your Paystack Dashboard → Settings → API Keys &
Webhooks and generate a new secret key. Use the new one with
`firebase functions:secrets:set`, not the one that was pasted earlier.

## If you don't deploy this before your presentation

`dashboard.html` still works without it - Paystack payments will go through
and orders will still be created, just marked
`"Paid (Unverified - check admin panel)"` instead of `"Paid"`. That's a
perfectly fine fallback for a demo, and a good talking point in your CAT/exam
prep about defense-in-depth and separating trusted (server) from untrusted
(browser) code.
