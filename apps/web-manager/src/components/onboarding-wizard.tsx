'use client';

import type {
  BusinessInfoStepInput,
  LegalVerificationStepInput,
  OperationsSetupStepInput,
  PaymentSetupStepInput,
} from '@eveider/api-contracts';
import { colors, radius, webCardStyle, webInputStyle, webPrimaryButtonStyle, webSecondaryButtonStyle } from '@eveider/config-ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { OnboardingSummary } from '@/hooks/queries/use-onboarding-summary-query';
import { WEB_ROUTES } from '@/lib/auth-routing';

type StepNumber = 1 | 2 | 3 | 4 | 5;
type BusinessType = NonNullable<BusinessInfoStepInput['businessType']>;
type DeliveryPaymentRule = PaymentSetupStepInput['paymentRule'];
type SettlementMethod = PaymentSetupStepInput['payoutMethod'];
type OnboardingStepPayload =
  | BusinessInfoStepInput
  | LegalVerificationStepInput
  | OperationsSetupStepInput
  | PaymentSetupStepInput;
type OnboardingLocation = OnboardingSummary['locations'][number];
type OnboardingDocument = OnboardingSummary['documents'][number];

interface OnboardingWizardProps {
  initialSummary?: OnboardingSummary;
  availableLockers?: Array<{ id: string; name: string; address: string; code: string }>;
}

export function OnboardingWizard({ initialSummary, availableLockers = [] }: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedAccuracy, setConfirmedAccuracy] = useState(false);
  const [businessStatus, setBusinessStatus] = useState<string>(initialSummary?.status ?? 'onboarding');

  // STEP 1 — Business Info
  const [name, setName] = useState(initialSummary?.name ?? '');
  const [businessType, setBusinessType] = useState<BusinessType>(
    (initialSummary?.businessType as BusinessType | null) ?? 'registered_company',
  );
  const [industry, setIndustry] = useState(initialSummary?.industry ?? 'Fashion');
  const [salesChannels, setSalesChannels] = useState<string[]>(initialSummary?.salesChannels ?? ['Physical store']);
  const [description, setDescription] = useState(initialSummary?.description ?? '');
  const [country, setCountry] = useState('RDC');
  const [city, setCity] = useState('Kinshasa');
  const [address, setAddress] = useState(
    initialSummary?.locations?.find((l: OnboardingLocation) => l.type === 'business_address')?.street ?? '',
  );

  // STEP 2 — Legal Verification
  const [isRegistered, setIsRegistered] = useState(
    initialSummary?.riskClassification === 'registered_business' || initialSummary?.businessType === 'registered_company',
  );
  // Path A
  const [legalCompanyName, setLegalCompanyName] = useState(initialSummary?.legalCompanyName ?? '');
  const [rccmNumber, setRccmNumber] = useState(initialSummary?.rccmNumber ?? '');
  const [nifNumber, setNifNumber] = useState(initialSummary?.nifNumber ?? '');
  const [dateCreated] = useState(
    initialSummary?.dateCreated ? new Date(initialSummary.dateCreated).toISOString().split('T')[0] : '',
  );
  const [legalRepName, setLegalRepName] = useState(initialSummary?.legalRepName ?? '');
  // Path B
  const [individualFullName, setIndividualFullName] = useState(initialSummary?.individualFullName ?? '');
  const [idPassportNumber, setIdPassportNumber] = useState(initialSummary?.idPassportNumber ?? '');
  const [residentialAddress, setResidentialAddress] = useState(initialSummary?.residentialAddress ?? '');

  // Documents (file URL mocks)
  const [rccmUrl, setRccmUrl] = useState(
    initialSummary?.documents?.find((d: OnboardingDocument) => d.type === 'rccm_certificate')?.fileUrl ?? 'https://eveider.cd/docs/rccm_sample.pdf',
  );
  const [nifUrl, setNifUrl] = useState(
    initialSummary?.documents?.find((d: OnboardingDocument) => d.type === 'nif_certificate')?.fileUrl ?? 'https://eveider.cd/docs/nif_sample.pdf',
  );
  const [legalRepIdUrl, setLegalRepIdUrl] = useState(
    initialSummary?.documents?.find((d: OnboardingDocument) => d.type === 'legal_rep_id')?.fileUrl ?? 'https://eveider.cd/docs/id_sample.pdf',
  );
  const [nationalIdUrl, setNationalIdUrl] = useState(
    initialSummary?.documents?.find((d: OnboardingDocument) => d.type === 'national_id')?.fileUrl ?? 'https://eveider.cd/docs/national_id_sample.pdf',
  );
  const [selfieUrl, setSelfieUrl] = useState(
    initialSummary?.documents?.find((d: OnboardingDocument) => d.type === 'selfie')?.fileUrl ?? 'https://eveider.cd/docs/selfie_sample.jpg',
  );

  // STEP 3 — Operations
  const [pickupMethod, setPickupMethod] = useState<'courier_pickup' | 'merchant_dropoff'>(() => {
    const method = initialSummary?.locations?.find((l) => l.type === 'pickup_point')?.pickupMethod;
    return method === 'merchant_dropoff' ? 'merchant_dropoff' : 'courier_pickup';
  });
  const [pickupAddress, setPickupAddress] = useState(
    initialSummary?.locations?.find((l: OnboardingLocation) => l.type === 'pickup_point')?.street ?? '',
  );
  const [contactPerson, setContactPerson] = useState(
    initialSummary?.locations?.find((l: OnboardingLocation) => l.type === 'pickup_point')?.contactPerson ?? '',
  );
  const [contactPhone, setContactPhone] = useState(
    initialSummary?.locations?.find((l: OnboardingLocation) => l.type === 'pickup_point')?.contactPhone ?? '',
  );
  const [availableDays, setAvailableDays] = useState('Lundi-Vendredi');
  const [availableHours, setAvailableHours] = useState('08:00 - 17:00');
  const [dropoffLockerId, setDropoffLockerId] = useState(
    initialSummary?.locations?.find((l: OnboardingLocation) => l.type === 'pickup_point')?.dropoffLockerId ?? availableLockers[0]?.id ?? '',
  );

  // STEP 4 — Payment & Billing
  const [paymentRule, setPaymentRule] = useState<DeliveryPaymentRule>(
    initialSummary?.billingAccount?.paymentRule ?? 'merchant_pays',
  );
  const [payoutMethod, setPayoutMethod] = useState<SettlementMethod>(
    initialSummary?.settlementAccount?.payoutMethod ?? 'mobile_money_orange',
  );
  const [accountHolder, setAccountHolder] = useState(initialSummary?.settlementAccount?.accountHolder ?? '');
  const [accountNumber, setAccountNumber] = useState(initialSummary?.settlementAccount?.accountNumber ?? '');
  const [billingType, setBillingType] = useState<'pay_per_shipment' | 'monthly_invoice'>(
    initialSummary?.billingAccount?.billingType ?? 'pay_per_shipment',
  );

  function toggleChannel(channel: string) {
    setSalesChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel],
    );
  }

  async function saveStep(step: StepNumber, payload: OnboardingStepPayload) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, payload }),
      });
      const result = await res.json();
      if (!result.success) {
        setError(result.error ?? `Erreur lors de la sauvegarde de l'étape ${step}`);
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError('Erreur réseau');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleNext(step: StepNumber) {
    if (step === 1) {
      if (!name || !address) {
        setError('Veuillez remplir le nom et l\'adresse entreprise.');
        return;
      }
      const ok = await saveStep(1, {
        name,
        businessType,
        industry,
        salesChannels,
        description,
        country,
        city,
        address,
      });
      if (ok) setCurrentStep(2);
    } else if (step === 2) {
      const documents: NonNullable<LegalVerificationStepInput['documents']> = isRegistered
        ? [
            { type: 'rccm_certificate', fileUrl: rccmUrl, fileName: 'rccm_cert.pdf' },
            { type: 'nif_certificate', fileUrl: nifUrl, fileName: 'nif_cert.pdf' },
            { type: 'legal_rep_id', fileUrl: legalRepIdUrl, fileName: 'id_card.pdf' },
          ]
        : [
            { type: 'national_id', fileUrl: nationalIdUrl, fileName: 'national_id.jpg' },
            { type: 'selfie', fileUrl: selfieUrl, fileName: 'selfie.jpg' },
          ];

      const ok = await saveStep(2, {
        isRegistered,
        legalCompanyName: isRegistered ? legalCompanyName : undefined,
        rccmNumber: isRegistered ? rccmNumber : undefined,
        nifNumber: isRegistered ? nifNumber : undefined,
        dateCreated: isRegistered ? dateCreated : undefined,
        legalRepName: isRegistered ? legalRepName : undefined,
        individualFullName: !isRegistered ? individualFullName : undefined,
        idPassportNumber: !isRegistered ? idPassportNumber : undefined,
        residentialAddress: !isRegistered ? residentialAddress : undefined,
        documents,
      });
      if (ok) setCurrentStep(3);
    } else if (step === 3) {
      const ok = await saveStep(3, {
        pickupMethod,
        pickupAddress: pickupMethod === 'courier_pickup' ? pickupAddress : undefined,
        contactPerson: pickupMethod === 'courier_pickup' ? contactPerson : undefined,
        contactPhone: pickupMethod === 'courier_pickup' ? contactPhone : undefined,
        availableDays: pickupMethod === 'courier_pickup' ? availableDays : undefined,
        availableHours: pickupMethod === 'courier_pickup' ? availableHours : undefined,
        dropoffLockerId: pickupMethod === 'merchant_dropoff' ? dropoffLockerId : undefined,
      });
      if (ok) setCurrentStep(4);
    } else if (step === 4) {
      if (!accountHolder || !accountNumber) {
        setError('Veuillez renseigner les détails du compte de règlement (COD).');
        return;
      }
      const ok = await saveStep(4, {
        paymentRule,
        payoutMethod,
        accountHolder,
        accountNumber,
        billingType,
      });
      if (ok) setCurrentStep(5);
    }
  }

  async function handleSubmitApplication() {
    if (!confirmedAccuracy) {
      setError('Veuillez confirmer l\'exactitude des informations transmises.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding/submit', { method: 'POST' });
      const result = await res.json();
      if (!result.success) {
        setError(result.error ?? 'Soumission échouée');
        return;
      }
      router.refresh();
      setBusinessStatus('pending_review');
    } catch {
      setError('Erreur réseau lors de la soumission.');
    } finally {
      setLoading(false);
    }
  }

  if (businessStatus === 'pending_review' || businessStatus === 'pending') {
    return (
      <div style={{ maxWidth: 640, margin: '3rem auto', padding: '0 1rem' }}>
        <div style={{ ...webCardStyle, padding: '2.5rem', textAlign: 'center', borderRadius: radius.card }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', margin: '0 auto 1.5rem', fontWeight: 800 }}>
            ⏳
          </div>
          <span style={{ background: '#FFFBEB', color: '#B45309', border: '1px solid #FCD34D', padding: '0.25rem 0.75rem', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.1em' }}>
            DOSSIER SOUMIS POUR REVUE
          </span>
          <h2 style={{ margin: '1rem 0 0.5rem', fontSize: '1.5rem', fontWeight: 800 }}>
            Votre demande est en cours de vérification.
          </h2>
          <p style={{ margin: '0 0 1.5rem', color: '#475569', lineHeight: 1.6, fontSize: '0.9375rem' }}>
            Notre équipe de conformité vérifie actuellement vos pièces d&apos;identité et coordonnées d&apos;exploitation.<br />
            <strong>Temps de traitement estimé : 24 à 48 heures.</strong>
          </p>
          <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', padding: '1rem', borderRadius: 8, fontSize: '0.8125rem', color: '#64748B', marginBottom: '2rem' }}>
            Pendant cette période, vous ne pouvez pas encore créer d&apos;expéditions. Vous recevrez une notification dès validation de votre compte.
          </div>
          <button
            type="button"
            onClick={() => router.push(WEB_ROUTES.businessDashboard)}
            style={{ ...webSecondaryButtonStyle, height: 44, padding: '0 1.5rem' }}
          >
            Accéder au tableau de bord (Lecture seule)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 840, margin: '2rem auto', padding: '0 1rem 4rem' }}>
      
      {/* Header & Steps Nav */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem', fontWeight: 800, color: colors.secondary }}>
          Configuration du compte Business
        </h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748B', fontWeight: 500 }}>
          Complétez les 5 étapes pour activer votre accès aux services logistiques Eveider.
        </p>

        {/* Progress Indicator */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { step: 1, title: '1. Business Info' },
            { step: 2, title: '2. Vérification Légale' },
            { step: 3, title: '3. Opérations' },
            { step: 4, title: '4. Paiements' },
            { step: 5, title: '5. Revue & Soumission' },
          ].map((item) => (
            <div
              key={item.step}
              onClick={() => {
                if (item.step < currentStep) setCurrentStep(item.step as StepNumber);
              }}
              style={{
                flex: 1,
                minWidth: 120,
                padding: '0.6rem 0.75rem',
                borderRadius: 8,
                background: currentStep === item.step ? '#121212' : currentStep > item.step ? '#F0FDF4' : '#F1F5F9',
                color: currentStep === item.step ? '#09D40B' : currentStep > item.step ? '#166534' : '#64748B',
                border: currentStep === item.step ? '2px solid #09D40B' : currentStep > item.step ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: item.step < currentStep ? 'pointer' : 'default',
              }}
            >
              {item.title}
            </div>
          ))}
        </div>
      </div>

      {businessStatus === 'pending_correction' ? (
        <div style={{ background: '#FFFBEB', border: '2px solid #F59E0B', color: '#92400E', padding: '1rem 1.25rem', borderRadius: 8, marginBottom: '1.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
          ⚠️ <strong>Demande de correction par l&apos;administration :</strong> Veuillez vérifier et re-soumettre vos documents ou informations avant validation final.
          {initialSummary?.verifications?.[0]?.reviewNotes ? (
            <p style={{ margin: '0.5rem 0 0', fontWeight: 500, fontSize: '0.8125rem' }}>
              Note admin : &quot;{initialSummary.verifications[0].reviewNotes}&quot;
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, marginBottom: '1.5rem' }}>
          ⚠️ {error}
        </div>
      ) : null}

      {/* STEP 1 */}
      {currentStep === 1 ? (
        <section style={{ ...webCardStyle, padding: '2rem', borderRadius: radius.card }}>
          <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', fontWeight: 700 }}>Tell us about your business</h2>
          
          <label style={{ display: 'block', marginBottom: '1.25rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Nom commercial (Business name) *</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kin Fashion"
              style={{ ...webInputStyle, marginTop: '0.35rem' }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <label style={{ display: 'block' }}>
              <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Type d&apos;entreprise (Business type) *</span>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                style={{ ...webInputStyle, marginTop: '0.35rem' }}
              >
                <option value="registered_company">Registered Company (Société)</option>
                <option value="individual_seller">Individual Seller (Vendeur individuel)</option>
                <option value="marketplace">Marketplace</option>
                <option value="enterprise_partner">Enterprise Partner</option>
              </select>
            </label>

            <label style={{ display: 'block' }}>
              <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Secteur (Industry) *</span>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                style={{ ...webInputStyle, marginTop: '0.35rem' }}
              >
                {['Fashion', 'Electronics', 'Beauty', 'Food', 'Pharmacy', 'Retail', 'Documents', 'Other'].map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.8125rem', display: 'block', marginBottom: '0.5rem' }}>
              Canaux de vente (Sales channels) * — Où vendez-vous ?
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
              {['Physical store', 'Website', 'Instagram', 'Facebook Marketplace', 'WhatsApp', 'Other'].map((ch) => (
                <label
                  key={ch}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    border: salesChannels.includes(ch) ? '2px solid #09D40B' : '1px solid #CBD5E1',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: salesChannels.includes(ch) ? 700 : 500,
                    background: salesChannels.includes(ch) ? '#F0FDF4' : '#FFFFFF',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={salesChannels.includes(ch)}
                    onChange={() => toggleChannel(ch)}
                  />
                  {ch}
                </label>
              ))}
            </div>
          </div>

          <label style={{ display: 'block', marginBottom: '1.25rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Description de l&apos;entreprise (Optionnel)</span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez vos produits et votre activité…"
              style={{ ...webInputStyle, marginTop: '0.35rem', fontFamily: 'inherit' }}
            />
          </label>

          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1E293B', display: 'block', marginBottom: '0.75rem' }}>
              Localisation du siège
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
              <label style={{ display: 'block' }}>
                <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Pays</span>
                <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} style={{ ...webInputStyle, marginTop: '0.35rem' }} />
              </label>
              <label style={{ display: 'block' }}>
                <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Ville</span>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} style={{ ...webInputStyle, marginTop: '0.35rem' }} />
              </label>
            </div>
            <label style={{ display: 'block' }}>
              <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Adresse complète *</span>
              <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Av. du 30 Juin, Gombe, Kinshasa" style={{ ...webInputStyle, marginTop: '0.35rem' }} />
            </label>
          </div>

          <button
            type="button"
            onClick={() => void handleNext(1)}
            disabled={loading}
            style={{ ...webPrimaryButtonStyle, marginTop: '2rem', width: '100%', height: 46 }}
          >
            {loading ? 'Sauvegarde…' : 'Enregistrer & Continuer →'}
          </button>
        </section>
      ) : null}

      {/* STEP 2 */}
      {currentStep === 2 ? (
        <section style={{ ...webCardStyle, padding: '2rem', borderRadius: radius.card }}>
          <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.25rem', fontWeight: 700 }}>Vérification Légale & Documents</h2>
          
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1.25rem', borderRadius: 8, marginBottom: '1.5rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
              Votre entreprise est-elle officiellement enregistrée ?
            </span>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setIsRegistered(true)}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  border: isRegistered ? '2px solid #09D40B' : '1px solid #CBD5E1',
                  background: isRegistered ? '#F0FDF4' : '#FFFFFF',
                  color: isRegistered ? '#166534' : '#475569',
                  cursor: 'pointer',
                }}
              >
                OUI (Entreprise Enregistrée / SARL)
              </button>
              <button
                type="button"
                onClick={() => setIsRegistered(false)}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  border: !isRegistered ? '2px solid #09D40B' : '1px solid #CBD5E1',
                  background: !isRegistered ? '#F0FDF4' : '#FFFFFF',
                  color: !isRegistered ? '#166534' : '#475569',
                  cursor: 'pointer',
                }}
              >
                NON (Vendeur Individuel / Informal Seller)
              </button>
            </div>
          </div>

          {isRegistered ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <label style={{ display: 'block' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Raison sociale légale *</span>
                  <input type="text" value={legalCompanyName} onChange={(e) => setLegalCompanyName(e.target.value)} placeholder="Kin Fashion SARL" style={{ ...webInputStyle, marginTop: '0.35rem' }} />
                </label>
                <label style={{ display: 'block' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Numéro RCCM *</span>
                  <input type="text" value={rccmNumber} onChange={(e) => setRccmNumber(e.target.value)} placeholder="CD/KIN/RCCM/24-B-0012" style={{ ...webInputStyle, marginTop: '0.35rem' }} />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <label style={{ display: 'block' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Numéro NIF *</span>
                  <input type="text" value={nifNumber} onChange={(e) => setNifNumber(e.target.value)} placeholder="A1234567Z" style={{ ...webInputStyle, marginTop: '0.35rem' }} />
                </label>
                <label style={{ display: 'block' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Représentant Légal *</span>
                  <input type="text" value={legalRepName} onChange={(e) => setLegalRepName(e.target.value)} placeholder="Nom du gérant" style={{ ...webInputStyle, marginTop: '0.35rem' }} />
                </label>
              </div>

              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: '0.75rem' }}>Upload des Documents</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ display: 'block', background: '#F8FAFC', padding: '0.75rem', borderRadius: 6, border: '1px border #E2E8F0' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>1. Certificat RCCM (Requis)</span>
                    <input type="text" value={rccmUrl} onChange={(e) => setRccmUrl(e.target.value)} style={{ ...webInputStyle, marginTop: '0.25rem', fontSize: '0.75rem' }} />
                  </label>
                  <label style={{ display: 'block', background: '#F8FAFC', padding: '0.75rem', borderRadius: 6, border: '1px border #E2E8F0' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>2. Certificat NIF (Requis)</span>
                    <input type="text" value={nifUrl} onChange={(e) => setNifUrl(e.target.value)} style={{ ...webInputStyle, marginTop: '0.25rem', fontSize: '0.75rem' }} />
                  </label>
                  <label style={{ display: 'block', background: '#F8FAFC', padding: '0.75rem', borderRadius: 6, border: '1px border #E2E8F0' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>3. Pièce d&apos;identité du gérant (Requis)</span>
                    <input type="text" value={legalRepIdUrl} onChange={(e) => setLegalRepIdUrl(e.target.value)} style={{ ...webInputStyle, marginTop: '0.25rem', fontSize: '0.75rem' }} />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <label style={{ display: 'block' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Nom complet légal *</span>
                  <input type="text" value={individualFullName} onChange={(e) => setIndividualFullName(e.target.value)} placeholder="Jean-Pierre Lumumba" style={{ ...webInputStyle, marginTop: '0.35rem' }} />
                </label>
                <label style={{ display: 'block' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Passeport ou ID National *</span>
                  <input type="text" value={idPassportNumber} onChange={(e) => setIdPassportNumber(e.target.value)} placeholder="ID123456789" style={{ ...webInputStyle, marginTop: '0.35rem' }} />
                </label>
              </div>

              <label style={{ display: 'block', marginBottom: '1.5rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Adresse résidentielle *</span>
                <input type="text" value={residentialAddress} onChange={(e) => setResidentialAddress(e.target.value)} placeholder="Av. Kasavubu, Bandalungwa" style={{ ...webInputStyle, marginTop: '0.35rem' }} />
              </label>

              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: '0.75rem' }}>Documents Vendeur Individuel</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ display: 'block', background: '#F8FAFC', padding: '0.75rem', borderRadius: 6 }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>1. Carte d&apos;identité nationale / Passeport</span>
                    <input type="text" value={nationalIdUrl} onChange={(e) => setNationalIdUrl(e.target.value)} style={{ ...webInputStyle, marginTop: '0.25rem', fontSize: '0.75rem' }} />
                  </label>
                  <label style={{ display: 'block', background: '#F8FAFC', padding: '0.75rem', borderRadius: 6 }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>2. Photo Selfie de vérification</span>
                    <input type="text" value={selfieUrl} onChange={(e) => setSelfieUrl(e.target.value)} style={{ ...webInputStyle, marginTop: '0.25rem', fontSize: '0.75rem' }} />
                  </label>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" onClick={() => setCurrentStep(1)} style={{ ...webSecondaryButtonStyle, flex: 1, height: 46 }}>← Retour</button>
            <button type="button" onClick={() => void handleNext(2)} disabled={loading} style={{ ...webPrimaryButtonStyle, flex: 2, height: 46 }}>
              {loading ? 'Sauvegarde…' : 'Enregistrer & Continuer →'}
            </button>
          </div>
        </section>
      ) : null}

      {/* STEP 3 */}
      {currentStep === 3 ? (
        <section style={{ ...webCardStyle, padding: '2rem', borderRadius: radius.card }}>
          <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.25rem', fontWeight: 700 }}>Logistics Operations Setup</h2>
          <p style={{ margin: '0 0 1.5rem', color: '#64748B', fontSize: '0.875rem' }}>
            Comment prévoyez-vous de nous transmettre vos colis ?
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div
              onClick={() => setPickupMethod('courier_pickup')}
              style={{
                padding: '1.25rem',
                border: pickupMethod === 'courier_pickup' ? '2px solid #09D40B' : '1px solid #CBD5E1',
                borderRadius: 8,
                cursor: 'pointer',
                background: pickupMethod === 'courier_pickup' ? '#F0FDF4' : '#FFFFFF',
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '0.9375rem' }}>1. Eveider Courier Pickup</h4>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#475569' }}>
                Un coursier Eveider vient récupérer vos colis directement à votre adresse ou entrepôt.
              </p>
            </div>

            <div
              onClick={() => setPickupMethod('merchant_dropoff')}
              style={{
                padding: '1.25rem',
                border: pickupMethod === 'merchant_dropoff' ? '2px solid #09D40B' : '1px solid #CBD5E1',
                borderRadius: 8,
                cursor: 'pointer',
                background: pickupMethod === 'merchant_dropoff' ? '#F0FDF4' : '#FFFFFF',
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '0.9375rem' }}>2. Merchant Drop-off</h4>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#475569' }}>
                Vous déposez vous-même vos colis dans une station casier ou un point relais Eveider.
              </p>
            </div>
          </div>

          {pickupMethod === 'courier_pickup' ? (
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1.25rem', borderRadius: 8 }}>
              <span style={{ fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: '1rem' }}>Adresse d&apos;enlèvement (Pickup Address)</span>
              <label style={{ display: 'block', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Adresse complète d&apos;enlèvement *</span>
                <input type="text" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} placeholder="Entrepôt Limete, 14ème Rue Industrielle" style={{ ...webInputStyle, marginTop: '0.35rem' }} />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <label style={{ display: 'block' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Personne de contact *</span>
                  <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Marc" style={{ ...webInputStyle, marginTop: '0.35rem' }} />
                </label>
                <label style={{ display: 'block' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Téléphone de contact *</span>
                  <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+243810000000" style={{ ...webInputStyle, marginTop: '0.35rem' }} />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label style={{ display: 'block' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Jours d&apos;ouverture</span>
                  <input type="text" value={availableDays} onChange={(e) => setAvailableDays(e.target.value)} placeholder="Lundi - Vendredi" style={{ ...webInputStyle, marginTop: '0.35rem' }} />
                </label>
                <label style={{ display: 'block' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Plage horaire d&apos;enlèvement</span>
                  <input type="text" value={availableHours} onChange={(e) => setAvailableHours(e.target.value)} placeholder="08:00 - 17:00" style={{ ...webInputStyle, marginTop: '0.35rem' }} />
                </label>
              </div>
            </div>
          ) : (
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1.25rem', borderRadius: 8 }}>
              <span style={{ fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: '0.75rem' }}>Choisissez votre station de dépôt préférentielle</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { id: 'point-gombe', label: '○ Eveider Point Gombe (Av. Kananga)' },
                  { id: 'point-limete', label: '○ Eveider Point Limete (Boulevard 30 Juin)' },
                  { id: 'locker-central', label: '○ Eveider Locker Central (Victoire)' },
                ].map((point) => (
                  <label
                    key={point.id}
                    style={{
                      padding: '0.75rem 1rem',
                      border: dropoffLockerId === point.id ? '2px solid #09D40B' : '1px solid #CBD5E1',
                      borderRadius: 6,
                      background: dropoffLockerId === point.id ? '#F0FDF4' : '#FFFFFF',
                      cursor: 'pointer',
                      fontWeight: dropoffLockerId === point.id ? 700 : 500,
                      fontSize: '0.8125rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <input
                      type="radio"
                      name="dropoffLocker"
                      value={point.id}
                      checked={dropoffLockerId === point.id}
                      onChange={() => setDropoffLockerId(point.id)}
                    />
                    {point.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" onClick={() => setCurrentStep(2)} style={{ ...webSecondaryButtonStyle, flex: 1, height: 46 }}>← Retour</button>
            <button type="button" onClick={() => void handleNext(3)} disabled={loading} style={{ ...webPrimaryButtonStyle, flex: 2, height: 46 }}>
              {loading ? 'Sauvegarde…' : 'Enregistrer & Continuer →'}
            </button>
          </div>
        </section>
      ) : null}

      {/* STEP 4 */}
      {currentStep === 4 ? (
        <section style={{ ...webCardStyle, padding: '2rem', borderRadius: radius.card }}>
          <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.25rem', fontWeight: 700 }}>Payment & Billing Setup</h2>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
              Qui paie les frais de livraison ? (Delivery Payment Rules)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem' }}>
              {[
                { value: 'merchant_pays', label: 'Merchant pays' },
                { value: 'customer_pays', label: 'Customer pays' },
                { value: 'depends_on_order', label: 'Depends on order' },
              ].map((rule) => (
                <button
                  type="button"
                  key={rule.value}
                  onClick={() => setPaymentRule(rule.value as DeliveryPaymentRule)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    border: paymentRule === rule.value ? '2px solid #09D40B' : '1px solid #CBD5E1',
                    background: paymentRule === rule.value ? '#F0FDF4' : '#FFFFFF',
                    color: paymentRule === rule.value ? '#166534' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {rule.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1.25rem', borderRadius: 8, marginBottom: '1.5rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: '0.75rem' }}>
              Compte de versement des fonds COD (Settlement Information)
            </span>
            
            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Mode de versement (Payout Method)</span>
              <select
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value as SettlementMethod)}
                style={{ ...webInputStyle, marginTop: '0.35rem' }}
              >
                <option value="mobile_money_orange">Orange Money</option>
                <option value="mobile_money_airtel">Airtel Money</option>
                <option value="mobile_money_mpesa">M-Pesa</option>
                <option value="bank_transfer">Virement Bancaire (Bank Transfer)</option>
              </select>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <label style={{ display: 'block' }}>
                <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Nom du titulaire du compte *</span>
                <input type="text" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="Kin Fashion SARL" style={{ ...webInputStyle, marginTop: '0.35rem' }} />
              </label>
              <label style={{ display: 'block' }}>
                <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Numéro de compte / téléphone *</span>
                <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="+243840000000" style={{ ...webInputStyle, marginTop: '0.35rem' }} />
              </label>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
              Mode de facturation (Billing Type)
            </span>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ flex: 1, padding: '0.75rem 1rem', border: billingType === 'pay_per_shipment' ? '2px solid #09D40B' : '1px solid #CBD5E1', borderRadius: 6, cursor: 'pointer', background: billingType === 'pay_per_shipment' ? '#F0FDF4' : '#FFFFFF' }}>
                <input type="radio" name="billingType" checked={billingType === 'pay_per_shipment'} onChange={() => setBillingType('pay_per_shipment')} />
                <span style={{ marginLeft: '0.5rem', fontWeight: 700, fontSize: '0.8125rem' }}>Paiement par expédition (Pay per shipment)</span>
              </label>
              <label style={{ flex: 1, padding: '0.75rem 1rem', border: billingType === 'monthly_invoice' ? '2px solid #09D40B' : '1px solid #CBD5E1', borderRadius: 6, cursor: 'pointer', background: billingType === 'monthly_invoice' ? '#F0FDF4' : '#FFFFFF' }}>
                <input type="radio" name="billingType" checked={billingType === 'monthly_invoice'} onChange={() => setBillingType('monthly_invoice')} />
                <span style={{ marginLeft: '0.5rem', fontWeight: 700, fontSize: '0.8125rem' }}>Facturation mensuelle (Entreprise approuvée uniquement)</span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" onClick={() => setCurrentStep(3)} style={{ ...webSecondaryButtonStyle, flex: 1, height: 46 }}>← Retour</button>
            <button type="button" onClick={() => void handleNext(4)} disabled={loading} style={{ ...webPrimaryButtonStyle, flex: 2, height: 46 }}>
              {loading ? 'Sauvegarde…' : 'Enregistrer & Continuer →'}
            </button>
          </div>
        </section>
      ) : null}

      {/* STEP 5 */}
      {currentStep === 5 ? (
        <section style={{ ...webCardStyle, padding: '2rem', borderRadius: radius.card }}>
          <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.25rem', fontWeight: 700 }}>Résumé & Confirmation de la demande</h2>
          
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1.25rem', borderRadius: 8, marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div><strong>Business Name :</strong> {name}</div>
            <div><strong>Type :</strong> {isRegistered ? 'Registered Company' : 'Individual Seller'}</div>
            <div><strong>Secteur :</strong> {industry}</div>
            <div><strong>Adresse :</strong> {address}, {city}</div>
            <div><strong>Mode d&apos;enlèvement :</strong> {pickupMethod === 'courier_pickup' ? `Courier Pickup (${pickupAddress})` : `Drop-off (${dropoffLockerId})`}</div>
            <div><strong>Paiement COD :</strong> {payoutMethod} — {accountHolder} ({accountNumber})</div>
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 8, cursor: 'pointer', marginBottom: '1.5rem' }}>
            <input
              type="checkbox"
              checked={confirmedAccuracy}
              onChange={(e) => setConfirmedAccuracy(e.target.checked)}
              style={{ marginTop: 2, accentColor: '#09D40B' }}
            />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#166534', lineHeight: 1.5 }}>
              Je confirme que l&apos;ensemble des informations et documents fournis sont exacts et conformes aux exigences d&apos;exploitation Eveider.
            </span>
          </label>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="button" onClick={() => setCurrentStep(4)} style={{ ...webSecondaryButtonStyle, flex: 1, height: 46 }}>← Modifier</button>
            <button
              type="button"
              onClick={() => void handleSubmitApplication()}
              disabled={loading || !confirmedAccuracy}
              style={{
                ...webPrimaryButtonStyle,
                flex: 2,
                height: 46,
                fontSize: '0.875rem',
                fontWeight: 800,
                opacity: loading || !confirmedAccuracy ? 0.6 : 1,
                cursor: loading || !confirmedAccuracy ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Soumission en cours…' : 'Soumettre le dossier (Submit Application)'}
            </button>
          </div>
        </section>
      ) : null}

    </div>
  );
}
