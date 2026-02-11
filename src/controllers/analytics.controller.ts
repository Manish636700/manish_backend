import { Request, Response } from "express";
import analyticsService from "@/services/analyticsService";
import { DateRange } from "@/types/analytics.types";

// Helper function to parse date range from query parameters
const parseDateRange = (req: Request): DateRange => {
    const { startDate, endDate } = req.query;

    let start: Date;
    let end: Date;

    if (startDate && endDate) {
        start = new Date(startDate as string);
        end = new Date(endDate as string);
    } else {
        // Default to last 30 days
        end = new Date();
        start = new Date();
        start.setDate(start.getDate() - 30);
    }

    // Ensure end date is end of day
    end.setHours(23, 59, 59, 999);
    // Ensure start date is start of day
    start.setHours(0, 0, 0, 0);

    return { startDate: start, endDate: end };
};

// Get overview analytics
export const getOverviewAnalytics = async (req: Request, res: Response) => {
    try {
        const dateRange = parseDateRange(req);
        const data = await analyticsService.getOverviewAnalytics(dateRange);

        res.json({
            data,
            dateRange: {
                startDate: dateRange.startDate.toISOString(),
                endDate: dateRange.endDate.toISOString(),
            },
        });
    } catch (err: any) {
        console.error("Error fetching overview analytics:", err);
        res.status(500).json({ error: err.message });
    }
};

// Get product analytics
export const getProductAnalytics = async (req: Request, res: Response) => {
    try {
        const dateRange = parseDateRange(req);
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

        const data = await analyticsService.getProductAnalytics({
            ...dateRange,
            limit,
        });

        res.json({
            data,
            dateRange: {
                startDate: dateRange.startDate.toISOString(),
                endDate: dateRange.endDate.toISOString(),
            },
        });
    } catch (err: any) {
        console.error("Error fetching product analytics:", err);
        res.status(500).json({ error: err.message });
    }
};

// Get sales analytics
export const getSalesAnalytics = async (req: Request, res: Response) => {
    try {
        const dateRange = parseDateRange(req);
        const groupBy = (req.query.groupBy as 'day' | 'week' | 'month') || 'day';

        const data = await analyticsService.getSalesAnalytics({
            ...dateRange,
            groupBy,
        });

        res.json({
            data,
            dateRange: {
                startDate: dateRange.startDate.toISOString(),
                endDate: dateRange.endDate.toISOString(),
            },
        });
    } catch (err: any) {
        console.error("Error fetching sales analytics:", err);
        res.status(500).json({ error: err.message });
    }
};

// Get user analytics
export const getUserAnalytics = async (req: Request, res: Response) => {
    try {
        const dateRange = parseDateRange(req);

        const data = await analyticsService.getUserAnalytics(dateRange);

        res.json({
            data,
            dateRange: {
                startDate: dateRange.startDate.toISOString(),
                endDate: dateRange.endDate.toISOString(),
            },
        });
    } catch (err: any) {
        console.error("Error fetching user analytics:", err);
        res.status(500).json({ error: err.message });
    }
};