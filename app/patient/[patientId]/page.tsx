"use client"; // Ensure this is a client component

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import '../../styles/PatientPage.css'; // Import the CSS file.
import { formatDate, observationCode, observationDate, observationValue, patientAddress, patientName } from '../../../lib/fhir-display';

const PatientPage = ({ params }: { params: { patientId: string } }) => {
  const [patientData, setPatientData] = useState<any>(null);
  const [observations, setObservations] = useState<any[]>([]); // Initialize as empty array
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check if running in the browser before trying to access window
  useEffect(() => {
    const accessToken = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('accessToken')
      : null;

    if (!accessToken) {
      console.error('Access token not found');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch patient data
        const patientResponse = await axios.get(`/api/patient/${params.patientId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        setPatientData(patientResponse.data);

        // Fetch observation data
        const observationResponse = await axios.get(`/api/observation/${params.patientId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        // Sort observations by effectiveDateTime in descending order
        const time = (e: any) => new Date(observationDate(e.resource) ?? 0).getTime() || 0;
        const sortedObservations = [...(observationResponse.data.entry ?? [])]
          .filter((e: any) => e.resource?.resourceType === 'Observation')
          .sort((a: any, b: any) => time(b) - time(a));

        setObservations(sortedObservations);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.patientId]);

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Patient Info</h1>
      </div>

      {patientData && (
        <div className="patient-info">
          <table>
            <tbody>
              <tr>
                <td><strong>Name:</strong></td>
                <td>{patientName(patientData)}</td>
              </tr>
              <tr>
                <td><strong>ID:</strong></td>
                <td>{patientData.id}</td>
              </tr>
              <tr>
                <td><strong>Date of Birth:</strong></td>
                <td>{patientData.birthDate || 'N/A'}</td>
              </tr>
              <tr>
                <td><strong>Address:</strong></td>
                <td>{patientAddress(patientData)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="header">
        <h1>Observations</h1>
      </div>

      {observations && observations.length > 0 ? (
        <div>
          <table className="observations-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Value</th>
                <th>Unit</th>
                <th>DateTime</th>
              </tr>
            </thead>
            <tbody>
              {observations.map((observation: any, index: number) => {
                const { value, unit } = observationValue(observation.resource);
                return (
                  <tr key={observation.resource.id ?? index}>
                    <td>{observationCode(observation.resource)}</td>
                    <td>{value}</td>
                    <td>{unit || 'N/A'}</td>
                    <td>{formatDate(observationDate(observation.resource))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No observations found for this patient.</p>
      )}
    </div>
  );
};

export default PatientPage;

