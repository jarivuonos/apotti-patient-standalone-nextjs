"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import './styles/HomePage.css'; // Assuming you have a CSS file for styles

export default function HomePage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('accessToken');
    const patientId = urlParams.get('patientId');

    if (accessToken && patientId) {
      setAccessToken(accessToken);
      setPatientId(patientId);
    }
  }, []);

  const handleSignIn = () => {
    let origin = process.env.NEXT_PUBLIC_APP_URL;
    if (!origin && typeof window !== 'undefined') {
      const currentOrigin = window.location.origin;
      if (currentOrigin.includes('localhost')) {
        origin = currentOrigin;
      } else {
        origin = 'https://apotti-patient-standalone-nextjs.vercel.app';
      }
    }
    if (!origin) origin = 'http://localhost:3000';

    const redirectUri = encodeURIComponent(`${origin}/api/auth/callback`);
    const authorizeUrl = `${process.env.NEXT_PUBLIC_FHIR_SERVER_A}/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_CLIENT_ID}&redirect_uri=${redirectUri}&scope=openid%20profile%20patient.read`;
    window.location.href = authorizeUrl;
  };

  return (
    <div className="container">
      {/* Image on top of the welcome screen */}
      <div className="image-container">
        <Image src="/apottilabs.png" alt="Apotti Labs Logo" width={200} height={100} />
      </div>

      <h1>Welcome to the Apotti Patient Standalone App</h1>
      <button className="sign-in-button" onClick={handleSignIn}>Sign In</button>

      {accessToken && patientId && (
        <div>
          <h2>Patient ID: {patientId}</h2>
          <Link href={`patient/${patientId}?accessToken=${accessToken}`}>
            View Patient Data
          </Link>
        </div>
      )}
    </div>
  );
}

