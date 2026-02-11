import prisma from "@/configs/db";
import { formatProduct, productSelect } from "@/configs/select";
import { Request, Response } from "express";

export const getProducts = async (req: Request, res: Response) => {
  try {
    const {
      categoryId,
      sort = "desc",
      search,
      page = "1",
      limit = "10",
      tagId,
      minPrice,
      maxPrice,
    } = req.query;

    // ✅ Pagination - Ensure valid numbers
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 10)); // Limit max page size to 100
    const skip = (pageNumber - 1) * pageSize;

    // ✅ Filters
    const filters: any = {};
    if (categoryId) {
      const catId = Number(categoryId);
      if (!isNaN(catId)) filters.categoryId = catId;
    }
    if (search) {
      const searchTerm = String(search);

      // Frontend to backend tag name mapping
      const frontendToBackendTags: Record<string, string> = {
        "Power Play": "Gold",
        "Weekend Vibes": "Diamond",
        "Glow Up": "Wedding",
        "Date Night": "Silver",
        "Dazzle Hour": "Pearl",
        "Fearless Spark": "Sapphire",
        "Casual Glam": "Ruby",
        "Boss Gloss": "Emerald",
      };

      // Create search conditions for both frontend and backend tag names
      const tagSearchConditions = [];

      // Search by backend tag names (direct)
      tagSearchConditions.push({
        tags: {
          some: {
            tag: { name: { contains: searchTerm, mode: "insensitive" } },
          },
        },
      });

      // Search by frontend display names (mapped to backend names)
      Object.entries(frontendToBackendTags).forEach(
        ([frontendName, backendName]) => {
          if (frontendName.toLowerCase().includes(searchTerm.toLowerCase())) {
            tagSearchConditions.push({
              tags: {
                some: {
                  tag: { name: { equals: backendName, mode: "insensitive" } },
                },
              },
            });
          }
        }
      );

      filters.OR = [
        // Search in product name
        { name: { contains: searchTerm, mode: "insensitive" } },
        // Search in product description
        { description: { contains: searchTerm, mode: "insensitive" } },
        // Search in category name
        { category: { name: { contains: searchTerm, mode: "insensitive" } } },
        // Search in tag names (both backend and frontend names)
        ...tagSearchConditions,
      ];
    }
    if (tagId) {
      const tId = Number(tagId);
      if (!isNaN(tId)) {
        filters.tags = { some: { tagId: tId } };
      }
    }

    // ✅ Price range filters
    if (minPrice || maxPrice) {
      filters.price = {};
      if (minPrice) {
        const min = Number(minPrice);
        if (!isNaN(min)) filters.price.gte = min;
      }
      if (maxPrice) {
        const max = Number(maxPrice);
        if (!isNaN(max)) filters.price.lte = max;
      }
    }

    // ✅ Fetch total count for pagination meta
    const totalCount = await prisma.product.count({ where: filters });

    console.log("Filters:", filters);
    console.log("Pagination:", { pageNumber, pageSize, skip, totalCount });
    console.log("Query parameters:", {
      categoryId,
      sort,
      search,
      page,
      limit,
      tagId,
      minPrice,
      maxPrice,
    });

    // ✅ Determine sort order
    let orderBy: any = {};
    if (sort === "asc") {
      orderBy = { price: "asc" };
    } else if (sort === "desc") {
      orderBy = { price: "desc" };
    } else if (sort === "name-asc") {
      orderBy = { name: "asc" };
    } else if (sort === "name-desc") {
      orderBy = { name: "desc" };
    } else {
      // Default to newest first (by createdAt)
      orderBy = { createdAt: "desc" };
    }

    const products = await prisma.product.findMany({
      where: filters,
      orderBy,
      select: productSelect,
      skip,
      take: pageSize,
    });

    // ✅ Fetch paginated products
    // const products = await prisma.product.findMany({
    //   where: filters,
    //   orderBy: { price: sort === "asc" ? "asc" : "desc" },
    //   include: {
    //     category: true,
    //     images: true,
    //     sizes:{
    //       select:{
    //         size:{
    //           select:{
    //             name:true
    //           }
    //         },
    //         stock:true
    //       }
    //     },
    //     tags: {
    //       select: {
    //         tag: {
    //           select: {
    //             id: true,
    //             name: true,
    //           },
    //         },
    //       },
    //     },
    //   },
    //   skip,
    //   take: pageSize,
    // });

    // // ✅ Flatten tags
    // const formattedProducts = products.map((p) => ({
    //   ...p,
    //   tags: p.tags.map((t) => ({
    //     id: t.tag.id,
    //     name: t.tag.name,
    //   })),
    // }));

    const totalPages = Math.ceil(totalCount / pageSize);

    // Calculate review stats for each product
    const productsWithStats = await Promise.all(
      products.map(async (product) => {
        // Get review statistics for this product
        const ratingStats = await prisma.review.groupBy({
          by: ["rating"],
          where: { productId: product.id },
          _count: {
            rating: true,
          },
        });

        const averageRating = await prisma.review.aggregate({
          where: { productId: product.id },
          _avg: {
            rating: true,
          },
        });

        const totalReviews = await prisma.review.count({
          where: { productId: product.id },
        });

        const ratingDistribution = {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0,
        };

        ratingStats.forEach((stat) => {
          ratingDistribution[stat.rating as keyof typeof ratingDistribution] =
            stat._count.rating;
        });

        return {
          ...formatProduct(product),
          reviewStats: {
            averageRating: averageRating._avg.rating || 0,
            totalReviews,
            ratingDistribution,
          },
        };
      })
    );

    res.json({
      data: productsWithStats,
      pagination: {
        totalItems: totalCount,
        totalPages,
        currentPage: pageNumber,
        pageSize,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
    });
  } catch (err: any) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

// Get top picks products - prioritize manually selected, then analytics
export const getTopPicksProducts = async (req: Request, res: Response) => {
  try {
    const { limit = 16 } = req.query;
    const limitNum = parseInt(limit as string);

    // First, get manually selected top pick products (max 4)
    const topPickProducts = await prisma.topPickProduct.findMany({
      orderBy: { order: "asc" },
      take: 4,
      include: {
        product: {
          include: {
            images: {
              select: { url: true },
            },
            category: {
              select: { name: true },
            },
            tags: {
              include: {
                tag: {
                  select: { name: true },
                },
              },
            },
            reviews: {
              select: {
                rating: true,
              },
            },
          },
        },
      },
    });

    // Filter out products that are not available
    const availableTopPicks = topPickProducts
      .filter(
        (tp: { product: { isAvailable: boolean } | null }) =>
          tp.product && tp.product.isAvailable
      )
      .map((tp: { product: any }) => tp.product);

    // If we need more products, get top selling products based on analytics
    let additionalProducts: any[] = [];
    if (availableTopPicks.length < limitNum) {
      const remainingCount = limitNum - availableTopPicks.length;
      const existingIds = availableTopPicks.map((p: { id: number }) => p.id);

      // Get top selling products based on analytics (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const topSellingProducts = await prisma.orderItem.groupBy({
        by: ["productId"],
        where: {
          productId: {
            notIn: existingIds,
          },
          order: {
            createdAt: {
              gte: thirtyDaysAgo,
            },
            status: {
              not: "cancelled",
            },
          },
        },
        _sum: {
          quantity: true,
        },
        orderBy: {
          _sum: {
            quantity: "desc",
          },
        },
        take: remainingCount,
      });

      const productIds = topSellingProducts.map((item) => item.productId);
      if (productIds.length > 0) {
        additionalProducts = await prisma.product.findMany({
          where: {
            id: {
              in: productIds,
            },
            isAvailable: true,
          },
          include: {
            images: {
              select: { url: true },
            },
            category: {
              select: { name: true },
            },
            tags: {
              include: {
                tag: {
                  select: { name: true },
                },
              },
            },
            reviews: {
              select: {
                rating: true,
              },
            },
          },
        });
      }

      // If still not enough, fill with newest products
      if (availableTopPicks.length + additionalProducts.length < limitNum) {
        const finalRemainingCount =
          limitNum - availableTopPicks.length - additionalProducts.length;
        const allExistingIds = [
          ...existingIds,
          ...additionalProducts.map((p) => p.id),
        ];

        const newestProducts = await prisma.product.findMany({
          where: {
            isAvailable: true,
            id: {
              notIn: allExistingIds,
            },
          },
          include: {
            images: {
              select: { url: true },
            },
            category: {
              select: { name: true },
            },
            tags: {
              include: {
                tag: {
                  select: { name: true },
                },
              },
            },
            reviews: {
              select: {
                rating: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: finalRemainingCount,
        });

        additionalProducts.push(...newestProducts);
      }
    }

    // Combine manually selected top picks with additional products
    const products = [...availableTopPicks, ...additionalProducts].slice(
      0,
      limitNum
    );

    // Format products with review stats
    const productsWithStats = products.map((product) => {
      const reviews = product.reviews || [];
      const averageRating =
        reviews.length > 0
          ? reviews.reduce(
              (sum: number, review: { rating: number }) => sum + review.rating,
              0
            ) / reviews.length
          : 0; // Return 0 when no reviews instead of default 4.5

      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        price: Number(product.price),
        crossedPrice: product.crossedPrice
          ? Number(product.crossedPrice)
          : null,
        stock: product.stock,
        isAvailable: product.isAvailable,
        hasSizing: product.hasSizing,
        category: product.category?.name || "Uncategorized",
        categoryId: product.categoryId,
        images: product.images.map((img: { url: string }) => img.url),
        tags: product.tags.map(
          (tag: { tag: { name: string } }) => tag.tag.name
        ),
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        reviewStats: {
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews: reviews.length,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
      };
    });

    res.json({
      data: productsWithStats,
      pagination: {
        totalItems: productsWithStats.length,
        totalPages: 1,
        currentPage: 1,
        pageSize: productsWithStats.length,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });
  } catch (err: any) {
    console.error("Error fetching top picks products:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Product ID is required" });
    }
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      select: productSelect,
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Calculate live review statistics
    const ratingStats = await prisma.review.groupBy({
      by: ["rating"],
      where: { productId: Number(id) },
      _count: {
        rating: true,
      },
    });

    const averageRating = await prisma.review.aggregate({
      where: { productId: Number(id) },
      _avg: {
        rating: true,
      },
    });

    const totalReviews = await prisma.review.count({
      where: { productId: Number(id) },
    });

    const ratingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    ratingStats.forEach((stat) => {
      ratingDistribution[stat.rating as keyof typeof ratingDistribution] =
        stat._count.rating;
    });

    // Debug logging
    console.log("📊 Product Review Stats Debug:");
    console.log("Product ID:", id);
    console.log("Total reviews:", totalReviews);
    console.log("Average rating:", averageRating._avg.rating);
    console.log("Rating distribution:", ratingDistribution);
    console.log("Rating stats raw:", ratingStats);

    const formattedProduct = formatProduct(product);
    res.json({
      ...formattedProduct,
      reviewStats: {
        averageRating: averageRating._avg.rating || 0,
        totalReviews,
        ratingDistribution,
      },
    });
  } catch (err: any) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
      },
    });
    res.json(categories);
  } catch (err: any) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

export const getTags = async (req: Request, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({
      select: {
        id: true,
        name: true,
      },
    });
    res.json(tags);
  } catch (err: any) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};
