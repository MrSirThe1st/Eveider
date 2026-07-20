'use client';

import { colors, radius, spacing, borders, webCardStyle } from '@eveider/config-ui';
import type { CustomerParcelDto } from '@/lib/customer-parcel-presenter';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const PROVIDER_LABELS: Record<string, string> = {
  ORANGE_COD: 'Orange Money',
  AIRTEL_COD: 'Airtel Money',
  VODACOM_MPESA_COD: 'M-Pesa',
};

type PaymentProviders = {
  required: boolean;
  amount: string | null;
  currency: string | null;
  providers: string[];
};

export function GuestTrackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [reference, setReference] = useState(searchParams.get('ref') ?? '');
  const [phone, setPhone] = useState(searchParams.get('phone') ?? '');
  const [trackToken, setTrackToken] = useState<string | null>(null);
  const [parcel, setParcel] = useState<CustomerParcelDto | null>(null);
  const [providers, setProviders] = useState<PaymentProviders | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadProviders = useCallback(async () => {
    const res = await fetch('/api/track/payment-providers');
    const json = await res.json();
    if (json.success) {
      setProviders(json.data);
      if (json.data.providers?.[0]) {
        setSelectedProvider(json.data.providers[0]);
      }
    }
  }, []);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  useEffect(() => {
    const ref = searchParams.get('ref');
    const ph = searchParams.get('phone');
    if (ref && ph && !parcel && !loading) {
      void lookup(ref, ph);
    }
  }, []);

  async function lookup(refValue = reference, phoneValue = phone) {
    setLoading(true);
    setError(null);
    setMessage(null);
    setParcel(null);
    setTrackToken(null);

    try {
      const res = await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: refValue.trim(), phone: phoneValue.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? 'Colis introuvable');
        return;
      }
      setTrackToken(json.data.trackToken);
      setParcel(json.data.parcel);
      setPaymentPhone(phoneValue.trim());
      router.replace(
        `/suivi?ref=${encodeURIComponent(refValue.trim())}&phone=${encodeURIComponent(phoneValue.trim())}`,
      );
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  async function refreshParcel() {
    if (!trackToken) return;
    const res = await fetch(`/api/track/${encodeURIComponent(trackToken)}`);
    const json = await res.json();
    if (json.success) {
      setParcel(json.data.parcel);
    } else if (res.status === 401) {
      setTrackToken(null);
      setParcel(null);
      setError(json.error);
    }
  }

  async function pay() {
    if (!trackToken || !selectedProvider) return;
    setPaying(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/track/${encodeURIComponent(trackToken)}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          phoneNumber: paymentPhone.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? 'Paiement impossible');
        return;
      }
      setParcel(json.data.parcel);
      const status = json.data.payment?.status;
      if (status === 'completed') {
        setMessage('Paiement confirmé. Votre code PIN est affiché ci-dessous.');
      } else {
        setMessage('Paiement initié. Confirmez sur votre téléphone, puis actualisez.');
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setPaying(false);
    }
  }

  async function refreshPayment() {
    if (!trackToken) return;
    setPaying(true);
    setError(null);
    try {
      const res = await fetch(`/api/track/${encodeURIComponent(trackToken)}/payment`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? 'Impossible de rafraîchir');
        return;
      }
      setParcel(json.data.parcel);
      if (json.data.payment?.status === 'completed') {
        setMessage('Paiement confirmé. Votre code PIN est affiché ci-dessous.');
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setPaying(false);
    }
  }

  const needsPayment =
    parcel?.status === 'ready_for_pickup' &&
    parcel.pickupPayment?.required &&
    parcel.pickupPayment.status !== 'completed';
  const showPin = Boolean(parcel?.pickupPin);

  return (
    <div style={{ minHeight: '100vh', background: colors.background, display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          borderBottom: `2px solid ${colors.border}`,
          background: colors.surface,
          padding: '1rem 1.5rem',
        }}
      >
        <div
          style={{
            maxWidth: 640,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <Link href="/" style={{ textDecoration: 'none', color: colors.secondary, fontWeight: 700, letterSpacing: '0.12em' }}>
            EVEIDER
          </Link>
          <Link href="/" style={{ fontSize: '0.75rem', fontWeight: 700, color: colors.textMuted, textDecoration: 'none' }}>
            ACCUEIL
          </Link>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 640, width: '100%', margin: '0 auto', padding: '2rem 1.5rem 3rem' }}>
        <h1
          style={{
            margin: '0 0 0.5rem',
            fontSize: '1.5rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          SUIVRE MON COLIS
        </h1>
        <p style={{ margin: '0 0 1.75rem', fontWeight: 500, color: colors.textMuted, lineHeight: 1.5 }}>
          Aucun compte requis. Entrez la référence du colis et le numéro de téléphone du destinataire.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void lookup();
          }}
          style={{ ...webCardStyle, padding: '1.5rem', marginBottom: '1.5rem' }}
        >
          <label style={{ display: 'block', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em' }}>RÉFÉRENCE COLIS</span>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ex. PK-28473"
              required
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'block', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em' }}>TÉLÉPHONE DESTINATAIRE</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+243 …"
              required
              inputMode="tel"
              style={inputStyle}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="nb-btn nb-btn-primary"
            style={{ width: '100%', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'RECHERCHE…' : 'SUIVRE MON COLIS'}
          </button>
        </form>

        {error ? (
          <p style={{ color: colors.danger, fontWeight: 600, marginBottom: '1rem' }}>{error}</p>
        ) : null}
        {message ? (
          <p style={{ color: colors.secondary, fontWeight: 600, marginBottom: '1rem' }}>{message}</p>
        ) : null}

        {parcel ? (
          <section style={{ ...webCardStyle, padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', color: colors.textMuted }}>
                  RÉFÉRENCE
                </p>
                <p style={{ margin: '0.25rem 0 0', fontWeight: 700, fontSize: '1.125rem' }}>{parcel.reference}</p>
              </div>
              <span
                style={{
                  alignSelf: 'flex-start',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  padding: '0.35rem 0.65rem',
                  border: `2px solid ${colors.border}`,
                  borderRadius: radius.badge,
                  background: parcel.status === 'ready_for_pickup' ? colors.primary : colors.surface,
                }}
              >
                {parcel.statusLabel}
              </span>
            </div>

            <p style={{ margin: '0 0 0.5rem', fontWeight: 500, color: colors.textMuted }}>
              {parcel.businessName}
              {parcel.recipientName ? ` · ${parcel.recipientName}` : ''}
            </p>
            {parcel.locker ? (
              <p style={{ margin: '0 0 1rem', fontWeight: 600 }}>
                Casier : {parcel.locker.name}
                {parcel.compartmentLabel ? ` · Comp. ${parcel.compartmentLabel}` : ''}
              </p>
            ) : (
              <p style={{ margin: '0 0 1rem', fontWeight: 500, color: colors.textMuted }}>Casier non assigné</p>
            )}

            <button
              type="button"
              onClick={() => void refreshParcel()}
              className="nb-btn nb-btn-secondary"
              style={{ width: '100%', height: 44, fontSize: '0.75rem', marginBottom: '1.25rem' }}
            >
              ACTUALISER LE STATUT
            </button>

            {needsPayment ? (
              <div
                style={{
                  borderTop: `2px solid ${colors.border}`,
                  paddingTop: '1.25rem',
                  marginTop: '0.5rem',
                }}
              >
                <h2 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.06em' }}>
                  PAIEMENT RETRAIT
                </h2>
                <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: colors.textMuted, fontWeight: 500 }}>
                  Payez {providers?.amount ?? parcel.pickupPayment?.amount}{' '}
                  {providers?.currency ?? parcel.pickupPayment?.currency} pour révéler votre code PIN.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {(providers?.providers ?? []).map((provider) => (
                    <button
                      key={provider}
                      type="button"
                      onClick={() => setSelectedProvider(provider)}
                      style={{
                        textAlign: 'left',
                        padding: '0.875rem 1rem',
                        border: `2px solid ${colors.border}`,
                        borderRadius: radius.button,
                        background: selectedProvider === provider ? colors.background : colors.surface,
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        letterSpacing: '0.04em',
                        cursor: 'pointer',
                      }}
                    >
                      {PROVIDER_LABELS[provider] ?? provider}
                    </button>
                  ))}
                </div>
                <label style={{ display: 'block', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em' }}>
                    NUMÉRO MOBILE MONEY
                  </span>
                  <input
                    value={paymentPhone}
                    onChange={(e) => setPaymentPhone(e.target.value)}
                    style={inputStyle}
                  />
                </label>
                <button
                  type="button"
                  disabled={paying || !selectedProvider}
                  className="nb-btn nb-btn-primary"
                  style={{ width: '100%', marginBottom: '0.75rem', opacity: paying ? 0.7 : 1 }}
                  onClick={() => void pay()}
                >
                  {paying ? 'TRAITEMENT…' : 'PAYER ET RÉVÉLER LE PIN'}
                </button>
                <button
                  type="button"
                  disabled={paying}
                  className="nb-btn nb-btn-secondary"
                  style={{ width: '100%', height: 44, fontSize: '0.75rem' }}
                  onClick={() => void refreshPayment()}
                >
                  J&apos;AI CONFIRMÉ — ACTUALISER
                </button>
              </div>
            ) : null}

            {showPin ? (
              <div
                style={{
                  marginTop: '1.25rem',
                  borderTop: `2px solid ${colors.border}`,
                  paddingTop: '1.5rem',
                  textAlign: 'center',
                }}
              >
                <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.12em' }}>
                  CODE PIN DE RETRAIT
                </p>
                <p
                  style={{
                    margin: '1rem 0 0',
                    fontSize: '2.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.35em',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {parcel.pickupPin}
                </p>
                {parcel.compartmentLabel ? (
                  <p style={{ margin: '0.75rem 0 0', fontWeight: 700 }}>COMPARTIMENT {parcel.compartmentLabel}</p>
                ) : null}
                <p style={{ margin: '1rem 0 0', fontSize: '0.8125rem', color: colors.textMuted, fontWeight: 500 }}>
                  Saisissez ce code sur le casier pour ouvrir votre compartiment.
                </p>
              </div>
            ) : null}

            {parcel.status === 'ready_for_pickup' && !needsPayment && !showPin ? (
              <p style={{ marginTop: '1rem', fontWeight: 500, color: colors.textMuted }}>
                Code PIN en cours de génération. Actualisez dans un instant.
              </p>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: '0.5rem',
  height: spacing.buttonHeight,
  padding: '0 1rem',
  border: `${borders.width}px solid ${colors.border}`,
  borderRadius: radius.button,
  fontWeight: 500,
  fontSize: '1rem',
  boxSizing: 'border-box',
};
