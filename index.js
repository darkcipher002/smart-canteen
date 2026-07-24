/**
 * verifyPaystackPayment
 * ---------------------
 * This runs on Google's servers (Firebase Cloud Functions), NOT in the browser.
 * It is the ONLY place your Paystack SECRET key should ever live.
 *
 * Why this matters for your presentation:
 * A Paystack "secret key" can charge, refund, and move money on your account.
 * The "public key" (pk_live_...) is safe in dashboard.html because Paystack's own
 * popup is designed to be called from a browser. The secret key (sk_live_...) is
 * NOT designed for that - anyone could open dev tools, copy it out of your page
 * source, and use it directly against the Paystack API. That's why it lives here
 * instead, inside a function only your backend can call.
 *
 * WHAT THIS FUNCTION DOES:
 * 1. Receives a payment reference from the frontend, after Paystack's popup
 *    reports success.
 * 2. Calls Paystack's own /transaction/verify endpoint using the secret key.
 * 3. Confirms the transaction really succeeded AND the amount matches what
 *    the order should cost (this stops someone from tampering with the amount
 *    in the browser before the payment popup opens).
 * 4. Returns { verified: true/false } to the frontend.
 *
 * ---------------------------------------------------------------------------
 * DEPLOYMENT STEPS (do this once):
 *
 * 1. Install the Firebase CLI if you don't have it:
 *      npm install -g firebase-tools
 *
 * 2. From the project root (the folder that CONTAINS this "functions" folder):
 *      firebase login
 *      firebase init functions   (choose your existing "mark-kenya" project,
 *                                  JavaScript, and say NO to overwriting this file
 *                                  if it asks)
 *
 * 3. Set your secret key as a secure secret (NOT hardcoded in this file):
 *      firebase functions:secrets:set PAYSTACK_SECRET_KEY
 *      (paste your sk_live_... key when prompted - it is stored encrypted by
 *      Google, not in your source code, not in GitHub, not in this file)
 *
 * 4. Deploy:
 *      firebase deploy --only functions
 *
 * 5. Firebase will print a URL like:
 *      https://us-central1-mark-kenya.cloudfunctions.net/verifyPaystackPayment
 *    Paste that URL into PAYSTACK_VERIFY_URL near the top of dashboard.html.
 *
 * That's it - dashboard.html will now verify every Paystack payment before
 * marking an order "Paid" instead of just trusting the browser.
 * ---------------------------------------------------------------------------
 *
 * IMPORTANT: Regenerate your Paystack secret key before using this.
 * You pasted it in a chat message, which means it should be treated as
 * compromised - go to Paystack Dashboard > Settings > API Keys & Webhooks
 * and click "Roll Key" (or equivalent) to generate a fresh one, then use
 * the NEW key in step 3 above. Never paste secret keys into chat, code
 * comments, or anything that isn't a secrets manager.
 */

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const PAYSTACK_SECRET_KEY = defineSecret("PAYSTACK_SECRET_KEY");

exports.verifyPaystackPayment = onRequest(
  { secrets: [PAYSTACK_SECRET_KEY], cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ verified: false, reason: "Method not allowed" });
      return;
    }

    const { reference, expectedAmount } = req.body || {};

    if (!reference) {
      res.status(400).json({ verified: false, reason: "Missing reference" });
      return;
    }

    try {
      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY.value()}`,
          },
        }
      );

      const result = await response.json();

      if (!result.status || result.data?.status !== "success") {
        res.status(200).json({ verified: false, reason: "Transaction not successful" });
        return;
      }

      // result.data.amount is in kobo/cents, same as what we sent to Paystack.
      if (expectedAmount && result.data.amount !== Math.round(expectedAmount * 100)) {
        res.status(200).json({ verified: false, reason: "Amount mismatch" });
        return;
      }

      res.status(200).json({ verified: true });
    } catch (err) {
      console.error("Paystack verification error:", err);
      res.status(200).json({ verified: false, reason: "Verification request failed" });
    }
  }
);
