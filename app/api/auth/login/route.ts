import { NextRequest, NextResponse } from 'next/server';
import {
  PKCE_COOKIE,
  STATE_COOKIE,
  generatePkce,
  generateState,
  getAppOrigin,
  getFhirBase,
  getScope,
  getSmartEndpoints,
} from '../../../../lib/smart';

export async function GET(request: NextRequest) {
  const origin = getAppOrigin(request);

  // State/PKCE cookies must be set on the same origin the callback runs on.
  if (request.nextUrl.origin !== origin) {
    return NextResponse.redirect(`${origin}/api/auth/login`);
  }

  try {
    const fhirBase = getFhirBase();
    const clientId = process.env.NEXT_PUBLIC_CLIENT_ID;
    if (!clientId) throw new Error('NEXT_PUBLIC_CLIENT_ID is not set');

    const { authorizationEndpoint } = await getSmartEndpoints(fhirBase);
    const { verifier, challenge } = generatePkce();
    const state = generateState();

    const url = new URL(authorizationEndpoint);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', `${origin}/api/auth/callback`);
    url.searchParams.set('scope', getScope());
    url.searchParams.set('state', state);
    url.searchParams.set('aud', fhirBase);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');

    const response = NextResponse.redirect(url.toString());
    const cookieOpts = {
      httpOnly: true,
      secure: !origin.includes('localhost'),
      sameSite: 'lax' as const,
      path: '/api/auth',
      maxAge: 600,
    };
    response.cookies.set(STATE_COOKIE, state, cookieOpts);
    response.cookies.set(PKCE_COOKIE, verifier, cookieOpts);
    return response;
  } catch (error) {
    console.error('Failed to start sign-in:', (error as Error).message);
    return NextResponse.json({ error: 'Failed to start sign-in' }, { status: 500 });
  }
}
