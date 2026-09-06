'use client';

import { colors, webCardStyle, webInputStyle } from '@eveider/config-ui';
import { Button, InlineAlert, TextField } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

type BillingFormProps = {
  paymentRule: 'merchant_pays' | 'customer_pays' | 'depends_on_order';
  billingType: 'pay_per_shipment' | 'monthly_invoice';
  payoutMethod: 'mobile_money_airtel' | 'mobile_money_orange' | 'mobile_money_mpesa' | 'bank_transfer';
  accountHolder: string;
  accountNumber: string;
  dailyShipments: number | null;
  codDailyLimitUsd: number | null;
};

const selectStyle = { ...webInputStyle, width: '100%', height: 44 };

export function BusinessBillingForm({
  paymentRule: initialRule,
  billingType: initialBillingType,
  payoutMethod: initialPayout,
  accountHolder: initialHolder,
  accountNumber: initialNumber,
  dailyShipments,
  codDailyLimitUsd,
}: BillingFormProps) {
  const router = useRouter();
  const [paymentRule, setPaymentRule] = useState(initialRule);
  const [billingType, setBillingType] = useState(initialBillingType);
  const [payoutMethod, setPayoutMethod] = useState(initialPayout);
  const [accountHolder, setAccountHolder] = useState(initialHolder);
  const [accountNumber, setAccountNumber] = useState(initialNumber);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const response = await fetch('/api/organisation/billing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentRule,
          billingType,
          payoutMethod,
          accountHolder,
          accountNumber,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? 'Enregistrement impossible');
        return;
      }
      setSuccess('Facturation enregistrée.');
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
        <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', fontWeight: 700 }}>Qui paie</h3>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <label>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 8 }}>
              Qui paie la livraison
            </span>
            <select
              value={paymentRule}
              onChange={(e) => setPaymentRule(e.target.value as BillingFormProps['paymentRule'])}
              style={selectStyle}
            >
              <option value="merchant_pays">L’entreprise</option>
              <option value="customer_pays">Le destinataire</option>
              <option value="depends_on_order">Selon la commande</option>
            </select>
          </label>
          <label>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 8 }}>
              Comment vous êtes facturé
            </span>
            <select
              value={billingType}
              onChange={(e) => setBillingType(e.target.value as BillingFormProps['billingType'])}
              style={selectStyle}
            >
              <option value="pay_per_shipment">À chaque colis</option>
              <option value="monthly_invoice">Facture mensuelle</option>
            </select>
          </label>
        </div>
        <p style={{ margin: '1rem 0 0', fontSize: '0.75rem', color: colors.textMuted }}>
          Ces règles s’appliquent aux nouveaux colis. Le détail des paiements à la livraison
          arrivera ici plus tard.
        </p>
      </section>

      <section style={{ ...webCardStyle, padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', fontWeight: 700 }}>
          Compte pour recevoir l’argent
        </h3>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <label>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 8 }}>
              Méthode
            </span>
            <select
              value={payoutMethod}
              onChange={(e) => setPayoutMethod(e.target.value as BillingFormProps['payoutMethod'])}
              style={selectStyle}
            >
              <option value="mobile_money_airtel">Airtel Money</option>
              <option value="mobile_money_orange">Orange Money</option>
              <option value="mobile_money_mpesa">M-Pesa</option>
              <option value="bank_transfer">Virement bancaire</option>
            </select>
          </label>
          <TextField
            label="Titulaire"
            name="accountHolder"
            value={accountHolder}
            onChange={(e) => setAccountHolder(e.target.value)}
            required
          />
          <TextField
            label="Numéro de compte / téléphone"
            name="accountNumber"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            required
          />
        </div>
      </section>

      <section style={{ ...webCardStyle, padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', fontWeight: 700 }}>Limites Eveider</h3>
        <dl style={{ margin: 0, display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, color: colors.textMuted }}>COLIS PAR JOUR</dt>
            <dd style={{ margin: '0.25rem 0 0', fontWeight: 600 }}>
              {dailyShipments == null ? 'Illimité' : `${dailyShipments} colis / jour`}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: '0.6875rem', fontWeight: 600, color: colors.textMuted }}>PAIEMENT À LA LIVRAISON — MAX / JOUR</dt>
            <dd style={{ margin: '0.25rem 0 0', fontWeight: 600 }}>
              {codDailyLimitUsd == null ? 'Illimité' : `$${codDailyLimitUsd} / jour`}
            </dd>
          </div>
        </dl>
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
