import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // First, ensure all categories exist (including other categories)
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: "Rings" },
      update: {},
      create: { name: "Rings" },
    }),
    prisma.category.upsert({
      where: { name: "Necklaces" },
      update: {},
      create: { name: "Necklaces" },
    }),
    prisma.category.upsert({
      where: { name: "Earrings" },
      update: {},
      create: { name: "Earrings" },
    }),
    prisma.category.upsert({
      where: { name: "Bracelets" },
      update: {},
      create: { name: "Bracelets" },
    }),
  ]);

  // Find the Necklaces category specifically
  const necklaceCategory = categories.find((cat) => cat.name === "Necklaces");
  if (!necklaceCategory) {
    throw new Error("Failed to create or find Necklaces category");
  }

  // Create or find Tags with proper mapping
  const tagNames = [
    "Gold",
    "Silver",
    "Diamond",
    "Pearl",
    "Emerald",
    "Ruby",
    "Sapphire",
    "Wedding",
    "Vintage",
    "Modern",
    "Luxury",
    "Minimalist",
    "Statement",
    "Classic",
    "Contemporary",
  ];
  const tags = await Promise.all(
    tagNames.map((tagName) =>
      prisma.tag.upsert({
        where: { name: tagName },
        update: {},
        create: { name: tagName },
      })
    )
  );

  // Create a tag lookup map for easier access
  const tagMap = new Map(tags.map((tag) => [tag.name, tag.id]));

  // Create Sizes for necklaces
  const sizes = await Promise.all([
    prisma.size.upsert({
      where: { name: "14 inches" },
      update: {},
      create: { name: "14 inches" },
    }),
    prisma.size.upsert({
      where: { name: "16 inches" },
      update: {},
      create: { name: "16 inches" },
    }),
    prisma.size.upsert({
      where: { name: "18 inches" },
      update: {},
      create: { name: "18 inches" },
    }),
    prisma.size.upsert({
      where: { name: "20 inches" },
      update: {},
      create: { name: "20 inches" },
    }),
    prisma.size.upsert({
      where: { name: "22 inches" },
      update: {},
      create: { name: "22 inches" },
    }),
    prisma.size.upsert({
      where: { name: "24 inches" },
      update: {},
      create: { name: "24 inches" },
    }),
  ]);

  // Create Media (Product Images) - High quality necklace images
  const media = await Promise.all([
    // Gold necklaces
    prisma.media.create({
      data: {
        url: "https://images.unsplash.com/photo-1596944924616-7b384c8c2e0a?w=800&h=800&fit=crop&q=80",
        mimeType: "image/jpeg",
        type: "product",
      },
    }),
    prisma.media.create({
      data: {
        url: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&h=800&fit=crop&q=80",
        mimeType: "image/jpeg",
        type: "product",
      },
    }),
    prisma.media.create({
      data: {
        url: "https://images.unsplash.com/photo-1608043152251-1df7f8e4c1c7?w=800&h=800&fit=crop&q=80",
        mimeType: "image/jpeg",
        type: "product",
      },
    }),
    prisma.media.create({
      data: {
        url: "https://images.unsplash.com/photo-1617038220319-276d4f4b0b0e?w=800&h=800&fit=crop&q=80",
        mimeType: "image/jpeg",
        type: "product",
      },
    }),
    prisma.media.create({
      data: {
        url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=800&fit=crop&q=80",
        mimeType: "image/jpeg",
        type: "product",
      },
    }),
    prisma.media.create({
      data: {
        url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=800&fit=crop&q=80",
        mimeType: "image/jpeg",
        type: "product",
      },
    }),
    prisma.media.create({
      data: {
        url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=800&fit=crop&q=80",
        mimeType: "image/jpeg",
        type: "product",
      },
    }),
    prisma.media.create({
      data: {
        url: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&h=800&fit=crop&q=80",
        mimeType: "image/jpeg",
        type: "product",
      },
    }),
    prisma.media.create({
      data: {
        url: "https://images.unsplash.com/photo-1608043152251-1df7f8e4c1c7?w=800&h=800&fit=crop&q=80",
        mimeType: "image/jpeg",
        type: "product",
      },
    }),
    prisma.media.create({
      data: {
        url: "https://images.unsplash.com/photo-1617038220319-276d4f4b0b0e?w=800&h=800&fit=crop&q=80",
        mimeType: "image/jpeg",
        type: "product",
      },
    }),
    // Additional images for variety
    prisma.media.create({
      data: {
        url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=800&fit=crop&q=80",
        mimeType: "image/jpeg",
        type: "product",
      },
    }),
    prisma.media.create({
      data: {
        url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=800&fit=crop&q=80",
        mimeType: "image/jpeg",
        type: "product",
      },
    }),
    prisma.media.create({
      data: {
        url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=800&fit=crop&q=80",
        mimeType: "image/jpeg",
        type: "product",
      },
    }),
    prisma.media.create({
      data: {
        url: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&h=800&fit=crop&q=80",
        mimeType: "image/jpeg",
        type: "product",
      },
    }),
    prisma.media.create({
      data: {
        url: "https://images.unsplash.com/photo-1608043152251-1df7f8e4c1c7?w=800&h=800&fit=crop&q=80",
        mimeType: "image/jpeg",
        type: "product",
      },
    }),
    prisma.media.create({
      data: {
        url: "https://images.unsplash.com/photo-1617038220319-276d4f4b0b0e?w=800&h=800&fit=crop&q=80",
        mimeType: "image/jpeg",
        type: "product",
      },
    }),
    prisma.media.create({
      data: {
        url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=800&fit=crop&q=80",
        mimeType: "image/jpeg",
        type: "product",
      },
    }),
    prisma.media.create({
      data: {
        url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=800&fit=crop&q=80",
        mimeType: "image/jpeg",
        type: "product",
      },
    }),
    prisma.media.create({
      data: {
        url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=800&fit=crop&q=80",
        mimeType: "image/jpeg",
        type: "product",
      },
    }),
    prisma.media.create({
      data: {
        url: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&h=800&fit=crop&q=80",
        mimeType: "image/jpeg",
        type: "product",
      },
    }),
  ]);

  // Create 20 Real Necklace Products
  const necklaces = [
    {
      name: "Classic Pearl Gold Chain Necklace",
      description:
        "Timeless 18k gold chain necklace with freshwater pearls. Perfect for both casual and formal wear.",
      price: 599.99,
      stock: 25,
      tags: ["Gold", "Pearl", "Classic"],
      images: [0, 1],
    },
    {
      name: "Diamond Solitaire Gold Pendant",
      description:
        "Elegant gold pendant featuring a brilliant cut diamond. A statement piece for special occasions.",
      price: 1299.99,
      stock: 15,
      tags: ["Gold", "Diamond", "Luxury"],
      images: [2, 3],
    },
    {
      name: "Emerald Drop Gold Necklace",
      description:
        "Luxurious gold necklace with emerald drop pendant. Handcrafted for the discerning jewelry lover.",
      price: 899.99,
      stock: 18,
      tags: ["Gold", "Emerald", "Statement"],
      images: [4, 5],
    },
    {
      name: "Ruby Heart Gold Locket",
      description:
        "Romantic gold locket with ruby heart design. Perfect for expressing love and affection.",
      price: 749.99,
      stock: 20,
      tags: ["Gold", "Ruby", "Wedding"],
      images: [6, 7],
    },
    {
      name: "Sapphire Blue Gold Choker",
      description:
        "Stunning blue sapphire choker in 18k gold. A modern take on classic elegance.",
      price: 1599.99,
      stock: 12,
      tags: ["Gold", "Sapphire", "Contemporary"],
      images: [8, 9],
    },
    {
      name: "Vintage Pearl Strand Necklace",
      description:
        "Classic pearl strand necklace with vintage charm. Timeless elegance for any wardrobe.",
      price: 399.99,
      stock: 30,
      tags: ["Pearl", "Vintage", "Classic"],
      images: [10, 11],
    },
    {
      name: "Modern Gold Chain Necklace",
      description:
        "Contemporary gold chain necklace with minimalist design. Perfect for everyday wear.",
      price: 299.99,
      stock: 35,
      tags: ["Gold", "Modern", "Minimalist"],
      images: [12, 13],
    },
    {
      name: "Diamond Tennis Gold Necklace",
      description:
        "Luxurious diamond tennis necklace in 18k gold. A true investment piece.",
      price: 4999.99,
      stock: 5,
      tags: ["Gold", "Diamond", "Luxury"],
      images: [14, 0],
    },
    {
      name: "Silver Pearl Drop Necklace",
      description:
        "Elegant silver necklace with pearl drop pendant. Sophisticated and affordable luxury.",
      price: 199.99,
      stock: 40,
      tags: ["Silver", "Pearl", "Minimalist"],
      images: [1, 2],
    },
    {
      name: "Gold Multi-Stone Pendant",
      description:
        "Beautiful gold pendant featuring multiple gemstones. A colorful statement piece.",
      price: 699.99,
      stock: 22,
      tags: ["Gold", "Diamond", "Emerald", "Statement"],
      images: [3, 4],
    },
    {
      name: "Wedding Pearl Gold Necklace",
      description:
        "Bridal pearl necklace in 18k gold. Perfect for your special day.",
      price: 899.99,
      stock: 16,
      tags: ["Gold", "Pearl", "Wedding"],
      images: [5, 6],
    },
    {
      name: "Art Deco Diamond Gold Necklace",
      description:
        "Vintage-inspired Art Deco diamond necklace. A masterpiece of geometric elegance.",
      price: 2499.99,
      stock: 8,
      tags: ["Gold", "Diamond", "Vintage"],
      images: [7, 8],
    },
    {
      name: "Minimalist Gold Bar Necklace",
      description:
        "Clean and modern gold bar necklace. Perfect for the contemporary woman.",
      price: 199.99,
      stock: 45,
      tags: ["Gold", "Modern", "Minimalist"],
      images: [9, 10],
    },
    {
      name: "Ruby and Diamond Gold Necklace",
      description:
        "Luxurious combination of rubies and diamonds in 18k gold. A true heirloom piece.",
      price: 3299.99,
      stock: 6,
      tags: ["Gold", "Ruby", "Diamond", "Luxury"],
      images: [11, 12],
    },
    {
      name: "Pearl Cluster Gold Necklace",
      description:
        "Unique pearl cluster design in gold setting. A conversation-starting piece.",
      price: 799.99,
      stock: 14,
      tags: ["Gold", "Pearl", "Statement"],
      images: [13, 14],
    },
    {
      name: "Silver Chain with Diamond Pendant",
      description:
        "Classic silver chain with diamond pendant. Elegant simplicity at its finest.",
      price: 499.99,
      stock: 28,
      tags: ["Silver", "Diamond", "Classic"],
      images: [0, 1],
    },
    {
      name: "Gold Snake Chain Necklace",
      description:
        "Trendy gold snake chain necklace. A modern twist on classic chain jewelry.",
      price: 349.99,
      stock: 32,
      tags: ["Gold", "Modern", "Contemporary"],
      images: [2, 3],
    },
    {
      name: "Emerald Cut Diamond Gold Necklace",
      description:
        "Sophisticated emerald cut diamond in gold setting. A timeless investment piece.",
      price: 1899.99,
      stock: 10,
      tags: ["Gold", "Diamond", "Luxury"],
      images: [4, 5],
    },
    {
      name: "Pearl and Gold Bead Necklace",
      description:
        "Charming pearl and gold bead combination necklace. Perfect for layered looks.",
      price: 449.99,
      stock: 24,
      tags: ["Gold", "Pearl", "Contemporary"],
      images: [6, 7],
    },
    {
      name: "Ruby Heart Gold Pendant",
      description:
        "Romantic ruby heart pendant in 18k gold. Express your love with this beautiful piece.",
      price: 599.99,
      stock: 18,
      tags: ["Gold", "Ruby", "Wedding"],
      images: [8, 9],
    },
  ];

  // Create the necklace products
  const createdNecklaces = await Promise.all(
    necklaces.map(async (necklace, index) => {
      // Get tag IDs using the tag map for reliable lookup
      const tagIds = necklace.tags
        .map((tagName) => tagMap.get(tagName))
        .filter(Boolean) as number[];

      console.log(`Creating necklace ${index + 1}/20: ${necklace.name}`);
      console.log(
        `Category ID: ${necklaceCategory.id} (${necklaceCategory.name})`
      );
      console.log(
        `Tag IDs: ${tagIds.join(", ")} for tags: ${necklace.tags.join(", ")}`
      );

      return prisma.product.create({
        data: {
          name: necklace.name,
          sku: `NECK-${String(index + 1).padStart(3, '0')}`, // Generate SKU like NECK-001, NECK-002, etc.
          description: necklace.description,
          price: necklace.price,
          stock: necklace.stock,
          isAvailable: true,
          hasSizing: true,
          category: { connect: { id: necklaceCategory.id } },
          images: {
            connect: necklace.images.map((imgIndex) => ({
              id: media[imgIndex].id,
            })),
          },
          tags: {
            create: tagIds.map((tagId) => ({
              tag: { connect: { id: tagId } },
            })),
          },
          sizes: {
            create: [
              { sizeId: sizes[0].id, stock: Math.floor(necklace.stock * 0.15) }, // 14 inches
              { sizeId: sizes[1].id, stock: Math.floor(necklace.stock * 0.25) }, // 16 inches
              { sizeId: sizes[2].id, stock: Math.floor(necklace.stock * 0.3) }, // 18 inches
              { sizeId: sizes[3].id, stock: Math.floor(necklace.stock * 0.2) }, // 20 inches
              { sizeId: sizes[4].id, stock: Math.floor(necklace.stock * 0.08) }, // 22 inches
              { sizeId: sizes[5].id, stock: Math.floor(necklace.stock * 0.02) }, // 24 inches
            ],
          },
        },
      });
    })
  );

  console.log("Necklace seeding completed successfully!");
  console.log(`Created ${createdNecklaces.length} necklace products`);
  console.log(`Created ${media.length} media files`);
  console.log(`Created ${tags.length} tags`);
  console.log(`Created ${sizes.length} necklace sizes`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
