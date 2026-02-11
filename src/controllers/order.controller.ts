import { Request, Response } from "express";
import prisma from "@/configs/db";
import razorpay from "@/configs/razorpay";
import crypto from "crypto";
import fetch from "node-fetch";
import {
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendShippingUpdate,
} from "@/services/whatsapp.service";

export const getOrders = async (req: Request, res: Response) => {
  try {
    const userId = req?.user?.userId;
    console.log(
      "getOrders - userId from token:",
      userId,
      "type:",
      typeof userId
    );
    console.log("getOrders - req.user:", req.user);

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Ensure userId is a number
    const numericUserId =
      typeof userId === "string" ? parseInt(userId, 10) : userId;
    console.log(
      "getOrders - numericUserId:",
      numericUserId,
      "type:",
      typeof numericUserId
    );

    console.log(
      "getOrders - Querying with userId:",
      userId,
      "type:",
      typeof userId
    );

    const orders = await prisma.order.findMany({
      where: {
        userId: numericUserId,
        status: {
          in: ["paid", "pending", "confirmed", "shipped", "delivered"], // Show all relevant order statuses except cancelled
        },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        total: true,
        paymentMethod: true, // Added payment method
        waybillNumber: true,
        zipCode: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        country: true,
        phoneNumber: true,
        email: true,
        // Pricing breakdown
        subtotal: true,
        shipping: true,
        tax: true,
        offerDiscount: true,
        prepaidDiscount: true,
        appliedDiscount: true,
        items: {
          select: {
            id: true,
            productId: true, // Add productId to the response
            price: true,
            quantity: true,
            size: true, // Add size field
            product: {
              select: {
                name: true,
                images: {
                  select: { url: true },
                },
              },
            },
          },
        },
      },
    });

    console.log("getOrders - Found orders:", orders.length);
    console.log("getOrders - Orders data:", JSON.stringify(orders, null, 2));
    console.log("getOrders - Filtering for statuses:", [
      "paid",
      "pending",
      "confirmed",
      "shipped",
      "delivered",
    ]);

    // Debug: Check all orders in database
    const allOrders = await prisma.order.findMany({
      select: { id: true, userId: true, status: true },
    });
    console.log("getOrders - All orders in DB:", allOrders);

    // Debug: Check orders for specific user (all statuses)
    const userOrders = await prisma.order.findMany({
      where: { userId: numericUserId },
      select: { id: true, userId: true, status: true },
    });
    console.log(
      "getOrders - All orders for user",
      numericUserId,
      ":",
      userOrders
    );

    // Debug: Check only paid orders for user
    const paidOrders = await prisma.order.findMany({
      where: { userId: numericUserId, status: "paid" },
      select: { id: true, userId: true, status: true },
    });
    console.log(
      "getOrders - Paid orders for user",
      numericUserId,
      ":",
      paidOrders
    );

    // Format orders to match frontend Order type
    const formattedOrders = orders.map((order) => ({
      orderId: order.id.toString(),
      orderDate: order.createdAt.toISOString(),
      status:
        order.status === "delivered"
          ? "Delivered"
          : order.status === "shipped"
          ? "Shipped"
          : order.status === "paid" || order.status === "confirmed"
          ? "Processing"
          : order.status === "cancelled"
          ? "Cancelled"
          : "Processing",
      total: Number(order.total),
      paymentMethod: order.paymentMethod,
      waybillNumber: order.waybillNumber,
      items: order.items.map((item) => ({
        id: item.id.toString(),
        productId: item.productId, // Include productId
        name: item.product.name,
        price: Number(item.price),
        quantity: item.quantity,
        image: item.product.images[0]?.url || "/placeholder-image.jpg",
      })),
      pricingBreakdown: {
        subtotal: Number(order.subtotal || order.total),
        tax: Number(order.tax || 0),
        shipping: Number(order.shipping || 0),
        offerDiscount: Number(order.offerDiscount || 0),
        prepaidDiscount: Number(order.prepaidDiscount || 0),
        totalDiscount: Number(order.appliedDiscount || 0),
      },
    }));

    return res.json(formattedOrders);
  } catch (err: any) {
    console.log(err);
    return res.status(500).json({ error: err.message });
  }
};

export const checkout = async (req: Request, res: Response) => {
  try {
    // retrieve userId from token
    const {
      userDetails,
      items,
      offer,
      totals,
      paymentMethod = "razorpay",
    } = req.body;
    const userId = parseInt(userDetails.userId, 10);

    // Validate userId
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Validate payment method
    if (!["razorpay", "cod"].includes(paymentMethod)) {
      return res.status(400).json({ error: "Invalid payment method" });
    }

    // retrieve address from user profile

    const address = {
      userId: userId,
      email: userDetails.email,
      phoneNumber: userDetails.phoneNumber,
      addressLine1: userDetails.addressLine1,
      addressLine2: userDetails.addressLine2,
      city: userDetails.city,
      state: userDetails.state,
      country: userDetails.country,
      zipCode: userDetails.zipCode,
    };

    // get user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    let total = 0;
    const orderItems: any[] = [];

    // calculate total + prepare order items with correct product price
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) continue;

      const price = Number(product.price);
      total += price * item.quantity;

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price,
        size: item.size,
      });
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ error: "No valid products in order" });
    }

    // Calculate server-side totals for validation
    const shipping = total > 100 ? 0 : 10;
    const tax = total * 0.08; // 8% tax
    const offerDiscount = offer?.discountAmount || 0;

    // Validate prepaid discount: 10% for razorpay, 0% for COD
    const expectedPrepaidDiscountRate = paymentMethod === "razorpay" ? 0.1 : 0;
    const expectedPrepaidDiscount =
      (total + shipping + tax) * expectedPrepaidDiscountRate;

    // Validate frontend calculations
    const frontendPrepaidDiscount = totals?.prepaidDiscount || 0;
    if (Math.abs(frontendPrepaidDiscount - expectedPrepaidDiscount) > 0.01) {
      return res.status(400).json({
        error: "Invalid prepaid discount calculation",
        expected: expectedPrepaidDiscount,
        received: frontendPrepaidDiscount,
      });
    }

    const expectedTotal =
      total + shipping + tax - offerDiscount - expectedPrepaidDiscount;
    const finalTotal = totals?.total ? Number(totals.total) : expectedTotal;

    // Validate total calculation
    if (Math.abs(finalTotal - expectedTotal) > 0.01) {
      return res.status(400).json({
        error: "Invalid total calculation",
        expected: expectedTotal,
        received: finalTotal,
      });
    }

    console.log("Checkout - Original subtotal:", total);
    console.log("Checkout - Shipping:", shipping);
    console.log("Checkout - Tax:", tax);
    console.log("Checkout - Offer discount:", offerDiscount);
    console.log("Checkout - Prepaid discount:", expectedPrepaidDiscount);
    console.log("Checkout - Final total:", finalTotal);
    console.log("Checkout - Payment method:", paymentMethod);

    if (paymentMethod === "cod") {
      // For COD orders, create order directly without Razorpay
      const order = await prisma.order.create({
        data: {
          total: finalTotal,
          subtotal: total,
          shipping: shipping,
          tax: tax,
          offerDiscount: offerDiscount,
          prepaidDiscount: expectedPrepaidDiscount,
          appliedDiscount: offerDiscount + expectedPrepaidDiscount,
          paymentMethod: "cod",
          status: "pending", // COD orders start as pending
          items: { create: orderItems },
          ...address,
          waybillNumber: "",
        },
      });

      // Reduce stock for COD orders immediately
      for (const item of orderItems) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Send WhatsApp notification for COD order
      try {
        await sendOrderConfirmation(
          address.phoneNumber,
          order.id,
          finalTotal,
          "pending"
        );
      } catch (whatsappError) {
        console.error("WhatsApp notification failed:", whatsappError);
        // Don't block the order process if WhatsApp fails
      }

      res.json({
        success: true,
        orderId: order.id,
        paymentMethod: "cod",
        message: "COD order created successfully",
      });
    } else {
      // For Razorpay orders, create Razorpay order
      const amountInPaise = Math.round(finalTotal * 100);
      console.log("Checkout - Amount in paise:", amountInPaise);

      const options = {
        amount: amountInPaise, // INR -> paise (must be integer)
        currency: "INR",
        receipt: `receipt_order_${Date.now()}`,
      };

      const razorpayOrder = await razorpay.orders.create(options);

      // Save order in DB (status: pending)
      const order = await prisma.order.create({
        data: {
          total: finalTotal,
          subtotal: total,
          shipping: shipping,
          tax: tax,
          offerDiscount: offerDiscount,
          prepaidDiscount: expectedPrepaidDiscount,
          appliedDiscount: offerDiscount + expectedPrepaidDiscount,
          paymentMethod: "razorpay",
          razorpayOrderId: razorpayOrder.id,
          status: "pending",
          items: { create: orderItems },
          ...address,
          waybillNumber: "",
        },
      });

      res.json({
        id: razorpayOrder.id,
        currency: razorpayOrder.currency,
        amount: razorpayOrder.amount,
        orderId: order.id,
        key: process.env.RAZORPAY_KEY_ID,
        paymentMethod: "razorpay",
      });
    }
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId, // DB orderId
    } = req.body;

    // Convert orderId to number
    const numericOrderId = parseInt(orderId, 10);
    if (isNaN(numericOrderId) || numericOrderId <= 0) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
      .update(sign.toString())
      .digest("hex");

    // Debug logging
    console.log("Signature verification debug:");
    console.log("Received signature:", razorpay_signature);
    console.log("Expected signature:", expectedSign);
    console.log("Sign string:", sign);
    console.log(
      "RAZORPAY_KEY_SECRET exists:",
      !!process.env.RAZORPAY_KEY_SECRET
    );

    if (razorpay_signature === expectedSign) {
      // Fetch order items
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId: numericOrderId },
      });

      for (const item of orderItems) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }, // ✅ reduce stock
        });
      }

      // ✅ Update order as paid and increment offer usage if applicable
      const order = await prisma.$transaction(async (prisma) => {
        const updatedOrder = await prisma.order.update({
          where: { id: numericOrderId },
          data: {
            status: "paid",
            paymentId: razorpay_payment_id,
          },
          include: { items: true },
        });

        // If order has offerDiscount, find and increment the offer usage
        if (
          updatedOrder.offerDiscount &&
          Number(updatedOrder.offerDiscount) > 0
        ) {
          // Find offers that match the discount amount
          const offers = await prisma.offer.findMany({
            where: {
              isActive: true,
              discountType: {
                in: ["PERCENTAGE", "FIXED_AMOUNT"],
              },
            },
          });

          for (const offer of offers) {
            // Update the first matching offer's usage count
            await prisma.offer.update({
              where: { id: offer.id },
              data: {
                usageCount: {
                  increment: 1,
                },
              },
            });
            break; // Update only one offer
          }
        }

        return updatedOrder;
      });

      // await createShipment();

      console.log("Payment verification successful, returning response");
      res.json({ success: true, message: "Payment verified", order });
    } else {
      res.status(400).json({ success: false, error: "Invalid signature" });
    }
  } catch (err: any) {
    console.error(err);

    res.status(500).json({ error: err.message });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { orderId, status, waybillNumber = "" } = req.body;

    // Convert orderId to number
    const numericOrderId = parseInt(orderId, 10);
    if (isNaN(numericOrderId) || numericOrderId <= 0) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    // Validate status
    const validStatuses = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Get the original order to access phone number
    const originalOrder = await prisma.order.findUnique({
      where: { id: numericOrderId },
      select: { phoneNumber: true },
    });

    if (!originalOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: numericOrderId },
      data: {
        status,
        waybillNumber,
      },
    });

    // Send WhatsApp notification based on status
    try {
      // Only send WhatsApp if we have a phone number
      if (originalOrder.phoneNumber) {
        if (status === "shipped" && waybillNumber) {
          await sendShippingUpdate(
            originalOrder.phoneNumber,
            numericOrderId,
            waybillNumber
          );
        } else {
          await sendOrderStatusUpdate(
            originalOrder.phoneNumber,
            numericOrderId,
            status
          );
        }
      }
    } catch (whatsappError) {
      console.error("WhatsApp notification failed:", whatsappError);
      // Don't block the status update if WhatsApp fails
    }

    res.json({
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const API_KEY = "2f2997f3c071874c01512e3203f782b3da830341";

// const API_URL = "https://ucp.delhivery.com/api/p/create"; // ✅ Use the correct endpoint for your environment

// // Shipment JSON payload with proper structure
// const rawShipment = {
//   shipments: [
//     {
//       name: "Consignee Name",
//       phone: "9999999999", // ✅ Correct phone number format (string)
//       order: "TestOrder001",
//       add: "Huda Market, Haryana",
//       pin: "110042", // ✅ Pin code should be a string to avoid precision issues
//       city: "Gurugram",
//       state: "Haryana",
//       country: "India",
//       payment_mode: "Pre-paid", // ✅ Correct value
//       return_add: "Return Address", // ✅ Recommended to include a return address
//       return_pin: "122001",
//       products: [ // ✅ Include the required products array
//         {
//           name: "T-shirt",
//           sku: "TSHIRT123",
//           quantity: 1,
//           unit_price: 500
//         },
//         {
//           name: "Shoes",
//           sku: "SHOES456",
//           quantity: 1,
//           unit_price: 500
//         }
//       ],
//       weight: 0.5, // ✅ Use a numerical value for weight
//       shipment_width: 10,
//       shipment_height: 10,
//       shipment_length: 10,
//     }
//   ],
//   pickup_location: {
//     name: "Max Height" // ✅ Must exactly match your registered pickup location name
//   }
// };

// // Function to create shipment
// export const createShipment = async () => {

//   try {
//     const response = await fetch(API_URL, {
//       method: "POST",
//       headers: {
//         "Authorization": `Token ${API_KEY}`,
//         "Content-Type": "application/json", // ✅ Use correct content type
//       },
//       body: JSON.stringify(rawShipment) // ✅ Send JSON directly in the body
//     });

//     const data:any = await response.json();

//     if (response.ok && data.success) {
//       console.log("✅ Shipment created successfully:", data);
//     } else {
//       console.error("❌ API responded with error:", data);
//       // Log the full response body for detailed error debugging
//       console.error("❌ Full error response:", JSON.stringify(data, null, 2));
//     }
//   } catch (error) {
//     console.error("❌ Network/API Error:", error);
//   }
// };
