'use client';

import { webInputStyle } from '@eveider/config-ui';
import {
  BUSINESS_INDUSTRY_LABELS,
  BUSINESS_INDUSTRY_OPTIONS,
  type BusinessIndustry,
} from '@eveider/domain';
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
import { PickupLocationsSection } from '@/components/pickup-locations-section';
import type { PickupLocationDto } from '@/lib/pickup-location-presenter';

type PickupMethod = 'courier_pickup' | 'merchant_dropoff';

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
  pickupMethod: PickupMethod;
  availableDays: string;
  availableHours: string;
  dropoffLockerId: string;
  lockers: Array<{ id: string; name: string; address: string }>;
  pickupLocations: PickupLocationDto[];
};

const BUSINESS_TYPES: Array<{ value: string; label: string }> = [
  { value: 'registered_company', label: 'Société enregistrée' },
  { value: 'individual_seller', label: 'Vendeur individuel' },
  { value: 'marketplace', label: 'Place de marché' },
  { value: 'enterprise_partner', label: 'Grande entreprise' },
];

const PICKUP_METHODS: Array<{
  value: PickupMethod;
  title: string;
  description: string;
}> = [
  {
    value: 'courier_pickup',
    title: 'Collecte par Eveider',
    description: 'Un chauffeur Eveider vient récupérer vos colis.',
  },
  {
    value: 'merchant_dropoff',
    title: 'Dépôt au casier',
    description: 'Votre équipe dépose directement les colis dans un casier Eveider.',
  },
];

function industryOptions(current: string): string[] {
  if (!current.trim()) return [...BUSINESS_INDUSTRY_OPTIONS];
  if ((BUSINESS_INDUSTRY_OPTIONS as readonly string[]).includes(current)) {
    return [...BUSINESS_INDUSTRY_OPTIONS];
  }
  return [current, ...BUSINESS_INDUSTRY_OPTIONS];
}

function industryLabel(value: string): string {
  if (value in BUSINESS_INDUSTRY_LABELS) {
    return BUSINESS_INDUSTRY_LABELS[value as BusinessIndustry];
  }
  return value;
}

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
  const [availableDays, setAvailableDays] = useState(props.availableDays);
  const [availableHours, setAvailableHours] = useState(props.availableHours);
  const [dropoffLockerId, setDropoffLockerId] = useState(props.dropoffLockerId);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isCourierPickup = pickupMethod === 'courier_pickup';

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
          availableDays: isCourierPickup ? availableDays : undefined,
          availableHours: isCourierPickup ? availableHours : undefined,
          dropoffLockerId: !isCourierPickup && dropoffLockerId ? dropoffLockerId : undefined,
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
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <SettingsForm onSubmit={(event) => void handleSubmit(event)}>
        <SettingsFormSection
          title="Informations"
          description="Identité et coordonnées de votre entreprise sur Eveider."
        >
          <SettingsFieldGrid columns={2}>
            <TextField
              label="Nom commercial"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <SettingsSelect
              label="Type d’entreprise"
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
            <SettingsSelect
              label="Secteur d’activité"
              name="industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            >
              {industry.trim() ? null : <option value="">Choisir un secteur</option>}
              {industryOptions(industry).map((option) => (
                <option key={option} value={option}>
                  {industryLabel(option)}
                </option>
              ))}
            </SettingsSelect>
            <TextField
              label="Email"
              name="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
            />
            <TextField
              label="Téléphone"
              name="contactPhone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              required
            />
          </SettingsFieldGrid>
          <label className="ops-field">
            <span className="ops-field-label">Description</span>
            <textarea
              name="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez brièvement votre activité…"
              style={{ ...webInputStyle, width: '100%', minHeight: 88, padding: '0.75rem', height: 'auto' }}
            />
          </label>
        </SettingsFormSection>
      </SettingsForm>

      <PickupLocationsSection
        locations={props.pickupLocations}
        defaultCountry={country}
        defaultCity={city}
      />

      <SettingsForm onSubmit={(event) => void handleSubmit(event)}>
        <SettingsFormSection title="Adresse" description="Adresse principale de votre entreprise.">
          <SettingsFieldGrid columns={2}>
            <TextField
              label="Pays"
              name="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
            />
            <TextField
              label="Ville"
              name="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </SettingsFieldGrid>
          <TextField
            label="Adresse"
            name="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </SettingsFormSection>

        <SettingsFormSection
          title="Papiers de l’entreprise"
          badge="Facultatif"
          description="Utile si vous êtes une société enregistrée. La vérification Eveider reste optionnelle."
        >
          <SettingsFieldGrid columns={2}>
            <TextField
              label="Raison sociale"
              name="legalCompanyName"
              value={legalCompanyName}
              onChange={(e) => setLegalCompanyName(e.target.value)}
            />
            <TextField
              label="Nom du représentant légal"
              name="legalRepName"
              value={legalRepName}
              onChange={(e) => setLegalRepName(e.target.value)}
            />
            <TextField
              label="RCCM"
              name="rccmNumber"
              value={rccmNumber}
              onChange={(e) => setRccmNumber(e.target.value)}
            />
            <TextField
              label="NIF"
              name="nifNumber"
              value={nifNumber}
              onChange={(e) => setNifNumber(e.target.value)}
            />
          </SettingsFieldGrid>
        </SettingsFormSection>

        <SettingsFormSection
          title="Logistique"
          description="Comment confiez-vous généralement vos colis à Eveider ?"
        >
          <div className="ops-choice-grid" role="radiogroup" aria-label="Mode d’envoi habituel">
            {PICKUP_METHODS.map((method) => {
              const selected = pickupMethod === method.value;
              return (
                <button
                  key={method.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={selected ? 'ops-choice-card ops-choice-card--selected' : 'ops-choice-card'}
                  onClick={() => setPickupMethod(method.value)}
                >
                  <span className="ops-choice-card__title">{method.title}</span>
                  <span className="ops-choice-card__description">{method.description}</span>
                </button>
              );
            })}
          </div>

          {isCourierPickup ? (
            <SettingsFieldGrid columns={2}>
              <TextField
                label="Jours"
                name="availableDays"
                value={availableDays}
                onChange={(e) => setAvailableDays(e.target.value)}
                hint="Ex. Lun–Ven"
              />
              <TextField
                label="Horaires"
                name="availableHours"
                value={availableHours}
                onChange={(e) => setAvailableHours(e.target.value)}
                hint="Ex. 9h–17h"
              />
            </SettingsFieldGrid>
          ) : (
            <div>
              {props.lockers.length > 0 ? (
                <SettingsSelect
                  label="Casier de dépôt habituel"
                  name="dropoffLockerId"
                  value={dropoffLockerId}
                  onChange={(e) => setDropoffLockerId(e.target.value)}
                >
                  <option value="">Choisir un casier</option>
                  {props.lockers.map((locker) => (
                    <option key={locker.id} value={locker.id}>
                      {locker.name} — {locker.address}
                    </option>
                  ))}
                </SettingsSelect>
              ) : (
                <p className="ops-form-section__description" style={{ margin: 0 }}>
                  Aucun casier disponible pour le moment. Vous pourrez en choisir un plus tard.
                </p>
              )}
            </div>
          )}
        </SettingsFormSection>

        {error ? <InlineAlert message={error} variant="error" /> : null}
        {success ? <InlineAlert message={success} variant="success" /> : null}

        <SettingsFormActions>
          <Button type="submit" variant="primary" loading={saving}>
            Enregistrer
          </Button>
        </SettingsFormActions>
      </SettingsForm>
    </div>
  );
}
