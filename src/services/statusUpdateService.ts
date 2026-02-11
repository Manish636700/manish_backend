import prisma from "@/configs/db";
import delhiveryService from "./delhiveryService";

interface StatusUpdateJob {
  orderId: number;
  waybillNumber: string;
  lastChecked: Date;
  retryCount: number;
}

class StatusUpdateService {
  private updateInterval: number = 30 * 60 * 1000; // 30 minutes
  private maxRetries: number = 5;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  // Start the automated status update service
  start(): void {
    if (this.isRunning) {
      console.log("Status update service is already running");
      return;
    }

    console.log("Starting automated status update service...");
    this.isRunning = true;

    // Run immediately on start
    this.updateAllOrderStatuses();

    // Set up interval for regular updates
    this.intervalId = setInterval(() => {
      this.updateAllOrderStatuses();
    }, this.updateInterval);

    console.log(
      `Status update service started. Checking every ${
        this.updateInterval / 60000
      } minutes.`
    );
  }

  // Stop the service
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("Status update service stopped");
  }

  // Update status for all orders with waybill numbers
  private async updateAllOrderStatuses(): Promise<void> {
    try {
      console.log("Starting batch status update...");

      // Get all orders with waybill numbers that are not delivered or cancelled
      const orders = await prisma.order.findMany({
        where: {
          AND: [
            { waybillNumber: { not: "" } },
            { waybillNumber: { not: null } },
            { status: { notIn: ["delivered", "cancelled"] } },
          ],
        },
        select: {
          id: true,
          waybillNumber: true,
          status: true,
          updatedAt: true,
        },
      });

      console.log(`Found ${orders.length} orders to check`);

      const updatePromises = orders.map((order) =>
        this.updateOrderStatus(order)
      );
      await Promise.allSettled(updatePromises);

      console.log("Batch status update completed");
    } catch (error) {
      console.error("Error in batch status update:", error);
    }
  }

  // Update status for a single order
  private async updateOrderStatus(order: {
    id: number;
    waybillNumber: string | null;
    status: string;
    updatedAt: Date;
  }): Promise<void> {
    try {
      if (!order.waybillNumber) {
        console.log(`Order ${order.id} has no waybill number, skipping`);
        return;
      }

      console.log(
        `Checking status for order ${order.id} with waybill ${order.waybillNumber}`
      );

      const trackingData = await delhiveryService.trackShipment(
        order.waybillNumber
      );

      if (!trackingData) {
        console.log(`No tracking data found for order ${order.id}`);
        return;
      }

      const newStatus = trackingData.internalStatus;

      // Only update if status has changed
      if (newStatus !== order.status) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: newStatus,
            updatedAt: new Date(),
          },
        });

        console.log(
          `Updated order ${order.id} status from ${order.status} to ${newStatus}`
        );
        console.log(
          `Delhivery status: ${trackingData.status} at ${trackingData.statusDateTime}`
        );

        // Log the status change for audit
        await this.logStatusChange(
          order.id,
          order.status,
          newStatus,
          trackingData
        );
      } else {
        console.log(`Order ${order.id} status unchanged: ${order.status}`);
      }
    } catch (error: any) {
      console.error(
        `Error updating status for order ${order.id}:`,
        error.message
      );

      // Increment retry count and potentially mark for manual review
      await this.handleUpdateError(order.id, error.message);
    }
  }

  // Log status changes for audit trail
  private async logStatusChange(
    orderId: number,
    oldStatus: string,
    newStatus: string,
    trackingData: any
  ): Promise<void> {
    try {
      // You can create a separate StatusLog table if needed
      console.log(
        `Status Change Log - Order ${orderId}: ${oldStatus} → ${newStatus}`
      );
      console.log(
        `Delhivery Details: ${trackingData.status} at ${trackingData.statusDateTime}`
      );
      console.log(`Instructions: ${trackingData.instructions}`);
    } catch (error) {
      console.error("Error logging status change:", error);
    }
  }

  // Handle update errors and retry logic
  private async handleUpdateError(
    orderId: number,
    errorMessage: string
  ): Promise<void> {
    try {
      // You could implement retry logic here
      // For now, just log the error
      console.error(`Failed to update order ${orderId}: ${errorMessage}`);

      // If this is a critical error, you might want to:
      // 1. Send notification to admin
      // 2. Mark order for manual review
      // 3. Implement exponential backoff
    } catch (error) {
      console.error("Error handling update error:", error);
    }
  }

  // Manual status update for specific order
  async updateSingleOrder(orderId: number): Promise<{
    success: boolean;
    oldStatus?: string;
    newStatus?: string;
    error?: string;
  }> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          waybillNumber: true,
          status: true,
        },
      });

      if (!order) {
        return { success: false, error: "Order not found" };
      }

      if (!order.waybillNumber) {
        return { success: false, error: "No waybill number found" };
      }

      const trackingData = await delhiveryService.trackShipment(
        order.waybillNumber
      );

      if (!trackingData) {
        return { success: false, error: "No tracking data found" };
      }

      const newStatus = trackingData.internalStatus;

      if (newStatus !== order.status) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: newStatus,
            updatedAt: new Date(),
          },
        });

        await this.logStatusChange(
          orderId,
          order.status,
          newStatus,
          trackingData
        );

        return {
          success: true,
          oldStatus: order.status,
          newStatus: newStatus,
        };
      } else {
        return {
          success: true,
          oldStatus: order.status,
          newStatus: order.status,
        };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Get service status
  getStatus(): { isRunning: boolean; nextUpdate?: Date } {
    return {
      isRunning: this.isRunning,
      nextUpdate: this.intervalId
        ? new Date(Date.now() + this.updateInterval)
        : undefined,
    };
  }
}

export default new StatusUpdateService();
