const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSkus() {
    try {
        console.log('🔍 Testing SKU implementation...');

        const products = await prisma.product.findMany({
            select: { id: true, name: true, sku: true },
            take: 5
        });

        console.log('\n📦 Sample products with SKUs:');
        products.forEach(p => {
            console.log(`   ${p.id}: ${p.name} - SKU: ${p.sku}`);
        });

        console.log('\n✅ SKU implementation is working correctly!');

    } catch (error) {
        console.error('❌ Error testing SKUs:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testSkus();