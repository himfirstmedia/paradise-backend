import prisma from "../config/prisma";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export const seedDemoAccounts = async () => {
  try {
    const userCount = await prisma.user.count();

    if (userCount > 0) {
      console.log("Users exist - skipping demo account creation");
      return;
    }

    const demoAccountsRaw = [
      {
        name: "Super Admin",
        email: "superadmin@gmail.com",
        phone: "123-456-7890",
        gender: "MALE" as const,
        role: "SUPER_ADMIN" as const,
        city: "My City",
        state: "My State",
        zipCode: "12345",
        password: "superadmin",
      },
      {
        name: "Director",
        email: "director@gmail.com",
        phone: "098-765-4321",
        gender: "MALE" as const,
        role: "DIRECTOR" as const,
        city: "My City",
        state: "My State",
        zipCode: "12345",
        password: "director",
      },
    ];

    const demoAccounts = await Promise.all(
      demoAccountsRaw.map(async (account) => ({
        ...account,
        password: await bcrypt.hash(account.password, SALT_ROUNDS),
      }))
    );

    await prisma.$transaction(
      demoAccounts.map((account) => prisma.user.create({ data: account }))
    );

    console.log("Demo accounts created successfully");
  } catch (error) {
    console.error("Error creating demo accounts:", error);
  }
};
