import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data first to ensure clean state
  console.log("Clearing existing data...");
  await prisma.productTag.deleteMany();
  await prisma.productSize.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.review.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.media.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.size.deleteMany();
  await prisma.user.deleteMany();
  console.log("Data cleared.");

  // --- 1. CREATE CATEGORIES, TAGS, and SIZES ---
  console.log("Creating categories, tags, and sizes...");

  const ringsCategory = await prisma.category.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: "Rings" },
  });
  const earringsCategory = await prisma.category.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, name: "Earrings" },
  });
  const necklacesCategory = await prisma.category.upsert({
    where: { id: 3 },
    update: {},
    create: { id: 3, name: "Necklaces" },
  });
  const braceletsCategory = await prisma.category.upsert({
    where: { id: 4 },
    update: {},
    create: { id: 4, name: "Bracelets" },
  });

  const categories = [
    ringsCategory,
    earringsCategory,
    necklacesCategory,
    braceletsCategory,
  ];

  const tagsData = [
    { id: 1, name: "Gold" },
    { id: 2, name: "Diamond" },
    { id: 3, name: "Wedding" },
    { id: 4, name: "Silver" },
    { id: 5, name: "Pearl" },
    { id: 6, name: "Sapphire" },
    { id: 7, name: "Ruby" },
    { id: 8, name: "Emerald" },
  ];

  const tags = await Promise.all(
    tagsData.map((tag) =>
      prisma.tag.upsert({
        where: { id: tag.id },
        update: {},
        create: { id: tag.id, name: tag.name },
      })
    )
  );

  const tagNameMapping: Record<string, string> = {
    "Power Play": "Gold",
    "Weekend Vibes": "Diamond",
    "Glow Up": "Wedding",
    "Date Night": "Silver",
    "Dazzle Hour": "Pearl",
    "Fearless Spark": "Sapphire",
    "Casual Glam": "Ruby",
    "Boss Gloss": "Emerald",
  };

  const tagNameToIdMap = new Map(tags.map((tag) => [tag.name, tag.id]));

  const styleToTagIdMap = new Map(
    Object.entries(tagNameMapping).map(([styleName, tagName]) => [
      styleName,
      tagNameToIdMap.get(tagName),
    ])
  );

  const getTagIds = (styles?: string, hotPicks?: string): number[] => {
    const tagIds = new Set<number>();
    if (styles) {
      const styleId = styleToTagIdMap.get(styles.trim());
      if (styleId) tagIds.add(styleId);
    }
    if (hotPicks) {
      const hotPickId = styleToTagIdMap.get(hotPicks.trim());
      if (hotPickId) tagIds.add(hotPickId);
    }
    return Array.from(tagIds);
  };

  const sizes = await Promise.all([
    prisma.size.upsert({ where: { name: "XS" }, update: {}, create: { name: "XS" } }),
    prisma.size.upsert({ where: { name: "S" }, update: {}, create: { name: "S" } }),
    prisma.size.upsert({ where: { name: "M" }, update: {}, create: { name: "M" } }),
    prisma.size.upsert({ where: { name: "L" }, update: {}, create: { name: "L" } }),
    prisma.size.upsert({ where: { name: "XL" }, update: {}, create: { name: "XL" } }),
  ]);
  console.log("Finished creating static data.");

  // --- 2. DEFINE PRODUCT DATA FROM INVENTORY ---
  const necklaceProducts = [
    { sku: 'SS-NK-001', name: 'Sunburst Crystal Pendant Necklace', description: "Sun-Kissed Elegance: Illuminate your style with this stunning sunburst pendant...", price: 600, stock: 5, images: ['https://drive.google.com/file/d/10KbvIU1TeZ6x9fTmzIhw1FRfLvF3MxH6/view?usp=drive_link'], tags: getTagIds("Dazzle Hour", "Glow Up") },
    { sku: 'SS-NK-002', name: 'Minimalist Butterfly Charm Lariat Necklace and Earring Set', description: "Delicate Charm: Embrace elegance with this beautiful butterfly jewelry set...", price: 650, stock: 5, images: ['https://drive.google.com/file/d/1tbdIUjPuk2n-4uDwt24GkxUoaaxNlFmt/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-003', name: 'Dainty Star Charm Necklace', description: "Starry Eyed Charm: Add a touch of celestial magic to your look...", price: 600, stock: 5, images: ['https://drive.google.com/file/d/1jbcbINzYAfZyKWhu5jpTrMhZB6os6NDK/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-004', name: 'Magnetic Four-Leaf Clover to Hearts Pendant Necklace', description: "Two Styles in One: Discover the magic of this convertible necklace!...", price: 750, stock: 4, images: ['https://drive.google.com/file/d/1qrzy0raGFW4PA1SbP1RE_Q3mqG9btgt_/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-005', name: 'Dainty Butterfly, Cloud & Flower Lariat Necklace', description: "Whimsical Garden: Adorn yourself with this enchanting lariat necklace...", price: 500, stock: 2, images: ['https://drive.google.com/file/d/1bzRGEeIrSZfAsIpbpurs4FF61EcjAlfw/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-007', name: 'Layered Evil Eye Sunburst & Lotus Charm Necklace', description: "Effortless Layers: Get the trendy layered look in one easy piece!...", price: 850, stock: 3, images: ['https://drive.google.com/file/d/1Qfr3dLo3b1bGo08GWl-pvNgwdT4yV85s/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-008', name: 'Adjustable Snake Chain Lariat Necklace', description: "Sleek & Modern: Define your neckline with this minimalist lariat necklace...", price: 650, stock: 2, images: ['https://drive.google.com/file/d/1_ZghdY5N_8eB7eQr4-jUgd_MJiJzxYtI/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-009', name: 'Crystal & Mother of Pearl Teardrop Pendant Necklace', description: "Refined Elegance: Adorn yourself with this exquisitely detailed necklace...", price: 650, stock: 2, images: ['https://drive.google.com/file/d/1g04r0OdtcAM5qInbJY0Hg3hQ7EAwFUuq/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-010', name: 'Dainty Beaded Station Snake Chain Necklace', description: "Understated Elegance: A beautifully simple and timeless piece...", price: 500, stock: 3, images: ['https://drive.google.com/file/d/1g2Pf9GFw8ssusFZiZ0ij-P7RLSkbuqZ6/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-011', name: 'Dainty Crystal Pave Bow Pendant Necklace', description: "Perfectly Charming: Tie your look together with this incredibly sweet and elegant bow pendant necklace...", price: 650, stock: 2, images: ['https://drive.google.com/file/d/1v6AOTgsoA3JORLGAFeY7JPBZ6ZNUHuLY/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-012', name: 'Celestial Starburst Teardrop Pendant Necklace', description: "Celestial Charm: Guide your style with this elegant teardrop pendant necklace...", price: 650, stock: 2, images: ['https://drive.google.com/file/d/1ELbXuxl7n3fpOoX5EAhUOft5rN8wQDL8/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-013', name: 'Minimalist 3D Butterfly Pendant Necklace', description: "Effortless Grace: Capture the delicate beauty of a butterfly in flight...", price: 650, stock: 4, images: ['https://drive.google.com/file/d/1VJLS2IHePUeyeOTonmkhgrnaj_RZl6Po/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-014', name: 'Abstract Dripping Liquid Gold Pendant Necklace', description: "Artfully Modern: Make a unique style statement with this abstract necklace...", price: 650, stock: 5, images: ['https://drive.google.com/file/d/1mnfHwPv9ZV3Fkcdt6o6KE6V-owSfUlrx/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-015', name: 'Double Heart Infinity Pendant Necklace', description: "Symbol of Forever: Express eternal love and connection...", price: 500, stock: 4, images: ['https://drive.google.com/file/d/1vYS3IYSoawWO9srX_XE7JlCR_62etRu5/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-016', name: 'Classic Three-Stone Crystal Pendant Necklace', description: "Timeless Trio: A classic and sophisticated piece...", price: 650, stock: 1, images: ['https://drive.google.com/file/d/1BT94D_vsijtvDRaAGkXriZpbaWrkdMD4/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-017', name: 'Adjustable Lariat Necklace with Mother of Pearl Clover Charms', description: "Chic & Versatile: A modern take on the lariat necklace...", price: 750, stock: 4, images: ['https://drive.google.com/file/d/1yz36Cr7fSECZDQZviMtPnyDrhMeulBe5/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-018', name: 'Dainty Double Heart Lariat Y-Necklace', description: "Romantic & Refined: A beautifully delicate lariat necklace...", price: 750, stock: 2, images: ['https://drive.google.com/file/d/1YDMxzj6RRj4vkmYFGFl9FjrxxGvc43EH/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-019', name: 'Black Clover Pendant Herringbone Chain Necklace', description: "Timeless Chic: Elevate your style with this iconic necklace...", price: 650, stock: 2, images: ['https://drive.google.com/file/d/1fEQ1Ta7wbgga-q1r-0c64TTEYMtCNejI/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-020', name: 'Minimalist Pebble Pendant with Heart Crystal Accent', description: "Modern Minimalism: A chic and understated necklace...", price: 750, stock: 3, images: ['https://drive.google.com/file/d/116Hzu6pvEYYkFuKuhOLfLROuo7hUY6WG/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-021', name: 'Classic Gold Herringbone Chain Necklace', description: "Ultimate Chic Staple: Elevate your jewelry game with this classic and timeless herringbone chain necklace...", price: 800, stock: 4, images: ['https://drive.google.com/file/d/1omzf7HWrAro5QKMxQ1Qw0p6ejz2UxhSU/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-022', name: 'Celestial Starburst Heart Pendant & Coin Charm Necklace', description: "Boho Celestial Charm: A beautifully detailed necklace that combines multiple trends...", price: 750, stock: 5, images: ['https://drive.google.com/file/d/1J9cqA1Pd_b0SjEmlX1RJnEqnDGknvuJ5/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-023', name: 'Double Open Heart Lariat Necklace', description: "Modern Romance: A beautifully simple lariat necklace...", price: 700, stock: 1, images: ['https://drive.google.com/file/d/1fqeeD6Nd_Hy0hDDuLOFmAqbvuol1QfVm/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-024', name: 'Good Luck Horseshoe Pendant Necklace', description: "Carry Your Luck: A classic and charming necklace...", price: 650, stock: 2, images: ['https://drive.google.com/file/d/1qAzPZgdOzui4UXKPn_kP7k54NIzc5DSe/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-025', name: 'Mother of Pearl Heart Sunburst Pendant', description: "Effortlessly Layered: Achieve a perfectly curated look...", price: 900, stock: 2, images: ['https://drive.google.com/file/d/1OVnikXDQ-Kd8icgpPjOXoOHqS4MpQ2r_/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-026', name: 'Engraved "Love" Handbag Pendant Necklace', description: "For the Fashionista: A chic and playful necklace...", price: 750, stock: 2, images: ['https://drive.google.com/file/d/1cBIi9ZblZujBw0RYo6J-6JvYY-7lCBw9/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-027', name: 'Layered Black Clover Station Necklace', description: "Effortless Luxury: Achieve the coveted layered look instantly...", price: 850, stock: 4, images: ['https://drive.google.com/file/d/16RQuBiHQdnn-2FTuzyKvd1oMYtJ2qtZL/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-028', name: 'Layered Necklace with Emerald Green Charms & Mother of Pearl Oval Pendant', description: "Sophisticated Layers: An exquisitely designed double-chain necklace...", price: 950, stock: 4, images: ['https://drive.google.com/file/d/1TbvIl2Mu7sh9axmGiB7dv4ujQw51szlj/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-029', name: 'Dainty Flower Accent Curved Bar Necklace', description: "A Touch of Whimsy: A beautifully minimalist necklace...", price: 650, stock: 3, images: ['https://drive.google.com/file/d/1HMoX1AovPLyJ0zWan_Gsdi4nkmpYvkxe/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-030', name: 'Minimalist Open Sunburst Pendant Necklace', description: "Modern Sunshine: A minimalist and chic necklace...", price: 600, stock: 3, images: ['https://drive.google.com/file/d/1QAcjNWdGMkWq078HEl7BBvTpI_8rSNVC/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-031', name: 'Rose Gold Layered Evil Eye Lariat Necklace with Baguette Crystals', description: "Intricate Glamour: An absolutely stunning layered lariat necklace...", price: 950, stock: 5, images: ['https://drive.google.com/file/d/1WTnxrr9arNLnThmepxHsVzJoZlJOcHYt/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-032', name: 'Dainty Snowflake & Crystal Charm Station Necklace', description: "Winter Wonderland Charm: Embrace the magic of winter...", price: 750, stock: 2, images: ['https://drive.google.com/file/d/1CC7VMNGym5H6WPW20XB1NfFH50u9v_fC/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-NK-033', name: 'Dainty Clustered Trio Heart Pendant Necklace', description: "A Cluster of Love: A sweet and delicate necklace...", price: 500, stock: 4, images: [''], tags: getTagIds("", "") },
    { sku: 'SS-NK-034', name: 'Solitaire Crystal Herringbone Chain Necklace', description: "Modern Brilliance: A stunning combination of two trends...", price: 750, stock: 2, images: [''], tags: getTagIds("", "") },
    { sku: 'SS-NK-035', name: 'Emerald Green & Crystal Tennis Necklace', description: "Brilliant Sparkle: An exquisitely glamorous necklace...", price: 900, stock: 1, images: [''], tags: getTagIds("", "") },
    { sku: 'SS-NK-036', name: 'Baguette Crystal Collar Necklace', description: "Modern Deco Glamour: A chic and sophisticated necklace...", price: 900, stock: 1, images: [''], tags: getTagIds("", "") },
    { sku: 'SS-NK-037', name: 'Minimalist Teardrop Pendant Necklace', description: "Fluid Elegance: A beautifully simple necklace...", price: 500, stock: 3, images: [''], tags: getTagIds("", "") },
    { sku: 'SS-NK-038', name: 'Clover Bar Tassel Pendant Necklace with Mother of Pearl Charms', description: "Playful Elegance: A beautiful and unique necklace...", price: 850, stock: 1, images: [''], tags: getTagIds("", "") },
    { sku: 'SS-NK-039', name: 'Boho Evil Eye Pendant Necklace with Dangling Stone Beads', description: "Bohemian Protection: A stylish and spiritual necklace...", price: 650, stock: 1, images: [''], tags: getTagIds("", "") },
    { sku: 'SS-NK-040', name: 'Classic Gold Herringbone Chain Necklace', description: "Ultimate Chic Staple: Elevate your jewelry game...", price: 600, stock: 1, images: [''], tags: getTagIds("", "") },
    { sku: 'SS-NK-041', name: 'Layered Necklace with Engraved Wing V-Pendant', description: "Bold & Modern Layers: A chic double-chain necklace...", price: 850, stock: 1, images: [''], tags: getTagIds("", "") },
    { sku: 'SS-NK-042', name: 'Evil Eye Pendant Necklace with Station Charms', description: "Powerful Protection: A stunning and ornate necklace...", price: 650, stock: 1, images: [''], tags: getTagIds("", "") },
    { sku: 'SS-NK-043', name: 'Rose Gold Enamel Evil Eye Bar Necklace', description: "Modern & Chic: A sleek and contemporary necklace...", price: 500, stock: 2, images: [''], tags: getTagIds("", "") },
    { sku: 'SS-NK-044', name: '2-in-1 Magnetic Convertible Four-Leaf Clover to Hearts Pendant Necklace', description: "Two Styles in One: Discover the magic of this convertible necklace!...", price: 750, stock: 4, images: [''], tags: getTagIds("", "") },
    { sku: 'SS-NK-045', name: 'Heart Pendant with Crystal Accent', description: "Subtle Romance: A sweet and minimalist necklace...", price: 500, stock: 1, images: [''], tags: getTagIds("", "") },
  ];

  const braceletProducts = [
    { sku: 'SS-BR-001', name: 'Statement Coil Wrap Bracelet', description: "Make a Statement: Elevate your wristwear with this striking gold-plated coil bracelet...", price: 650, stock: 2, images: ['https://drive.google.com/file/d/1LbzTfkHc9bkl7Zmae1iBPYSAQPzuYDhW/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-BR-002', name: 'Ginkgo Leaf Statement Cuff Bracelet', description: "Nature's Elegance: Adorn your wrist with this exquisite cuff bracelet...", price: 650, stock: 2, images: ['https://drive.google.com/file/d/19ZB1OICFZy-thzvqZmw3oUIvZrj4F_gZ/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-BR-003', name: 'Floral Blossom Statement Cuff Bracelet', description: "Blooming Beauty: Grace your wrist with this stunning floral cuff...", price: 650, stock: 2, images: ['https://drive.google.com/file/d/1HPeOc_i-BJMXotvuyw5EB25ejUYIpMVJ/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-BR-004', name: 'Abstract Coral Branch Cuff Bracelet', description: "Organic Elegance: Wrap your wrist in this stunning cuff...", price: 700, stock: 2, images: ['https://drive.google.com/file/d/1dVBeWLOD0Vo5dgPGE1HfTDD-YJ17S7-y/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-BR-005', name: 'Grecian Laurel Leaf Cuff Bracelet', description: "Channel Your Inner Goddess: Adorn your wrist with this magnificent cuff...", price: 650, stock: 2, images: ['https://drive.google.com/file/d/1acQVyxa8lxO_dPDz4DQXLMAsbBSdT9YG/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-BR-006', name: 'Slim Crystal-Studded Bangle Bracelet', description: "Timeless Elegance: A classic staple for any jewelry collection...", price: 500, stock: 2, images: ['https://drive.google.com/file/d/1R582B3JoKiTUBGFJ2ALIMBZUtx4hPNEQ/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-BR-007', name: 'Engraved Wave Pattern Crystal Bangle', description: "Detailed Elegance: Elevate your wrist with this chic bangle...", price: 550, stock: 2, images: ['https://drive.google.com/file/d/1fjZ28m3h5RJybQe65lhg4Gvlb6PNuEDn/view?usp=drive_link'], tags: getTagIds("", "") },
  ];

  const earringProducts = [
    { sku: 'SS-ER-001', name: 'Dainty Bow Charm Hoop Earrings', description: "Tie Your Look Together: Add a touch of sweetness to your style...", price: 450, stock: 5, images: ['https://drive.google.com/file/d/13CvWEFN9t9Vpjdxw94RZsSkb0a0OxtfZ/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-ER-002', name: 'Textured Floral Statement Stud Earrings', description: "Bold Blooms: Make a sophisticated statement with these stunning floral stud earrings...", price: 500, stock: 5, images: ['https://drive.google.com/file/d/1-dQV3X3IS69mRFifYYCxnL2FQwmfolwW/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-ER-003', name: 'Whimsical Gold Jellyfish Stud Earrings', description: "Dive into Style: Make a splash with these uniquely charming jellyfish stud earrings...", price: 500, stock: 5, images: ['https://drive.google.com/file/d/1OI520X-o1qmSLgPY3SBaHdDOFNwmcLk-/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-ER-004', name: 'Tree of Life Stud Earrings', description: "Symbol of Growth: Wear a meaningful emblem with these beautiful Tree of Life stud earrings...", price: 500, stock: 5, images: ['https://drive.google.com/file/d/10oxwlXzd3ug6AFUG2GUCddFJ7Jiwt2_I/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-ER-005', name: 'Minimalist Curved Link Stud Earrings', description: "Modern Simplicity: Elevate your everyday look with these chic and minimalist stud earrings...", price: 500, stock: 5, images: ['https://drive.google.com/file/d/1u9zHjnAQXo3WynTaD69Gj-683QpDgt1M/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-ER-006', name: 'Long Gold Waterfall Tassel Dangle Earrings', description: "Cascading Glamour: Make a dramatic entrance with these stunning waterfall tassel earrings...", price: 800, stock: 5, images: ['https://drive.google.com/file/d/1D9O8fAyUyipYYfALh8vCys7SnoEgluBw/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-ER-007', name: 'Woven Mesh C-Hoop Earrings', description: "Intricate Texture: Discover elegance in detail with these stunning C-hoop earrings...", price: 500, stock: 5, images: ['https://drive.google.com/file/d/1X_ZgWB3HVgAb3aW7k2aDOFWvW3YDO-5o/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-ER-008', name: 'Dainty Gold Bow Stud Earrings', description: "Simple Sweetness: Add a touch of feminine charm to your look...", price: 450, stock: 5, images: ['https://drive.google.com/file/d/1mKLUzRNvXOdRbi2M8cu3FG4pYwivL-gV/view?usp=drive_link'], tags: getTagIds("", "") },
    { sku: 'SS-ER-009', name: 'Two-Tone Gold & Silver Wave Stud Earrings', description: "Elegant Contrast: A sophisticated pair of stud earrings...", price: 500, stock: 2, images: [''], tags: getTagIds("", "") },
    { sku: 'SS-ER-010', name: 'Two-Tone Gold & Silver Teardrop Stud Earrings', description: "Modern Artistry: Chic and contemporary stud earrings...", price: 500, stock: 2, images: [''], tags: getTagIds("", "") },
    { sku: 'SS-ER-011', name: 'Two-Tone Statement "Door Knocker" Hoop Earrings', description: "Bold Retro Vibe: Make a chic statement with these retro-inspired \"door knocker\" earrings...", price: 500, stock: 2, images: [''], tags: getTagIds("", "") },
    { sku: 'SS-ER-012', name: 'Vintage Gold Woven Swirl Stud Earrings', description: "Timeless Elegance: A pair of classic, sophisticated stud earrings...", price: 500, stock: 2, images: [''], tags: getTagIds("", "") },
    { sku: 'SS-ER-013', name: 'Textured Cushion Square Stud Earrings', description: "Modern Texture: A chic pair of stud earrings...", price: 500, stock: 5, images: [''], tags: getTagIds("", "") },
    { sku: 'SS-ER-014', name: 'Dainty Bow Stud Earrings with Dangling Ribbons', description: "Perfectly Charming: Tie your look together with these sweet and elegant bow stud earrings...", price: 500, stock: 1, images: [''], tags: getTagIds("", "") },
  ];

  const ringProducts: any[] = []; // No rings in the provided CSV

  // --- 3. CREATE PRODUCTS IN DATABASE ---
  const createProductsForCategory = async (
    products: any[],
    categoryId: number
  ) => {
    if (products.length === 0) return;

    for (const productData of products) {
      if (!productData.images[0]) { // Skip if image URL is missing
        console.warn(`Skipping product ${productData.sku} due to missing image.`);
        continue;
      }

      const productMedia = await Promise.all(
        productData.images.map((url: string) =>
          prisma.media.create({
            data: { url, mimeType: "image/jpeg", type: "product" },
          })
        )
      );

      await prisma.product.create({
        data: {
          sku: productData.sku,
          name: productData.name,
          description: productData.description,
          price: productData.price,
          stock: productData.stock,
          isAvailable: productData.stock > 0,
          hasSizing: false,
          category: { connect: { id: categoryId } },
          images: { connect: productMedia.map((media) => ({ id: media.id })) },
          tags: {
            create: productData.tags.map((tagId: number) => ({
              tagId: tagId,
            })),
          },
        },
      });
    }
  };

  console.log("Seeding products into the database...");
  await createProductsForCategory(necklaceProducts, necklacesCategory.id);
  await createProductsForCategory(ringProducts, ringsCategory.id);
  await createProductsForCategory(braceletProducts, braceletsCategory.id);
  await createProductsForCategory(earringProducts, earringsCategory.id);
  console.log("Product seeding complete.");

  // --- 4. CREATE USERS ---
  console.log("Creating users...");
  await prisma.user.upsert({
    where: { email: "test@sassyshringar.com" },
    update: {},
    create: {
      email: "test@sassyshringar.com",
      name: "Test User",
      role: "USER",
      cart: { create: {} },
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@sassyshringar.com" },
    update: {},
    create: {
      email: "admin@sassyshringar.com",
      name: "Admin User",
      role: "ADMIN",
    },
  });
  console.log("Users created.");

  // --- 5. FINAL LOGS ---
  console.log("\nDatabase seeded successfully!");
  console.log(`Created ${categories.length} categories:`, categories.map((c) => c.name));
  console.log(`Created ${tags.length} tags:`, tags.map((t) => t.name));
  console.log(`Created ${necklaceProducts.length} necklace products.`);
  console.log(`Created ${ringProducts.length} ring products.`);
  console.log(`Created ${braceletProducts.length} bracelet products.`);
  console.log(`Created ${earringProducts.length} earring products.`);
  console.log("Created test user and admin user.");
}

main()
  .catch((e) => {
    console.error("An error occurred while seeding the database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
