import type { RegisterBusinessAccountInput, RegisterPlatformAdminInput } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import type { Business, User } from '@eveider/data-access';

const DEMO_OTP = '123456';

export type RegisterBusinessAccountResult = {
  user: User;
  business: Pick<
    Business,
    'id' | 'name' | 'status' | 'contactPhone' | 'isPhoneVerified'
  >;
  joinedExistingCompany: boolean;
};

export async function registerPlatformAdminAccount(
  authId: string,
  input: RegisterPlatformAdminInput,
): Promise<{ user: User }> {
  const { users, platformStaff } = createRepositories();
  const preview = await platformStaff.getPreview(input.adminInviteToken);
  if (!preview) {
    throw new Error('Invitation introuvable');
  }
  if (input.email.trim().toLowerCase() !== preview.email.trim().toLowerCase()) {
    throw new Error('Cette invitation est destinée à une autre adresse email');
  }

  let user = await users.findByAuthId(authId);
  if (!user) {
    user = await users.createProfile({
      authId,
      fullName: `${input.firstName} ${input.lastName}`.trim(),
      email: input.email,
      phone: input.phone,
    });
  }

  await platformStaff.acceptForUser({
    token: input.adminInviteToken,
    email: input.email,
    userId: user.id,
  });

  const refreshed = await users.findById(user.id);
  if (!refreshed) {
    throw new Error('Profil introuvable');
  }
  return { user: refreshed };
}

export async function registerBusinessAccount(
  authId: string,
  input: RegisterBusinessAccountInput,
): Promise<RegisterBusinessAccountResult> {
  const fullName = `${input.firstName} ${input.lastName}`.trim();
  const { businesses, users, teamInvites, memberships } = createRepositories();

  if (input.inviteToken) {
    const preview = await teamInvites.getPreview(input.inviteToken);
    if (!preview) {
      throw new Error('Invitation introuvable');
    }
    if (input.email.trim().toLowerCase() !== preview.email.trim().toLowerCase()) {
      throw new Error('Cette invitation est destinée à une autre adresse email');
    }

    let user = await users.findByAuthId(authId);
    if (!user) {
      user = await users.createProfile({
        authId,
        fullName,
        email: input.email,
        phone: input.phone,
      });
    }

    await teamInvites.acceptForUser({
      token: input.inviteToken,
      email: input.email,
      userId: user.id,
    });

    const business = await businesses.findByIdUnscoped(preview.businessId);
    if (!business) {
      throw new Error('Organisation introuvable');
    }

    return {
      user,
      business: {
        id: business.id,
        name: business.name,
        status: business.status,
        contactPhone: business.contactPhone,
        isPhoneVerified: business.isPhoneVerified,
      },
      joinedExistingCompany: true,
    };
  }

  const organizationName = input.organizationName?.trim();
  if (!organizationName) {
    throw new Error('Nom de l’entreprise requis');
  }

  const business = await businesses.createForRegistration({
    name: organizationName,
    contactEmail: input.email,
    contactPhone: input.phone,
    industry: input.industry,
  });

  const user = await users.createProfile({
    authId,
    fullName,
    email: input.email,
    phone: input.phone,
  });
  await memberships.upsert({
    userId: user.id,
    businessId: business.id,
    role: 'account_owner',
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
    joinedExistingCompany: false,
  };
}

export async function verifyBusinessPhoneOtp(
  authId: string,
  code: string,
): Promise<{ verified: true; businessId: string }> {
  const { users, businesses } = createRepositories();
  const linked = await users.findByAuthIdWithBusiness(authId);

  if (!linked?.business) {
    throw new Error('Profil entreprise introuvable');
  }

  const { business } = linked;
  if (code !== DEMO_OTP && business.otpCode && business.otpCode !== code) {
    throw new Error('Code de vérification incorrect');
  }

  await businesses.markPhoneVerified(business.id);

  return { verified: true, businessId: business.id };
}
