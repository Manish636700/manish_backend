export interface AnalyticsOverview {
    totalRevenue: number;
    totalOrders: number;
    totalUsers: number;
    totalProducts: number;
    revenueChange: number;
    ordersChange: number;
    usersChange: number;
    productsChange: number;
}

export interface ProductAnalytics {
    topSellingProducts: Array<{
        id: number;
        name: string;
        totalSold: number;
        revenue: number;
        category: string;
    }>;
    lowPerformingProducts: Array<{
        id: number;
        name: string;
        views: number;
        sales: number;
        conversionRate: number;
    }>;
    categoryPerformance: Array<{
        categoryName: string;
        totalSales: number;
        revenue: number;
        productCount: number;
    }>;
}

export interface SalesAnalytics {
    revenueOverTime: Array<{
        date: string;
        revenue: number;
        orders: number;
    }>;
    paymentMethodDistribution: Array<{
        method: string;
        count: number;
        percentage: number;
    }>;
    averageOrderValue: number;
    conversionRate: number;
}

export interface UserAnalytics {
    userRegistrationTrends: Array<{
        date: string;
        newUsers: number;
        totalUsers: number;
    }>;
    customerSegmentation: {
        newCustomers: number;
        returningCustomers: number;
        vipCustomers: number;
    };
    cartAbandonmentRate: number;
    repeatPurchaseRate: number;
}

export interface DateRange {
    startDate: Date;
    endDate: Date;
}

export interface AnalyticsQuery extends DateRange {
    limit?: number;
    groupBy?: 'day' | 'week' | 'month';
}