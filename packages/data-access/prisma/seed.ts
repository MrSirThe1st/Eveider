import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const KINSHASA_LOCKERS = [
  {
    code: 'KIN-001',
    name: 'EVEIDER GOMBE',
    address: 'Avenue du Commerce, Gombe, Kinshasa',
    latitude: -4.3052,
    longitude: 15.3089,
  },
  {
    code: 'KIN-002',
    name: 'EVEIDER LIMETE',
    address: 'Boulevard Lumumba, Limete, Kinshasa',
    latitude: -4.3381,
    longitude: 15.3123,
  },
  {
    code: 'KIN-003',
    name: 'EVEIDER NGALIEMA',
    address: 'UPN, Ngaliema, Kinshasa',
    latitude: -4.4012,
    longitude: 15.2298,
  },
] as const;

const COMPARTMENT_LABELS = ['A1', 'A2', 'B1'] as const;

async function main() {
  for (const locker of KINSHASA_LOCKERS) {
    const existing = await prisma.locker.findFirst({
      where: { name: locker.name },
    });

    const record =
      existing ??
      (await prisma.locker.create({
        data: {
          code: locker.code,
          name: locker.name,
          address: locker.address,
          latitude: locker.latitude,
          longitude: locker.longitude,
          status: 'active',
        },
      }));

    for (const label of COMPARTMENT_LABELS) {
      await prisma.compartment.upsert({
        where: {
          lockerId_label: { lockerId: record.id, label },
        },
        create: {
          lockerId: record.id,
          label,
          status: 'available',
        },
        update: {},
      });
    }
  }

  const lockerCount = await prisma.locker.count();
  const compartmentCount = await prisma.compartment.count();
  console.log(`Seed complete: ${lockerCount} lockers, ${compartmentCount} compartments`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
