const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Function to generate random SKU in format SS-NK-001
function generateRandomSKU() {
    const letters1 = String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
        String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const letters2 = String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
        String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const numbers = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    return `${letters1}-${letters2}-${numbers}`;
}

// Function to check if SKU already exists
async function isSkuUnique(sku) {
    const existing = await prisma.product.findUnique({
        where: { sku: sku }
    });
    return !existing;
}

// Function to generate unique SKU
async function generateUniqueSKU() {
    let sku;
    let attempts = 0;
    const maxAttempts = 100;

    do {
        sku = generateRandomSKU();
        attempts++;

        if (attempts > maxAttempts) {
            throw new Error('Could not generate unique SKU after 100 attempts');
        }
    } while (!(await isSkuUnique(sku)));

    return sku;
}

async function addSkusToExistingProducts() {
    try {
        console.log('🔍 Checking for products without SKUs...');

        // Find all products that don't have SKUs (or have null/empty SKUs)
        const productsWithoutSku = await prisma.product.findMany({
            where: {
                OR: [
                    { sku: null },
                    { sku: '' }
                ]
            },
            select: {
                id: true,
                name: true,
                sku: true
            }
        });

        console.log(`📦 Found ${productsWithoutSku.length} products without SKUs`);

        if (productsWithoutSku.length === 0) {
            console.log('✅ All products already have SKUs!');
            return;
        }

        console.log('🎲 Generating unique SKUs...');

        for (const product of productsWithoutSku) {
            try {
                const uniqueSku = await generateUniqueSKU();

                await prisma.product.update({
                    where: { id: product.id },
                    data: { sku: uniqueSku }
                });

                console.log(`✅ Updated product "${product.name}" (ID: ${product.id}) with SKU: ${uniqueSku}`);
            } catch (error) {
                console.error(`❌ Failed to update product "${product.name}" (ID: ${product.id}):`, error.message);
            }
        }

        console.log('🎉 Finished updating products with SKUs!');

        // Verify the results
        const remainingWithoutSku = await prisma.product.count({
            where: {
                OR: [
                    { sku: null },
                    { sku: '' }
                ]
            }
        });

        const totalProducts = await prisma.product.count();

        console.log(`📊 Summary:`);
        console.log(`   Total products: ${totalProducts}`);
        console.log(`   Products with SKUs: ${totalProducts - remainingWithoutSku}`);
        console.log(`   Products without SKUs: ${remainingWithoutSku}`);

    } catch (error) {
        console.error('❌ Error updating products:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
addSkusToExistingProducts();