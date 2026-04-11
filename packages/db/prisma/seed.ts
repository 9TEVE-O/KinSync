import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create a demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@kinsync.app" },
    update: {},
    create: {
      email: "demo@kinsync.app",
      name: "Demo User",
      emailVerified: true,
    },
  });

  // Create a demo family
  const family = await prisma.family.upsert({
    where: { id: "demo-family" },
    update: {},
    create: {
      id: "demo-family",
      name: "Demo Family",
      description: "A demo family for testing",
    },
  });

  // Add user as owner
  await prisma.familyMember.upsert({
    where: {
      familyId_userId: {
        familyId: family.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      familyId: family.id,
      userId: user.id,
      role: "OWNER",
    },
  });

  // Create a demo event
  await prisma.familyEvent.create({
    data: {
      familyId: family.id,
      title: "Family Reunion",
      description: "Annual family get-together",
      startAt: new Date("2026-12-25T10:00:00Z"),
      endAt: new Date("2026-12-25T18:00:00Z"),
    },
  });

  console.log("✅ Seed complete");
  console.log(`   User: ${user.email}`);
  console.log(`   Family: ${family.name}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
