/* Helpers for showing FHIR resources that record the same data in different ways. */

const NA = 'N/A';

export function patientName(patient: any): string {
  const names: any[] = patient?.name ?? [];
  const n = names.find((x) => x.use === 'official') ?? names[0];
  if (!n) return NA;
  if (n.text) return n.text;
  const parts = [...(n.prefix ?? []), ...(n.given ?? []), n.family, ...(n.suffix ?? [])].filter(Boolean);
  return parts.length ? parts.join(' ') : NA;
}

export function patientAddress(patient: any): string {
  const a = patient?.address?.[0];
  if (!a) return NA;
  if (a.text) return a.text;
  const parts = [...(a.line ?? []), [a.postalCode, a.city].filter(Boolean).join(' '), a.country].filter(Boolean);
  return parts.length ? parts.join(', ') : NA;
}

export function observationDate(obs: any): string | undefined {
  return obs?.effectiveDateTime ?? obs?.effectivePeriod?.start ?? obs?.effectiveInstant ?? obs?.issued;
}

export function formatDate(value?: string): string {
  if (!value) return NA;
  const d = new Date(value);
  return isNaN(d.getTime()) ? NA : d.toLocaleString();
}

export function observationCode(obs: any): string {
  return obs?.code?.text || obs?.code?.coding?.find((c: any) => c.display)?.display || obs?.code?.coding?.[0]?.code || NA;
}

/** Returns the value and unit as display strings; handles the common value[x] types. */
export function observationValue(obs: any): { value: string; unit: string } {
  const q = obs?.valueQuantity;
  if (q && q.value !== undefined && q.value !== null) return { value: String(q.value), unit: q.unit ?? q.code ?? '' };
  if (obs?.valueString !== undefined) return { value: obs.valueString, unit: '' };
  if (obs?.valueInteger !== undefined) return { value: String(obs.valueInteger), unit: '' };
  if (obs?.valueBoolean !== undefined) return { value: String(obs.valueBoolean), unit: '' };
  const cc = obs?.valueCodeableConcept;
  if (cc) return { value: cc.text || cc.coding?.[0]?.display || cc.coding?.[0]?.code || NA, unit: '' };
  // Panels such as blood pressure keep their values in components.
  if (obs?.component?.length) {
    const parts = obs.component
      .map((c: any) => (c.valueQuantity?.value !== undefined ? c.valueQuantity.value : undefined))
      .filter((v: any) => v !== undefined);
    if (parts.length) return { value: parts.join('/'), unit: obs.component[0]?.valueQuantity?.unit ?? '' };
  }
  return { value: NA, unit: '' };
}
