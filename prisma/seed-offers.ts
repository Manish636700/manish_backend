import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedOffers() {
  try {
    console.log("🌱 Seeding offers...");

    // Sample offers using existing tags and categories from pageData
    const offers = [
      {
        code: "WELCOME10",
        name: "Welcome Discount",
        description: "10% off on your first order",
        discountType: "PERCENTAGE" as const,
        discountValue: 10,
        minOrderValue: 500,
        maxDiscount: 1000,
        applicableTags: ["Necklace", "Earrings"], // Using existing categories
        isActive: true,
        usageLimit: 1000,
      },
      {
        code: "SAVE500",
        name: "Flat ₹500 Off",
        description: "Get ₹500 off on orders above ₹2000",
        discountType: "FIXED_AMOUNT" as const,
        discountValue: 500,
        minOrderValue: 2000,
        applicableTags: ["Gold"], // Using existing tag
        isActive: true,
        usageLimit: 500,
      },
      {
        code: "BOGO",
        name: "Buy One Get One Free",
        description: "Buy any jewelry item and get the most expensive one free",
        discountType: "BOGO" as const,
        discountValue: 0,
        minOrderValue: 1000,
        applicableTags: ["Necklace", "Earrings", "Bracelets"], // Using existing categories
        isActive: true,
        usageLimit: 200,
      },
      {
        code: "DIAMOND20",
        name: "Diamond Collection Sale",
        description: "20% off on diamond jewelry",
        discountType: "PERCENTAGE" as const,
        discountValue: 20,
        minOrderValue: 1000,
        maxDiscount: 2000,
        applicableTags: ["Diamond"], // Using existing tag
        isActive: true,
        usageLimit: 300,
      },
      {
        code: "WEDDING1000",
        name: "Wedding Collection Discount",
        description: "Special discount for wedding jewelry",
        discountType: "FIXED_AMOUNT" as const,
        discountValue: 1000,
        minOrderValue: 5000,
        applicableTags: ["Wedding"], // Using existing tag
        isActive: true,
        usageLimit: 50,
      },
    ];

    // Clear existing offers
    await prisma.offer.deleteMany({});
    console.log("🗑️ Cleared existing offers");

    // Create new offers
    for (const offer of offers) {
      await prisma.offer.create({
        data: offer,
      });
      console.log(`✅ Created offer: ${offer.code}`);
    }

    console.log("🎉 Offers seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding offers:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedOffers();
