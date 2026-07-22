import type { RegisterBusinessAccountInput } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import type { Business, User } from '@eveider/data-access';

const DEMO_OTP = '123456';
const OTP_TTL_MS = 15 * 60 * 1000;

export type RegisterBusinessAccountResult = {
  user: User;
  business: Pick<
    Business,
    'id' | 'name' | 'status' | 'contactPhone' | 'isPhoneVerified'
  >;
};

export async function registerBusinessAccount(
  authId: string,
  input: RegisterBusinessAccountInput,
): Promise<RegisterBusinessAccountResult> {
  const fullName = `${input.firstName} ${input.lastName}`.trim();
  const { businesses, users } = createRepositories();

  const business = await businesses.createForRegistration({
    name: `${fullName} Business`,
    contactEmail: input.email,
    contactPhone: input.phone,
    otpCode: DEMO_OTP,
    otpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  const user = await users.createBusinessProfile({
    authId,
    role: 'business',
    userRole: input.userRole,
    fullName,
    email: input.email,
    phone: input.phone,
    businessId: business.id,
  });

  return {
    user,
    business: {
      id: business.id,
      name: business.name,
      status: business.status,
      contactPhone: business.contactPhone,
      isPhoneVerified: business.isPhoneVerified,
    },
  };
}

export async function verifyBusinessPhoneOtp(
  authId: string,
  code: string,
): Promise<{ verified: true; businessId: string }> {
  const { users, businesses } = createRepositories();
  const linked = await users.findByAuthIdWithBusiness(authId);

  if (!linked?.user.businessId || !linked.business) {
    throw new Error('Profil entreprise introuvable');
  }

  const { business } = linked;
  if (code !== DEMO_OTP && business.otpCode && business.otpCode !== code) {
    throw new Error('Code de vérification incorrect');
  }

  await businesses.markPhoneVerified(linked.user.businessId);

  return { verified: true, businessId: linked.user.businessId };
}
