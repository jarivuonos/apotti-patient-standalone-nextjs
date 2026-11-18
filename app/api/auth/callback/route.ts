import axios, { AxiosError } from 'axios';
import qs from 'qs';
import { NextRequest, NextResponse } from 'next/server';
import { PKCE_COOKIE, STATE_COOKIE, getAppOrigin, getFhirBase, getSmartEndpoints } from '../../../../lib/smart';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const verifier = request.cookies.get(PKCE_COOKIE)?.value;

  if (!code) {
    return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
  }
  if (!state || !expectedState || state !== expectedState || !verifier) {
    return NextResponse.json({ error: 'Invalid or missing state' }, { status: 400 });
  }

  const origin = getAppOrigin(request);
  const clientId = process.env.NEXT_PUBLIC_CLIENT_ID;

  try {
    const { tokenEndpoint } = await getSmartEndpoints(getFhirBase());

    const tokenResponse = await axios.post(
      tokenEndpoint,
      qs.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${origin}/api/auth/callback`,
        client_id: clientId,
        code_verifier: verifier,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, patient } = tokenResponse.data;
    const response = NextResponse.redirect(`${origin}/patient/${patient}?accessToken=${access_token}`);
    response.cookies.delete(STATE_COOKIE);
    response.cookies.delete(PKCE_COOKIE);
    return response;
  } catch (error) {
    const axiosError = error as AxiosError;
    const statusCode = axiosError.response?.status || 500;
    const errorMessage = axiosError.response?.data || axiosError.message || 'Internal server error';

    console.error('Error exchanging authorization code for access token:', errorMessage);
    return NextResponse.json({ error: 'Failed to fetch token', details: errorMessage }, { status: statusCode });
  }
}
