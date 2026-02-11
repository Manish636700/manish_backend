import prisma from "@/configs/db";
import {
    AnalyticsOverview,
    ProductAnalytics,
    SalesAnalytics,
    UserAnalytics,
    DateRange,
    AnalyticsQuery,
} from "@/types/analytics.types";

export class AnalyticsService {
    // Get overview analytics with comparison to previous period
    async getOverviewAnalytics(dateRange: DateRange): Promise<AnalyticsOverview> {
        const { startDate, endDate } = dateRange;

        // Calculate previous period for comparison
        const periodDuration = endDate.getTime() - startDate.getTime();
        const previousStartDate = new Date(startDate.getTime() - periodDuration);
        const previousEndDate = new Date(startDate.getTime());

        // Current period metrics
        const [currentRevenue, currentOrders, currentUsers, currentProducts] = await Promise.all([
            this.getTotalRevenue(startDate, endDate),
            this.getTotalOrders(startDate, endDate),
            this.getTotalUsers(startDate, endDate),
            this.getTotalProducts(),
        ]);

        // Previous period metrics for comparison
        const [previousRevenue, previousOrders, previousUsers] = await Promise.all([
            this.getTotalRevenue(previousStartDate, previousEndDate),
            this.getTotalOrders(previousStartDate, previousEndDate),
            this.getTotalUsers(previousStartDate, previousEndDate),
        ]);

        // Calculate percentage changes
        const revenueChange = this.calculatePercentageChange(currentRevenue, previousRevenue);
        const ordersChange = this.calculatePercentageChange(currentOrders, previousOrders);
        const usersChange = this.calculatePercentageChange(currentUsers, previousUsers);

        return {
            totalRevenue: currentRevenue,
            totalOrders: currentOrders,
            totalUsers: currentUsers,
            totalProducts: currentProducts,
            revenueChange,
            ordersChange,
            usersChange,
            productsChange: 0, // Products don't change over time periods
        };
    }

    // Get product performance analytics
    async getProductAnalytics(query: AnalyticsQuery): Promise<ProductAnalytics> {
        const { startDate, endDate, limit = 10 } = query;

        const [topSellingProducts, categoryPerformance] = await Promise.all([
            this.getTopSellingProducts(startDate, endDate, limit),
            this.getCategoryPerformance(startDate, endDate),
        ]);

        // For low performing products, we'll get products with low sales
        const lowPerformingProducts = await this.getLowPerformingProducts(startDate, endDate, limit);

        return {
            topSellingProducts,
            lowPerformingProducts,
            categoryPerformance,
        };
    }

    // Get sales analytics
    async getSalesAnalytics(query: AnalyticsQuery): Promise<SalesAnalytics> {
        const { startDate, endDate, groupBy = 'day' } = query;

        const [revenueOverTime, paymentMethodDistribution, averageOrderValue] = await Promise.all([
            this.getRevenueOverTime(startDate, endDate, groupBy),
            this.getPaymentMethodDistribution(startDate, endDate),
            this.getAverageOrderValue(startDate, endDate),
        ]);

        return {
            revenueOverTime,
            paymentMethodDistribution,
            averageOrderValue,
            conversionRate: 0, // Would need additional tracking for conversion rate
        };
    }

    // Get user analytics
    async getUserAnalytics(query: AnalyticsQuery): Promise<UserAnalytics> {
        const { startDate, endDate } = query;

        const [userRegistrationTrends, customerSegmentation] = await Promise.all([
            this.getUserRegistrationTrends(startDate, endDate),
            this.getCustomerSegmentation(startDate, endDate),
        ]);

        return {
            userRegistrationTrends,
            customerSegmentation,
            cartAbandonmentRate: 0, // Would need cart tracking for this
            repeatPurchaseRate: await this.getRepeatPurchaseRate(startDate, endDate),
        };
    }

    // Helper methods for data aggregation
    private async getTotalRevenue(startDate: Date, endDate: Date): Promise<number> {
        const result = await prisma.order.aggregate({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
                status: {
                    not: 'cancelled',
                },
            },
            _sum: {
                total: true,
            },
        });

        return Number(result._sum.total) || 0;
    }

    private async getTotalOrders(startDate: Date, endDate: Date): Promise<number> {
        return await prisma.order.count({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
                status: {
                    not: 'cancelled',
                },
            },
        });
    }

    private async getTotalUsers(startDate: Date, endDate: Date): Promise<number> {
        return await prisma.user.count({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
    }

    private async getTotalProducts(): Promise<number> {
        return await prisma.product.count({
            where: {
                isAvailable: true,
            },
        });
    }

    private async getTopSellingProducts(startDate: Date, endDate: Date, limit: number) {
        const result = await prisma.orderItem.groupBy({
            by: ['productId'],
            where: {
                order: {
                    createdAt: {
                        gte: startDate,
                        lte: endDate,
                    },
                    status: {
                        not: 'cancelled',
                    },
                },
            },
            _sum: {
                quantity: true,
            },
            _avg: {
                price: true,
            },
            orderBy: {
                _sum: {
                    quantity: 'desc',
                },
            },
            take: limit,
        });

        // Get product details
        const productIds = result.map(item => item.productId);
        const products = await prisma.product.findMany({
            where: {
                id: {
                    in: productIds,
                },
            },
            include: {
                category: true,
            },
        });

        return result.map(item => {
            const product = products.find(p => p.id === item.productId);
            const totalSold = item._sum.quantity || 0;
            const avgPrice = Number(item._avg.price) || 0;

            return {
                id: item.productId,
                name: product?.name || 'Unknown Product',
                totalSold,
                revenue: totalSold * avgPrice,
                category: product?.category?.name || 'Uncategorized',
            };
        });
    }

    private async getLowPerformingProducts(startDate: Date, endDate: Date, limit: number) {
        // Get products with low or no sales
        const allProducts = await prisma.product.findMany({
            where: {
                isAvailable: true,
            },
            include: {
                orderItems: {
                    where: {
                        order: {
                            createdAt: {
                                gte: startDate,
                                lte: endDate,
                            },
                            status: {
                                not: 'cancelled',
                            },
                        },
                    },
                },
            },
            take: limit * 2, // Get more to filter
        });

        return allProducts
            .map(product => {
                const sales = product.orderItems.reduce((sum, item) => sum + item.quantity, 0);
                return {
                    id: product.id,
                    name: product.name,
                    views: 0, // Would need view tracking
                    sales,
                    conversionRate: 0, // Would need view tracking for this
                };
            })
            .sort((a, b) => a.sales - b.sales)
            .slice(0, limit);
    }

    private async getCategoryPerformance(startDate: Date, endDate: Date) {
        const result = await prisma.category.findMany({
            include: {
                products: {
                    include: {
                        orderItems: {
                            where: {
                                order: {
                                    createdAt: {
                                        gte: startDate,
                                        lte: endDate,
                                    },
                                    status: {
                                        not: 'cancelled',
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        return result.map(category => {
            const totalSales = category.products.reduce(
                (sum, product) => sum + product.orderItems.reduce((itemSum, item) => itemSum + item.quantity, 0),
                0
            );
            const revenue = category.products.reduce(
                (sum, product) => sum + product.orderItems.reduce((itemSum, item) => itemSum + (item.quantity * Number(item.price)), 0),
                0
            );

            return {
                categoryName: category.name,
                totalSales,
                revenue,
                productCount: category.products.length,
            };
        });
    }

    private async getRevenueOverTime(startDate: Date, endDate: Date, groupBy: 'day' | 'week' | 'month') {
        // For simplicity, we'll group by day. In production, you'd want more sophisticated grouping
        const orders = await prisma.order.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
                status: {
                    not: 'cancelled',
                },
            },
            select: {
                createdAt: true,
                total: true,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        // Group by date
        const groupedData = new Map<string, { revenue: number; orders: number }>();

        orders.forEach(order => {
            const date = order.createdAt.toISOString().split('T')[0];
            const existing = groupedData.get(date) || { revenue: 0, orders: 0 };
            groupedData.set(date, {
                revenue: existing.revenue + Number(order.total),
                orders: existing.orders + 1,
            });
        });

        return Array.from(groupedData.entries()).map(([date, data]) => ({
            date,
            revenue: data.revenue,
            orders: data.orders,
        }));
    }

    private async getPaymentMethodDistribution(startDate: Date, endDate: Date) {
        const result = await prisma.order.groupBy({
            by: ['paymentMethod'],
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
                status: {
                    not: 'cancelled',
                },
            },
            _count: {
                paymentMethod: true,
            },
        });

        const total = result.reduce((sum, item) => sum + item._count.paymentMethod, 0);

        return result.map(item => ({
            method: item.paymentMethod,
            count: item._count.paymentMethod,
            percentage: total > 0 ? (item._count.paymentMethod / total) * 100 : 0,
        }));
    }

    private async getAverageOrderValue(startDate: Date, endDate: Date): Promise<number> {
        const result = await prisma.order.aggregate({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
                status: {
                    not: 'cancelled',
                },
            },
            _avg: {
                total: true,
            },
        });

        return Number(result._avg.total) || 0;
    }

    private async getUserRegistrationTrends(startDate: Date, endDate: Date) {
        const users = await prisma.user.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                createdAt: true,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        // Group by date
        const groupedData = new Map<string, number>();
        let totalUsers = 0;

        users.forEach(user => {
            const date = user.createdAt.toISOString().split('T')[0];
            const existing = groupedData.get(date) || 0;
            groupedData.set(date, existing + 1);
            totalUsers++;
        });

        let runningTotal = 0;
        return Array.from(groupedData.entries()).map(([date, newUsers]) => {
            runningTotal += newUsers;
            return {
                date,
                newUsers,
                totalUsers: runningTotal,
            };
        });
    }

    private async getCustomerSegmentation(startDate: Date, endDate: Date) {
        const users = await prisma.user.findMany({
            include: {
                orders: {
                    where: {
                        createdAt: {
                            gte: startDate,
                            lte: endDate,
                        },
                        status: {
                            not: 'cancelled',
                        },
                    },
                },
            },
        });

        let newCustomers = 0;
        let returningCustomers = 0;
        let vipCustomers = 0;

        users.forEach(user => {
            const orderCount = user.orders.length;
            if (orderCount === 0) {
                // Skip users with no orders in this period
            } else if (orderCount === 1) {
                newCustomers++;
            } else if (orderCount <= 5) {
                returningCustomers++;
            } else {
                vipCustomers++;
            }
        });

        return {
            newCustomers,
            returningCustomers,
            vipCustomers,
        };
    }

    private async getRepeatPurchaseRate(startDate: Date, endDate: Date): Promise<number> {
        const users = await prisma.user.findMany({
            include: {
                orders: {
                    where: {
                        createdAt: {
                            gte: startDate,
                            lte: endDate,
                        },
                        status: {
                            not: 'cancelled',
                        },
                    },
                },
            },
        });

        const usersWithOrders = users.filter(user => user.orders.length > 0);
        const usersWithMultipleOrders = users.filter(user => user.orders.length > 1);

        return usersWithOrders.length > 0
            ? (usersWithMultipleOrders.length / usersWithOrders.length) * 100
            : 0;
    }

    private calculatePercentageChange(current: number, previous: number): number {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    }
}

export default new AnalyticsService();