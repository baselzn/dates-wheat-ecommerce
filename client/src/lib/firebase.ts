import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase only once across HMR reloads
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

// ─── reCAPTCHA Singleton ─────────────────────────────────────────────────────
// Firebase's invisible reCAPTCHA injects a hidden iframe into the container.
// Re-creating the verifier without fully clearing the old one causes
// "reCAPTCHA has already been rendered in this element".
//
// Strategy:
//   1. Keep ONE verifier instance per page lifecycle (module-level ref).
//   2. The container div lives in <body> (outside React tree) so React
//      re-renders never destroy/recreate it.
//   3. On "Resend", destroy the old container node entirely and create a
//      fresh one so Firebase sees a clean element.

let _verifier: RecaptchaVerifier | null = null;
const CONTAINER_ID = "firebase-recaptcha-container";

function ensureContainer(): HTMLElement {
  let el = document.getElementById(CONTAINER_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = CONTAINER_ID;
    el.style.display = "none";
    document.body.appendChild(el);
  }
  return el;
}

function resetContainer(): void {
  // Remove the old element completely so Firebase sees a fresh empty node
  const old = document.getElementById(CONTAINER_ID);
  if (old) old.remove();
  const el = document.createElement("div");
  el.id = CONTAINER_ID;
  el.style.display = "none";
  document.body.appendChild(el);
}

export function clearRecaptcha(): void {
  if (_verifier) {
    try {
      _verifier.clear();
    } catch {
      // Ignore errors during cleanup
    }
    _verifier = null;
  }
}

function createVerifier(): RecaptchaVerifier {
  ensureContainer();
  const verifier = new RecaptchaVerifier(auth, CONTAINER_ID, {
    size: "invisible",
    callback: () => {
      // reCAPTCHA solved — OTP will proceed
    },
    "expired-callback": () => {
      // Token expired — clear so next send creates a fresh one
      clearRecaptcha();
    },
  });
  return verifier;
}

/**
 * Step 1: Send OTP to phone number via Firebase.
 * Phone must include country code, e.g. "+97150XXXXXXX".
 *
 * Pass isResend=true when the user clicks "Resend" to fully reset the
 * reCAPTCHA widget and avoid the "already rendered" error.
 */
export async function sendFirebaseOtp(
  phone: string,
  isResend = false
): Promise<ConfirmationResult> {
  if (isResend || _verifier) {
    // Destroy old verifier + DOM node, then create fresh ones
    clearRecaptcha();
    resetContainer();
  }

  _verifier = createVerifier();

  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phone, _verifier);
    return confirmationResult;
  } catch (err) {
    // On failure, clear so the next attempt starts fresh
    clearRecaptcha();
    throw err;
  }
}

/**
 * Step 2: Verify OTP code and get Firebase ID token.
 */
export async function verifyFirebaseOtp(
  confirmationResult: ConfirmationResult,
  code: string
): Promise<string> {
  const credential = await confirmationResult.confirm(code);
  const idToken = await credential.user.getIdToken();
  return idToken;
}
