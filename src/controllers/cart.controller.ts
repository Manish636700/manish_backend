import prisma from "@/configs/db";
import { AuthRequest } from "@/middlewares/auth.middleware";
import { Request, Response } from "express";

export const addToCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { productId, quantity } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ error: "Invalid product ID or quantity" });
    }

    // Check if product exists and is available
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        isAvailable: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (!product.isAvailable) {
      return res.status(400).json({ error: "Product is not available" });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        error: `Only ${product.stock} items available in stock`,
      });
    }

    let cart = await prisma.cart.findUnique({ where: { userId } });

    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId: Number(productId) },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (product.stock < newQuantity) {
        return res.status(400).json({
          error: `Cannot add ${quantity} more items. Only ${
            product.stock - existingItem.quantity
          } additional items available`,
        });
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId: Number(productId), quantity },
      });
    }

    return res.status(201).json({ message: "Item added to cart successfully" });
  } catch (err: any) {
    console.error("Add to cart error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const verifyCartItems = async (req: Request, res: Response) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Items must be an array" });
    }

    const productIds = items
      .map((item: any) => Number(item.id))
      .filter((id) => !isNaN(id));

    if (productIds.length === 0) {
      return res.json({
        verifiedItems: [],
        unavailableItems: items,
        message: "No valid product IDs provided",
      });
    }

    // Fetch all products at once
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        isAvailable: true,
        images: {
          select: { url: true },
          take: 1,
        },
      },
    });

    const verifiedItems = [];
    const unavailableItems = [];

    for (const item of items) {
      const product = products.find((p) => p.id === Number(item.id));

      if (!product) {
        unavailableItems.push({
          ...item,
          reason: "Product not found",
          available: false,
        });
        continue;
      }

      if (!product.isAvailable) {
        unavailableItems.push({
          ...item,
          reason: "Product is no longer available",
          available: false,
        });
        continue;
      }

      const requestedQuantity = Number(item.quantity) || 1;
      const availableStock = product.stock;

      if (availableStock < requestedQuantity) {
        unavailableItems.push({
          ...item,
          reason: `Only ${availableStock} items available in stock`,
          available: false,
          availableStock,
        });
        continue;
      }

      // Item is available
      verifiedItems.push({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: requestedQuantity,
        image: product.images[0]?.url || "/placeholder.png",
        available: true,
        availableStock,
      });
    }

    res.json({
      verifiedItems,
      unavailableItems,
      message: `${verifiedItems.length} items verified, ${unavailableItems.length} items unavailable`,
    });
  } catch (err: any) {
    console.error("Cart verification error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                stock: true,
                isAvailable: true,
                images: {
                  select: { url: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return res.json({ items: [], totalItems: 0, subtotal: 0 });
    }

    const items = cart.items.map((item) => ({
      id: item.product.id,
      name: item.product.name,
      price: Number(item.product.price),
      quantity: item.quantity,
      image: item.product.images[0]?.url || "/placeholder.png",
      available:
        item.product.isAvailable && item.product.stock >= item.quantity,
      availableStock: item.product.stock,
    }));

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    res.json({
      items,
      totalItems,
      subtotal,
    });
  } catch (err: any) {
    console.error("Get cart error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
