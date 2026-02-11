import axios from "axios";

interface DelhiveryCredentials {
  apiKey: string;
  baseUrl: string;
}

interface DelhiveryTrackingResponse {
  ShipmentData: Array<{
    ShipmentNumber: string;
    Status: {
      Status: string;
      StatusDateTime: string;
      Instructions: string;
    };
    Consignee: {
      Name: string;
      Address: string;
      City: string;
      State: string;
      Pincode: string;
      Phone: string;
    };
    Origin: {
      Name: string;
      Address: string;
      City: string;
      State: string;
      Pincode: string;
    };
    Destination: {
      Name: string;
      Address: string;
      City: string;
      State: string;
      Pincode: string;
    };
  }>;
}

interface DelhiveryCreateShipmentResponse {
  ShipmentData: Array<{
    ShipmentNumber: string;
    Status: string;
    AWB: string;
  }>;
}

class DelhiveryService {
  private credentials: DelhiveryCredentials;

  constructor() {
    this.credentials = {
      apiKey: process.env.DELHIVERY_API_KEY || "",
      baseUrl: process.env.DELHIVERY_BASE_URL || "https://track.delhivery.com",
    };
  }

  // Map Delhivery status to internal status
  private mapDelhiveryStatus(delhiveryStatus: string): string {
    const statusMap: Record<string, string> = {
      "Pickup Scheduled": "confirmed",
      "Picked Up": "confirmed",
      "In Transit": "shipped",
      "Out for Delivery": "shipped",
      Delivered: "delivered",
      Exception: "processing",
      Undelivered: "processing",
      RTO: "cancelled",
      "RTO Delivered": "cancelled",
      Lost: "cancelled",
      Damaged: "cancelled",
    };

    return statusMap[delhiveryStatus] || "processing";
  }

  // Track shipment status
  async trackShipment(waybillNumber: string): Promise<{
    status: string;
    internalStatus: string;
    statusDateTime: string;
    instructions: string;
    location?: string;
  } | null> {
    try {
      const response = await axios.get(
        `${this.credentials.baseUrl}/api/v1/packages/json`,
        {
          params: {
            token: this.credentials.apiKey,
            waybill: waybillNumber,
          },
          timeout: 10000,
        }
      );

      if (
        !response.data ||
        !response.data.ShipmentData ||
        response.data.ShipmentData.length === 0
      ) {
        console.log(`No tracking data found for waybill: ${waybillNumber}`);
        return null;
      }

      const shipment = response.data.ShipmentData[0];
      const internalStatus = this.mapDelhiveryStatus(shipment.Status.Status);

      return {
        status: shipment.Status.Status,
        internalStatus,
        statusDateTime: shipment.Status.StatusDateTime,
        instructions: shipment.Status.Instructions || "",
        location: `${shipment.Destination.City}, ${shipment.Destination.State}`,
      };
    } catch (error: any) {
      console.error("Delhivery tracking error:", error.message);
      throw new Error(`Failed to track shipment: ${error.message}`);
    }
  }

  // Create shipment (if needed for future automation)
  async createShipment(shipmentData: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    orderId: string;
  }): Promise<{ waybillNumber: string; awb: string } | null> {
    try {
      const payload = {
        shipments: [
          {
            name: shipmentData.name,
            add: shipmentData.address,
            city: shipmentData.city,
            state: shipmentData.state,
            pin: shipmentData.pincode,
            phone: shipmentData.phone,
            order: shipmentData.orderId,
          },
        ],
      };

      const response = await axios.post(
        `${this.credentials.baseUrl}/api/cmu/create.json`,
        payload,
        {
          params: {
            token: this.credentials.apiKey,
          },
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );

      if (
        !response.data ||
        !response.data.ShipmentData ||
        response.data.ShipmentData.length === 0
      ) {
        return null;
      }

      const shipment = response.data.ShipmentData[0];
      return {
        waybillNumber: shipment.ShipmentNumber,
        awb: shipment.AWB,
      };
    } catch (error: any) {
      console.error("Delhivery create shipment error:", error.message);
      throw new Error(`Failed to create shipment: ${error.message}`);
    }
  }

  // Validate credentials
  async validateCredentials(): Promise<boolean> {
    try {
      await axios.get(`${this.credentials.baseUrl}/api/v1/packages/json`, {
        params: {
          token: this.credentials.apiKey,
          waybill: "TEST123", // Test with dummy waybill
        },
        timeout: 5000,
      });
      return true;
    } catch (error: any) {
      // Even if test fails, credentials might be valid for real waybills
      return error.response?.status !== 401;
    }
  }
}

export default new DelhiveryService();
