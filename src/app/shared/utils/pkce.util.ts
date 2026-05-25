// PKCE (Proof Key for Code Exchange) helpers for OAuth 2 public clients (SPA).
// Spec: https://datatracker.ietf.org/doc/html/rfc7636

const VERIFIER_BYTES = 48;

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const generateCodeVerifier = (): string => {
  const buf = new Uint8Array(VERIFIER_BYTES);
  crypto.getRandomValues(buf);
  return toBase64Url(buf);
};

export const computeCodeChallenge = async (verifier: string): Promise<string> => {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toBase64Url(new Uint8Array(digest));
};

export const generateState = (): string => {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return toBase64Url(buf);
};
