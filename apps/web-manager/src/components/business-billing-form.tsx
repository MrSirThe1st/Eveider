'use client';

import { colors } from '@eveider/config-ui';
import { formatDeliveryFee, type ParcelChargeKind } from '@eveider/domain';
import { Button, InlineAlert, TextField } from '@eveider/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { getBusinessChargeLabel } from '@/lib/business-presentation';
import {
  SettingsFieldGrid,
  SettingsForm,
  SettingsFormActions,
  SettingsFormSection,
  SettingsSelect,
} from '@/components/ops-ui';

type OwedCharge = {
  id: string;
  kind: ParcelChargeKind;
  amount: number;
  currency: 'USD' | 'CDF';
  status: string;
};

type BillingFormProps = {
  paymentRule: 'merchant_pays' | 'customer_pays' | 'depends_on_order';
  billingType: 'pay_per_shipment' | 'monthly_invoice';
  payoutMethod: 'mobile_money_airtel' | 'mobile_money_orange' | 'mobile_money_mpesa' | 'bank_transfer';
  accountHolder: string;
  accountNumber: string;
  dailyShipments: number | null;
  pickupHoldHours: number;
  owedCharges: OwedCharge[];
};

export function BusinessBillingForm({
  paymentRule,
  billingType: initialBillingType,
  payoutMethod: initialPayout,
  accountHolder: initialHolder,
  accountNumber: initialNumber,
  dailyShipments,
  pickupHoldHours,
  owedCharges,
}: BillingFormProps) {
  const router = useRouter();
  const [billingType, setBillingType] = useState(initialBillingType);
  const [payoutMethod, setPayoutMethod] = useState(initialPayout);
  const [accountHolder, setAccountHolder] = useState(initialHolder);
  const [accountNumber, setAccountNumber] = useState(initialNumber);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const owedTotal = owedCharges.reduce((sum, charge) => sum + charge.amount, 0);
  const owedCurrency = owedCharges[0]?.currency ?? 'CDF';

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
    <SettingsForm onSubmit={(event) => void handleSubmit(event)}>
      <SettingsFormSection
        title="Ce que votre entreprise doit"
        description="Uniquement retours et stockage. Les frais de livraison et de retrait payés par le destinataire n’apparaissent pas ici."
      >
        <p style={{ margin: '0 0 1rem', fontSize: '1.35rem', fontWeight: 700, color: colors.secondary }}>
          {formatDeliveryFee(owedTotal, owedCurrency)}
        </p>
        {owedCharges.length === 0 ? (
          <p className="ops-empty__description" style={{ margin: 0 }}>
            Aucun montant dû pour le moment.
          </p>
        ) : (
          <ul className="ops-rank-list">
            {owedCharges.map((charge) => (
              <li key={charge.id}>
                <span>
                  {getBusinessChargeLabel(charge.kind)}
                  {charge.status === 'pending' ? ' (en cours)' : ''}
                </span>
                <strong>{formatDeliveryFee(charge.amount, charge.currency)}</strong>
              </li>
            ))}
          </ul>
        )}
      </SettingsFormSection>

      <SettingsFormSection title="Stockage">
        <p style={{ margin: 0, fontSize: 14, color: colors.secondary }}>
          {pickupHoldHours} h incluses. Puis facturation par période de 24 h, à la charge de votre
          entreprise.
        </p>
      </SettingsFormSection>

      <SettingsFormSection title="Règlement Eveider" description="Comment Eveider vous facture les montants dus.">
        <SettingsSelect
          label="Comment vous êtes facturé"
          name="billingType"
          value={billingType}
          onChange={(e) => setBillingType(e.target.value as BillingFormProps['billingType'])}
        >
          <option value="pay_per_shipment">À chaque colis</option>
          <option value="monthly_invoice">Facture mensuelle</option>
        </SettingsSelect>
      </SettingsFormSection>

      <SettingsFormSection title="Compte de règlement">
        <SettingsFieldGrid>
          <SettingsSelect
            label="Méthode"
            name="payoutMethod"
            value={payoutMethod}
            onChange={(e) => setPayoutMethod(e.target.value as BillingFormProps['payoutMethod'])}
          >
            <option value="mobile_money_airtel">Airtel Money</option>
            <option value="mobile_money_orange">Orange Money</option>
            <option value="mobile_money_mpesa">M-Pesa</option>
            <option value="bank_transfer">Virement bancaire</option>
          </SettingsSelect>
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
        </SettingsFieldGrid>
      </SettingsFormSection>

      <SettingsFormSection
        title="Limites Eveider"
        description="Ces plafonds sont définis par Eveider et ne peuvent pas être modifiés ici."
      >
        <dl style={{ margin: 0 }}>
          <dt className="ops-field-label" style={{ color: colors.textMuted }}>
            Colis par jour
          </dt>
          <dd style={{ margin: '0.25rem 0 0', fontWeight: 600 }}>
            {dailyShipments == null ? 'Illimité' : `${dailyShipments} colis / jour`}
          </dd>
        </dl>
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
