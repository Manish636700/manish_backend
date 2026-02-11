import { PrismaClient as MySQLClient } from '@prisma/client';
import { Client } from 'pg';

// NeonDB (PostgreSQL) direct connection
const neonClient = new Client({
  connectionString: "postgresql://neondb_owner:npg_nF1GtboR8BOP@ep-cool-lab-a1scgicy-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
});

// MySQL connection
const mysqlClient = new MySQLClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function migrateData() {
  try {
    console.log('Starting data migration from NeonDB to MySQL...');

    await neonClient.connect();

    // Clear existing MySQL data first
    console.log('Clearing existing MySQL data...');
    await mysqlClient.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`;

    await mysqlClient.orderItem.deleteMany();
    await mysqlClient.review.deleteMany();
    await mysqlClient.cartItem.deleteMany();
    await mysqlClient.productTag.deleteMany();
    await mysqlClient.productSize.deleteMany();
    await mysqlClient.topPickProduct.deleteMany();
    await mysqlClient.media.deleteMany();
    await mysqlClient.product.deleteMany();
    await mysqlClient.cart.deleteMany();
    await mysqlClient.order.deleteMany();
    await mysqlClient.user.deleteMany();
    await mysqlClient.category.deleteMany();
    await mysqlClient.tag.deleteMany();
    await mysqlClient.size.deleteMany();
    await mysqlClient.offer.deleteMany();
    await mysqlClient.homePageImage.deleteMany();

    await mysqlClient.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;
    console.log('MySQL data cleared.');

    // Migrate Users
    console.log('Migrating users...');
    const usersResult = await neonClient.query('SELECT * FROM "User"');
    const users = usersResult.rows;
    for (const user of users) {
      await mysqlClient.user.upsert({
        where: { id: user.id },
        update: {
          email: user.email,
          name: user.name,
          role: user.role || 'USER',
          zipCode: user.zipCode,
          addressLine1: user.addressLine1,
          addressLine2: user.addressLine2,
          city: user.city,
          state: user.state,
          country: user.country,
          phoneNumber: user.phoneNumber,
          countryCode: user.countryCode,
        },
        create: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || 'USER',
          zipCode: user.zipCode,
          addressLine1: user.addressLine1,
          addressLine2: user.addressLine2,
          city: user.city,
          state: user.state,
          country: user.country,
          phoneNumber: user.phoneNumber,
          countryCode: user.countryCode,
        },
      });
    }
    console.log(`Migrated ${users.length} users`);

    // Migrate Categories
    console.log('Migrating categories...');
    const categoriesResult = await neonClient.query('SELECT * FROM "Category"');
    const categories = categoriesResult.rows;
    for (const category of categories) {
      await mysqlClient.category.upsert({
        where: { id: category.id },
        update: { name: category.name },
        create: { id: category.id, name: category.name },
      });
    }
    console.log(`Migrated ${categories.length} categories`);

    // Migrate Tags
    console.log('Migrating tags...');
    const tagsResult = await neonClient.query('SELECT * FROM "Tag"');
    const tags = tagsResult.rows;
    for (const tag of tags) {
      await mysqlClient.tag.upsert({
        where: { id: tag.id },
        update: { name: tag.name },
        create: { id: tag.id, name: tag.name },
      });
    }
    console.log(`Migrated ${tags.length} tags`);

    // Migrate Sizes
    console.log('Migrating sizes...');
    const sizesResult = await neonClient.query('SELECT * FROM "Size"');
    const sizes = sizesResult.rows;
    for (const size of sizes) {
      await mysqlClient.size.upsert({
        where: { id: size.id },
        update: { name: size.name },
        create: { id: size.id, name: size.name },
      });
    }
    console.log(`Migrated ${sizes.length} sizes`);

    // Migrate Products
    console.log('Migrating products...');
    const productsResult = await neonClient.query('SELECT * FROM "Product"');
    const products = productsResult.rows;

    for (const product of products) {
      // Create product first
      const newProduct = await mysqlClient.product.create({
        data: {
          id: product.id,
          sku: product.sku,
          name: product.name,
          description: product.description ? product.description.substring(0, 1000) : null, // Truncate to fit VARCHAR limit
          price: product.price,
          crossedPrice: product.crossedPrice,
          stock: product.stock,
          isAvailable: product.isAvailable,
          hasSizing: product.hasSizing,
          categoryId: product.categoryId,
        },
      });

      // Create product-tag relations - check if table exists
      try {
        const productTagsResult = await neonClient.query('SELECT * FROM "_ProductToTag" WHERE "A" = $1', [product.id]);
        for (const tagRelation of productTagsResult.rows) {
          await mysqlClient.productTag.create({
            data: {
              productId: newProduct.id,
              tagId: tagRelation.B,
            },
          });
        }
      } catch (error) {
        console.log('Product-tag relation table not found, skipping...');
      }

      // Create product-size relations
      const productSizesResult = await neonClient.query('SELECT * FROM "ProductSize" WHERE "productId" = $1', [product.id]);
      for (const sizeRelation of productSizesResult.rows) {
        await mysqlClient.productSize.create({
          data: {
            productId: newProduct.id,
            sizeId: sizeRelation.sizeId,
            stock: sizeRelation.stock,
          },
        });
      }
    }
    console.log(`Migrated ${products.length} products`);

    // Migrate Media
    console.log('Migrating media...');
    const mediaResult = await neonClient.query('SELECT * FROM "Media"');
    const media = mediaResult.rows;
    for (const mediaItem of media) {
      await mysqlClient.media.create({
        data: {
          id: mediaItem.id,
          url: mediaItem.url,
          mimeType: mediaItem.mimeType,
          type: mediaItem.type,
          productId: mediaItem.productId,
          userId: mediaItem.userId,
        },
      });
    }
    console.log(`Migrated ${media.length} media items`);

    // Migrate Carts and CartItems
    console.log('Migrating carts...');
    const cartsResult = await neonClient.query('SELECT * FROM "Cart"');
    const carts = cartsResult.rows;

    for (const cart of carts) {
      const newCart = await mysqlClient.cart.create({
        data: {
          id: cart.id,
          userId: cart.userId,
        },
      });

      // Create cart items
      const cartItemsResult = await neonClient.query('SELECT * FROM "CartItem" WHERE "cartId" = $1', [cart.id]);
      for (const item of cartItemsResult.rows) {
        await mysqlClient.cartItem.create({
          data: {
            id: item.id,
            cartId: newCart.id,
            productId: item.productId,
            quantity: item.quantity,
          },
        });
      }
    }
    console.log(`Migrated ${carts.length} carts`);

    // Migrate Offers
    console.log('Migrating offers...');
    const offersResult = await neonClient.query('SELECT * FROM "Offer"');
    const offers = offersResult.rows;
    for (const offer of offers) {
      await mysqlClient.offer.create({
        data: {
          id: offer.id,
          code: offer.code,
          name: offer.name,
          description: offer.description,
          discountType: offer.discountType,
          discountValue: offer.discountValue,
          minOrderValue: offer.minOrderValue,
          maxDiscount: offer.maxDiscount,
          applicableTags: offer.applicableTags as any,
          applicableCategories: offer.applicableCategories as any,
          isActive: offer.isActive,
          startDate: offer.startDate,
          endDate: offer.endDate,
          usageLimit: offer.usageLimit,
          usageCount: offer.usageCount,
        },
      });
    }
    console.log(`Migrated ${offers.length} offers`);

    // Migrate Orders and OrderItems
    console.log('Migrating orders...');
    const ordersResult = await neonClient.query('SELECT * FROM "Order"');
    const orders = ordersResult.rows;

    for (const order of orders) {
      // Create order
      const newOrder = await mysqlClient.order.create({
        data: {
          id: order.id,
          userId: order.userId,
          total: order.total,
          status: order.status,
          paymentMethod: order.paymentMethod,
          razorpayOrderId: order.razorpayOrderId,
          paymentId: order.paymentId,
          waybillNumber: order.waybillNumber,
          zipCode: order.zipCode,
          addressLine1: order.addressLine1,
          addressLine2: order.addressLine2,
          city: order.city,
          state: order.state,
          country: order.country,
          phoneNumber: order.phoneNumber,
          email: order.email,
          subtotal: order.subtotal,
          shipping: order.shipping,
          tax: order.tax,
          offerDiscount: order.offerDiscount,
          prepaidDiscount: order.prepaidDiscount,
          appliedDiscount: order.appliedDiscount,
        },
      });

      // Create order items
      const orderItemsResult = await neonClient.query('SELECT * FROM "OrderItem" WHERE "orderId" = $1', [order.id]);
      for (const item of orderItemsResult.rows) {
        await mysqlClient.orderItem.create({
          data: {
            id: item.id,
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            size: item.size,
            price: item.price,
          },
        });
      }
    }
    console.log(`Migrated ${orders.length} orders`);

    // Migrate Reviews
    console.log('Migrating reviews...');
    const reviewsResult = await neonClient.query('SELECT * FROM "Review"');
    const reviews = reviewsResult.rows;
    for (const review of reviews) {
      await mysqlClient.review.create({
        data: {
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          userId: review.userId,
          productId: review.productId,
          orderId: review.orderId,
          isVerified: review.isVerified,
        },
      });
    }
    console.log(`Migrated ${reviews.length} reviews`);

    // Migrate HomePageImages
    console.log('Migrating homepage images...');
    const homePageImagesResult = await neonClient.query('SELECT * FROM "HomePageImage"');
    const homePageImages = homePageImagesResult.rows;
    for (const image of homePageImages) {
      await mysqlClient.homePageImage.create({
        data: {
          id: image.id,
          type: image.type,
          imageUrl: image.imageUrl,
          mobileImageUrl: image.mobileImageUrl,
          altText: image.altText,
          title: image.title,
          subtitle: image.subtitle,
          color: image.color,
          href: image.href,
          order: image.order,
          isActive: image.isActive,
        },
      });
    }
    console.log(`Migrated ${homePageImages.length} homepage images`);

    // Migrate TopPickProducts
    console.log('Migrating top pick products...');
    const topPicksResult = await neonClient.query('SELECT * FROM "TopPickProduct"');
    const topPicks = topPicksResult.rows;
    for (const topPick of topPicks) {
      await mysqlClient.topPickProduct.create({
        data: {
          id: topPick.id,
          productId: topPick.productId,
          order: topPick.order,
        },
      });
    }
    console.log(`Migrated ${topPicks.length} top pick products`);

    console.log('Data migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await neonClient.end();
    await mysqlClient.$disconnect();
  }
}

// Run migration
migrateData();
