import { createHash, randomBytes } from 'crypto';
import type { NextRequest } from 'next/server';

export interface SmartEndpoints {
  authorizationEndpoint: string;
  tokenEndpoint: string;
}

export const DEFAULT_SCOPE = 'launch/patient patient/*.read openid fhirUser';
//apotti
//export const SMART_SCOPE = 'openid profile patient.read';
export const PKCE_COOKIE = 'smart_pkce';
export const STATE_COOKIE = 'smart_state';

const CANONICAL_ORIGIN = 'https://apotti-patient-standalone-nextjs.vercel.app';
const cache = new Map<string, SmartEndpoints>();

export function getFhirBase(): string {
  const base = process.env.NEXT_PUBLIC_FHIR_SERVER;
  if (!base) throw new Error('NEXT_PUBLIC_FHIR_SERVER is not set');
  return base.replace(/\/+$/, '');
}

export function getScope(): string {
  return process.env.SMART_SCOPE || DEFAULT_SCOPE;
}

/** Origin the app is served from; used for the redirect_uri. */
export function getAppOrigin(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  const current = request.nextUrl.origin;
  return current.includes('localhost') ? current : CANONICAL_ORIGIN;
}

/**
 * Authorize/token endpoints from the server's SMART discovery document.
 * NEXT_PUBLIC_FHIR_SERVER_A / NEXT_PUBLIC_FHIR_SERVER_T (full URLs) override discovery.
 */
export async function getSmartEndpoints(fhirBase: string): Promise<SmartEndpoints> {
  const overrideAuth = process.env.NEXT_PUBLIC_FHIR_SERVER_A;
  const overrideToken = process.env.NEXT_PUBLIC_FHIR_SERVER_T;
  if (overrideAuth && overrideToken) {
    return { authorizationEndpoint: overrideAuth, tokenEndpoint: overrideToken };
  }

  const cached = cache.get(fhirBase);
  if (cached) return cached;

  const res = await fetch(`${fhirBase}/.well-known/smart-configuration`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`SMART discovery failed: HTTP ${res.status}`);
  const cfg = await res.json();
  if (!cfg.authorization_endpoint || !cfg.token_endpoint) {
    throw new Error('SMART discovery document lacks authorization_endpoint or token_endpoint');
  }
  const endpoints = {
    authorizationEndpoint: overrideAuth || cfg.authorization_endpoint,
    tokenEndpoint: overrideToken || cfg.token_endpoint,
  };
  cache.set(fhirBase, endpoints);
  return endpoints;
}

const b64url = (buf: Buffer) => buf.toString('base64url');

export function generatePkce() {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function generateState() {
  return b64url(randomBytes(16));
}
