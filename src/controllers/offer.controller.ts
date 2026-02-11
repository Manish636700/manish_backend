import { Request, Response } from "express";
import prisma from "@/configs/db";

const normalizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
};

// Create a new offer
export const createOffer = async (req: Request, res: Response) => {
  try {
    const {
      code,
      name,
      description,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscount,
      applicableTags,
      applicableCategories,
      startDate,
      endDate,
      usageLimit,
    } = req.body;

    // Validation
    if (!code || !name || !discountType || !discountValue) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate discount type
    if (!["PERCENTAGE", "FIXED_AMOUNT", "BOGO"].includes(discountType)) {
      return res.status(400).json({ error: "Invalid discount type" });
    }

    // Validate discount value
    if (
      discountType === "PERCENTAGE" &&
      (discountValue < 0 || discountValue > 100)
    ) {
      return res
        .status(400)
        .json({ error: "Percentage discount must be between 0 and 100" });
    }

    if (discountType === "FIXED_AMOUNT" && discountValue < 0) {
      return res
        .status(400)
        .json({ error: "Fixed amount discount must be positive" });
    }

    // Check if code already exists
    const existingOffer = await prisma.offer.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existingOffer) {
      return res.status(400).json({ error: "Offer code already exists" });
    }

    const offer = await prisma.offer.create({
      data: {
        code: code.toUpperCase(),
        name,
        description,
        discountType,
        discountValue,
        minOrderValue,
        maxDiscount,
        applicableTags: normalizeStringArray(applicableTags),
        applicableCategories: normalizeStringArray(applicableCategories),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        usageLimit,
      },
    });

    res.status(201).json(offer);
  } catch (error: any) {
    console.error("Error creating offer:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get all offers with enhanced display information
export const getAllOffers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, active } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (active !== undefined) {
      where.isActive = active === "true";
    }

    const [offers, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.offer.count({ where }),
    ]);

    // Tag mapping for pageData context
    const tagNameMapping: Record<string, string> = {
      Gold: "Power Play",
      Diamond: "Weekend Vibes",
      Wedding: "Glow Up",
      Silver: "Date Night",
      Pearl: "Dazzle Hour",
      Sapphire: "Fearless Spark",
      Ruby: "Casual Glam",
      Emerald: "Boss Gloss",
    };

    // Enhance offers with display information
    const enhancedOffers = offers.map((offer) => {
      const offerTags = normalizeStringArray(offer.applicableTags);
      const offerCategories = normalizeStringArray(offer.applicableCategories);

      // Create display name with pageData context
      let displayName = offer.name;
      const tagContexts: string[] = [];

      offerTags.forEach((tagName: string) => {
        if (tagNameMapping[tagName]) {
          tagContexts.push(`${tagName} (${tagNameMapping[tagName]})`);
        } else {
          tagContexts.push(tagName);
        }
      });

      if (tagContexts.length > 0) {
        displayName = `${offer.name} - ${tagContexts.join(', ')}`;
      }

      // Create "Active for" text
      const tagCount = offerTags.length;
      const categoryCount = offerCategories.length;
      let activeForText = '';

      if (tagCount > 0 && categoryCount > 0) {
        activeForText = `${tagCount} tags, ${categoryCount} categories`;
      } else if (tagCount > 0) {
        activeForText = `${tagCount} tag${tagCount > 1 ? 's' : ''}`;
      } else if (categoryCount > 0) {
        activeForText = `${categoryCount} categor${categoryCount > 1 ? 'ies' : 'y'}`;
      } else {
        activeForText = 'All products';
      }

      return {
        ...offer,
        applicableTags: offerTags,
        applicableCategories: offerCategories,
        displayName,
        activeForText,
        tagCount,
        categoryCount,
        pageDataContext: tagContexts.length > 0 ? tagContexts[0] : undefined,
      };
    });

    res.json({
      offers: enhancedOffers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Error fetching offers:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get offer by ID
export const getOfferById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const offer = await prisma.offer.findUnique({
      where: { id: parseInt(id) },
    });

    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }

    res.json(offer);
  } catch (error: any) {
    console.error("Error fetching offer:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update offer
export const updateOffer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.usageCount;

    // Validate discount type if provided
    if (
      updateData.discountType &&
      !["PERCENTAGE", "FIXED_AMOUNT", "BOGO"].includes(updateData.discountType)
    ) {
      return res.status(400).json({ error: "Invalid discount type" });
    }

    // Validate discount value if provided
    if (
      updateData.discountType === "PERCENTAGE" &&
      updateData.discountValue &&
      (updateData.discountValue < 0 || updateData.discountValue > 100)
    ) {
      return res
        .status(400)
        .json({ error: "Percentage discount must be between 0 and 100" });
    }

    if (
      updateData.discountType === "FIXED_AMOUNT" &&
      updateData.discountValue &&
      updateData.discountValue < 0
    ) {
      return res
        .status(400)
        .json({ error: "Fixed amount discount must be positive" });
    }

    // Convert code to uppercase if provided
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
    }

    // Convert dates if provided
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }

    // Normalize applicable tags and categories
    if (updateData.applicableTags !== undefined) {
      updateData.applicableTags = normalizeStringArray(
        updateData.applicableTags
      );
    }
    if (updateData.applicableCategories !== undefined) {
      updateData.applicableCategories = normalizeStringArray(
        updateData.applicableCategories
      );
    }

    const offer = await prisma.offer.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.json(offer);
  } catch (error: any) {
    console.error("Error updating offer:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete offer
export const deleteOffer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.offer.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: "Offer deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting offer:", error);
    res.status(500).json({ error: error.message });
  }
};

// Validate and apply offer code
export const validateOfferCode = async (req: Request, res: Response) => {
  try {
    const { code, items, totalAmount } = req.body;

    if (!code || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Find the offer
    const offer = await prisma.offer.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!offer) {
      return res.status(404).json({ error: "Invalid offer code" });
    }

    // Check if offer is active
    if (!offer.isActive) {
      return res.status(400).json({ error: "Offer code is not active" });
    }

    // Check date validity
    const now = new Date();
    if (offer.startDate && now < offer.startDate) {
      return res.status(400).json({ error: "Offer code is not yet valid" });
    }
    if (offer.endDate && now > offer.endDate) {
      return res.status(400).json({ error: "Offer code has expired" });
    }

    // Check usage limit
    if (offer.usageLimit && offer.usageCount >= offer.usageLimit) {
      return res.status(400).json({ error: "Offer code usage limit exceeded" });
    }

    // Check minimum order value
    if (offer.minOrderValue && totalAmount < Number(offer.minOrderValue)) {
      return res.status(400).json({
        error: `Minimum order value of ₹${offer.minOrderValue} required for this offer`,
      });
    }

    // Get products with their tags and categories
    const productIds = items.map((item: any) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        tags: { include: { tag: true } },
        category: true,
      },
    });

    // Filter items that match the offer's applicable tags or categories
    const applicableItems = items.filter((item: any) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        console.log(`Product with ID ${item.productId} not found`);
        return false;
      }

      const productTags = product.tags.map((pt) => pt.tag.name);
      const productCategory = product.category?.name;
      const offerTags = normalizeStringArray(offer.applicableTags);
      const offerCategories = normalizeStringArray(offer.applicableCategories);

      // Check if product matches any of the offer's applicable tags or categories
      const isEligible =
        offerTags.some((tag: string) => productTags.includes(tag)) ||
        offerCategories.some(
          (category: string) => productCategory === category
        );

      console.log(
        `Product ${product.name}: Tags=[${productTags.join(
          ", "
        )}], Category=${productCategory}, Eligible=${isEligible}`
      );

      return isEligible;
    });

    if (applicableItems.length === 0) {
      // Provide more helpful error message
      const productNames = products.map((p) => p.name).join(", ");
      const offerTags = normalizeStringArray(offer.applicableTags).join(", ");
      const offerCategories = normalizeStringArray(
        offer.applicableCategories
      ).join(", ");
      const applicableTo = [offerTags, offerCategories]
        .filter(Boolean)
        .join(" or ");

      return res.status(400).json({
        error: `No items in your cart are eligible for this offer. This offer applies to: ${applicableTo}. Your cart contains: ${productNames}`,
      });
    }

    // Calculate discount based on type
    let discountAmount = 0;
    let discountDetails: any = {};

    switch (offer.discountType) {
      case "PERCENTAGE":
        const applicableTotal = applicableItems.reduce(
          (sum: number, item: any) => {
            const product = products.find((p) => p.id === item.productId);
            return sum + Number(product?.price) * item.quantity;
          },
          0
        );

        discountAmount = (applicableTotal * Number(offer.discountValue)) / 100;

        if (
          offer.maxDiscount &&
          Number(offer.maxDiscount) > 0 &&
          discountAmount > Number(offer.maxDiscount)
        ) {
          discountAmount = Number(offer.maxDiscount);
        }
        break;

      case "FIXED_AMOUNT":
        discountAmount = Number(offer.discountValue);
        break;

      case "BOGO":
        // For BOGO, find the most expensive item and make it free
        const sortedItems = applicableItems.sort((a: any, b: any) => {
          const productA = products.find((p) => p.id === a.productId);
          const productB = products.find((p) => p.id === b.productId);
          return Number(productB?.price) - Number(productA?.price);
        });

        if (sortedItems.length > 0) {
          const mostExpensiveItem = sortedItems[0];
          const product = products.find(
            (p) => p.id === mostExpensiveItem.productId
          );
          discountAmount = Number(product?.price);
          discountDetails = {
            type: "BOGO",
            freeItem: {
              productId: mostExpensiveItem.productId,
              productName: product?.name,
              price: product?.price,
            },
          };
        }
        break;
    }

    // Ensure discount doesn't exceed total amount
    if (discountAmount > totalAmount) {
      discountAmount = totalAmount;
    }

    res.json({
      valid: true,
      offer: {
        id: offer.id,
        code: offer.code,
        name: offer.name,
        description: offer.description,
        discountType: offer.discountType,
        discountAmount,
        applicableItems: applicableItems.length,
        discountDetails,
      },
    });
  } catch (error: any) {
    console.error("Error validating offer code:", error);
    res.status(500).json({ error: error.message });
  }
};

// Apply offer code (increment usage count)
export const applyOfferCode = async (req: Request, res: Response) => {
  try {
    const { offerId } = req.body;

    if (!offerId) {
      return res.status(400).json({ error: "Offer ID is required" });
    }

    const offer = await prisma.offer.update({
      where: { id: offerId },
      data: { usageCount: { increment: 1 } },
    });

    res.json({ message: "Offer applied successfully", offer });
  } catch (error: any) {
    console.error("Error applying offer:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get all available tags and categories for offer creation
export const getTagsAndCategories = async (req: Request, res: Response) => {
  try {
    const [tags, categories] = await Promise.all([
      prisma.tag.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.category.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    res.json({
      tags: tags.map((tag) => ({ id: tag.id, name: tag.name })),
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching tags and categories:", error);
    res.status(500).json({ error: error.message });
  }
};
