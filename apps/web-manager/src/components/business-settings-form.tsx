'use client';

import { webInputStyle } from '@eveider/config-ui';
import { Button, InlineAlert, TextField } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import {
  SettingsFieldGrid,
  SettingsForm,
  SettingsFormActions,
  SettingsFormSection,
  SettingsSelect,
} from '@/components/ops-ui';

type BusinessSettingsFormProps = {
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
  { value: 'marketplace', label: 'Place de marché' },
  { value: 'enterprise_partner', label: 'Grande entreprise' },
];

export function BusinessSettingsForm(props: BusinessSettingsFormProps) {
  const router = useRouter();
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
    <SettingsForm onSubmit={(event) => void handleSubmit(event)}>
      <SettingsFormSection
        title="Boutique"
        description="Nom commercial et coordonnées visibles pour votre équipe."
      >
        <SettingsFieldGrid>
          <TextField label="Nom commercial" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
          <SettingsSelect
            label="Type"
            name="businessType"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
          >
            {BUSINESS_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SettingsSelect>
          <TextField label="Secteur" name="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
          <TextField
            label="E-mail entreprise"
            name="contactEmail"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
          />
          <TextField
            label="Téléphone entreprise"
            name="contactPhone"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            required
          />
        </SettingsFieldGrid>
        <label className="ops-field" style={{ marginTop: '1rem' }}>
          <span className="ops-field-label">Description</span>
          <textarea
            name="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ ...webInputStyle, width: '100%', minHeight: 88, padding: '0.75rem', height: 'auto' }}
          />
        </label>
      </SettingsFormSection>

      <SettingsFormSection title="Adresse" description="Adresse principale de l’entreprise.">
        <SettingsFieldGrid>
          <TextField label="Pays" name="country" value={country} onChange={(e) => setCountry(e.target.value)} required />
          <TextField label="Ville" name="city" value={city} onChange={(e) => setCity(e.target.value)} required />
        </SettingsFieldGrid>
        <div style={{ marginTop: '1rem' }}>
          <TextField label="Adresse" name="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
        </div>
      </SettingsFormSection>

      <SettingsFormSection
        title="Papiers de l’entreprise"
        description="RCCM et NIF si vous êtes enregistré. Ces champs restent facultatifs."
      >
        <SettingsFieldGrid>
          <TextField
            label="Nom officiel (sur les papiers)"
            name="legalCompanyName"
            value={legalCompanyName}
            onChange={(e) => setLegalCompanyName(e.target.value)}
          />
          <TextField label="RCCM" name="rccmNumber" value={rccmNumber} onChange={(e) => setRccmNumber(e.target.value)} />
          <TextField label="NIF" name="nifNumber" value={nifNumber} onChange={(e) => setNifNumber(e.target.value)} />
          <TextField
            label="Nom du gérant"
            name="legalRepName"
            value={legalRepName}
            onChange={(e) => setLegalRepName(e.target.value)}
          />
        </SettingsFieldGrid>
      </SettingsFormSection>

      <SettingsFormSection
        title="Entrée dans le réseau"
        description="Méthode habituelle : Collecte Eveider, ou dépôt par votre équipe au casier."
      >
        <SettingsFieldGrid>
          <SettingsSelect
            label="Mode"
            name="pickupMethod"
            value={pickupMethod}
            onChange={(e) => setPickupMethod(e.target.value as 'courier_pickup' | 'merchant_dropoff')}
          >
            <option value="courier_pickup">Collecte Eveider</option>
            <option value="merchant_dropoff">Dépôt au casier</option>
          </SettingsSelect>
          <TextField
            label="Adresse d’enlèvement"
            name="pickupAddress"
            value={pickupAddress}
            onChange={(e) => setPickupAddress(e.target.value)}
          />
          <TextField
            label="Personne de contact"
            name="contactPerson"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
          />
          <TextField
            label="Téléphone enlèvement"
            name="pickupContactPhone"
            value={pickupContactPhone}
            onChange={(e) => setPickupContactPhone(e.target.value)}
          />
          <TextField
            label="Jours"
            name="availableDays"
            value={availableDays}
            onChange={(e) => setAvailableDays(e.target.value)}
          />
          <TextField
            label="Horaires"
            name="availableHours"
            value={availableHours}
            onChange={(e) => setAvailableHours(e.target.value)}
          />
        </SettingsFieldGrid>
        {pickupMethod === 'merchant_dropoff' && props.lockers.length > 0 ? (
          <div style={{ marginTop: '1rem' }}>
            <SettingsSelect
              label="Casier de dépôt habituel"
              name="dropoffLockerId"
              value={dropoffLockerId}
              onChange={(e) => setDropoffLockerId(e.target.value)}
            >
              <option value="">Aucun</option>
              {props.lockers.map((locker) => (
                <option key={locker.id} value={locker.id}>
                  {locker.name} — {locker.address}
                </option>
              ))}
            </SettingsSelect>
          </div>
        ) : null}
      </SettingsFormSection>

      {error ? <InlineAlert message={error} variant="error" /> : null}
      {success ? <InlineAlert message={success} variant="success" /> : null}

      <SettingsFormActions>
        <Button type="submit" variant="primary" loading={saving}>
          Enregistrer
        </Button>
      </SettingsFormActions>
    </SettingsForm>
  );
}
