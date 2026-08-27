'use client';

import { colors, webCardStyle, webInputStyle } from '@eveider/config-ui';
import { Button, InlineAlert, TextField } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

type BusinessSettingsFormProps = {
  fullName: string;
  loginEmail: string | null;
  accessCode: string | null;
  name: string;
  businessType: string;
  industry: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  country: string;
  city: string;
  address: string;
  legalCompanyName: string;
  rccmNumber: string;
  nifNumber: string;
  legalRepName: string;
  pickupMethod: 'courier_pickup' | 'merchant_dropoff';
  pickupAddress: string;
  contactPerson: string;
  pickupContactPhone: string;
  availableDays: string;
  availableHours: string;
  dropoffLockerId: string;
  lockers: Array<{ id: string; name: string; address: string }>;
};

const BUSINESS_TYPES: Array<{ value: string; label: string }> = [
  { value: 'registered_company', label: 'Société enregistrée' },
  { value: 'individual_seller', label: 'Vendeur individuel' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'enterprise_partner', label: 'Partenaire entreprise' },
];

const selectStyle = { ...webInputStyle, width: '100%', height: 44 };

export function BusinessSettingsForm(props: BusinessSettingsFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(props.fullName);
  const [name, setName] = useState(props.name);
  const [businessType, setBusinessType] = useState(props.businessType || 'registered_company');
  const [industry, setIndustry] = useState(props.industry);
  const [description, setDescription] = useState(props.description);
  const [contactEmail, setContactEmail] = useState(props.contactEmail);
  const [contactPhone, setContactPhone] = useState(props.contactPhone);
  const [country, setCountry] = useState(props.country || 'RDC');
  const [city, setCity] = useState(props.city || 'Kinshasa');
  const [address, setAddress] = useState(props.address);
  const [legalCompanyName, setLegalCompanyName] = useState(props.legalCompanyName);
  const [rccmNumber, setRccmNumber] = useState(props.rccmNumber);
  const [nifNumber, setNifNumber] = useState(props.nifNumber);
  const [legalRepName, setLegalRepName] = useState(props.legalRepName);
  const [pickupMethod, setPickupMethod] = useState(props.pickupMethod);
  const [pickupAddress, setPickupAddress] = useState(props.pickupAddress);
  const [contactPerson, setContactPerson] = useState(props.contactPerson);
  const [pickupContactPhone, setPickupContactPhone] = useState(props.pickupContactPhone);
  const [availableDays, setAvailableDays] = useState(props.availableDays);
  const [availableHours, setAvailableHours] = useState(props.availableHours);
  const [dropoffLockerId, setDropoffLockerId] = useState(props.dropoffLockerId);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const response = await fetch('/api/organisation/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          name,
          businessType,
          industry,
          description,
          contactEmail,
          contactPhone,
          country,
          city,
          address,
          legalCompanyName,
          rccmNumber,
          nifNumber,
          legalRepName,
          pickupMethod,
          pickupAddress,
          contactPerson,
          pickupContactPhone,
          availableDays,
          availableHours,
          dropoffLockerId: dropoffLockerId || undefined,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Enregistrement impossible');
        return;
      }
      setSuccess('Paramètres enregistrés.');
      router.refresh();
    } catch {
      setError('Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} style={{ display: 'grid', gap: '1.5rem' }}>
      <section style={{ ...webCardStyle, padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', fontWeight: 700 }}>Compte</h3>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <TextField label="Nom de l’utilisateur" name="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <TextField label="E-mail de connexion" name="loginEmail" value={props.loginEmail ?? ''} disabled />
          <TextField label="Code d’accès Eveider" name="accessCode" value={props.accessCode ?? '—'} disabled />
        </div>
      </section>

      <section style={{ ...webCardStyle, padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', fontWeight: 700 }}>Entreprise</h3>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <TextField label="Nom commercial" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
          <label>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 8 }}>Type</span>
            <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} style={selectStyle}>
              {BUSINESS_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <TextField label="Secteur" name="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
          <TextField label="E-mail entreprise" name="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
          <TextField label="Téléphone entreprise" name="contactPhone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} required />
        </div>
        <label style={{ display: 'block', marginTop: '1rem' }}>
          <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 8 }}>Description</span>
          <textarea
            name="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ ...webInputStyle, width: '100%', minHeight: 88, padding: '0.75rem' }}
          />
        </label>
      </section>

      <section style={{ ...webCardStyle, padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', fontWeight: 700 }}>Adresse</h3>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <TextField label="Pays" name="country" value={country} onChange={(e) => setCountry(e.target.value)} required />
          <TextField label="Ville" name="city" value={city} onChange={(e) => setCity(e.target.value)} required />
        </div>
        <div style={{ marginTop: '1rem' }}>
          <TextField label="Adresse" name="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
        </div>
      </section>

      <section style={{ ...webCardStyle, padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 700 }}>Informations légales</h3>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.75rem', color: colors.textMuted }}>
          Ces champs correspondent au dossier vérifié. Une modification n’ouvre pas un nouveau KYC automatiquement.
        </p>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <TextField label="Raison sociale" name="legalCompanyName" value={legalCompanyName} onChange={(e) => setLegalCompanyName(e.target.value)} />
          <TextField label="RCCM" name="rccmNumber" value={rccmNumber} onChange={(e) => setRccmNumber(e.target.value)} />
          <TextField label="NIF" name="nifNumber" value={nifNumber} onChange={(e) => setNifNumber(e.target.value)} />
          <TextField label="Représentant légal" name="legalRepName" value={legalRepName} onChange={(e) => setLegalRepName(e.target.value)} />
        </div>
      </section>

      <section style={{ ...webCardStyle, padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', fontWeight: 700 }}>Enlèvement</h3>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <label>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 8 }}>Mode</span>
            <select
              value={pickupMethod}
              onChange={(e) => setPickupMethod(e.target.value as 'courier_pickup' | 'merchant_dropoff')}
              style={selectStyle}
            >
              <option value="courier_pickup">Enlèvement par coursier</option>
              <option value="merchant_dropoff">Dépôt au point Eveider</option>
            </select>
          </label>
          <TextField label="Adresse d’enlèvement" name="pickupAddress" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} />
          <TextField label="Personne de contact" name="contactPerson" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
          <TextField label="Téléphone enlèvement" name="pickupContactPhone" value={pickupContactPhone} onChange={(e) => setPickupContactPhone(e.target.value)} />
          <TextField label="Jours" name="availableDays" value={availableDays} onChange={(e) => setAvailableDays(e.target.value)} />
          <TextField label="Horaires" name="availableHours" value={availableHours} onChange={(e) => setAvailableHours(e.target.value)} />
        </div>
        {pickupMethod === 'merchant_dropoff' && props.lockers.length > 0 ? (
          <label style={{ display: 'block', marginTop: '1rem' }}>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 8 }}>
              Point de dépôt habituel
            </span>
            <select value={dropoffLockerId} onChange={(e) => setDropoffLockerId(e.target.value)} style={selectStyle}>
              <option value="">Aucun</option>
              {props.lockers.map((locker) => (
                <option key={locker.id} value={locker.id}>
                  {locker.name} — {locker.address}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </section>

      {error ? <InlineAlert message={error} variant="error" /> : null}
      {success ? <InlineAlert message={success} variant="success" /> : null}

      <div>
        <Button type="submit" variant="primary" loading={saving}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
