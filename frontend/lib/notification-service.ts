/**
 * NotificationService — Automated messaging + phone call system.
 * 
 * Handles:
 * - Automatic SMS notifications to users near faults
 * - Phone call alerts for critical faults
 * - Operator assignment notifications
 * - KSEB worker dispatch alerts
 * 
 * In production, this would integrate with Twilio (SMS/call) and Firebase (push).
 * For now, it logs to console and stores in localStorage for demo purposes.
 */

export interface Notification {
  id: string;
  type: "sms" | "call" | "push" | "email";
  recipient: string;
  recipientName: string;
  message: string;
  status: "pending" | "sent" | "delivered" | "failed";
  timestamp: string;
  priority: "low" | "medium" | "high" | "critical";
  relatedFaultId?: string;
}

export interface NearbyUser {
  id: string;
  name: string;
  phone: string;
  pincode: string;
  locality: string;
  distanceKm: number;
}

// Simulated user database for proximity alerts
const MOCK_USERS: NearbyUser[] = [
  { id: "U001", name: "Rahul Sharma", phone: "+91 98765 43210", pincode: "670632", locality: "Chelimparambu", distanceKm: 0.5 },
  { id: "U002", name: "Priya Menon", phone: "+91 98765 43211", pincode: "670632", locality: "Chemberi", distanceKm: 1.2 },
  { id: "U003", name: "Ajay Kumar", phone: "+91 98765 43212", pincode: "670632", locality: "Kuniyampuzha", distanceKm: 0.8 },
  { id: "U004", name: "Sneha Raj", phone: "+91 98765 43213", pincode: "670631", locality: "Chempanthotty", distanceKm: 1.5 },
  { id: "U005", name: "Ravi Menon", phone: "+91 98765 43214", pincode: "670631", locality: "Chempanthotty", distanceKm: 0.3 },
  { id: "U006", name: "Anitha Nair", phone: "+91 98765 43215", pincode: "670650", locality: "Kolayad", distanceKm: 2.0 },
  { id: "U007", name: "Deepak Pillai", phone: "+91 98765 43216", pincode: "670650", locality: "Kolayad", distanceKm: 1.0 },
];

// Pincode to device mapping
const PINCODE_DEVICE_MAP: Record<string, string> = {
  "670632": "ESP32-POLE-01",
  "670631": "ESP32-POLE-02",
  "670650": "ESP32-POLE-03",
};

export class NotificationService {
  private notifications: Notification[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify() {
    this.listeners.forEach((l) => l());
    this.saveToStorage();
  }

  private loadFromStorage() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ltfx_notifications");
      if (stored) {
        try { this.notifications = JSON.parse(stored); } catch { /* ignore */ }
      }
    }
  }

  private saveToStorage() {
    if (typeof window !== "undefined") {
      localStorage.setItem("ltfx_notifications", JSON.stringify(this.notifications.slice(-50)));
    }
  }

  getNotifications(): Notification[] {
    return [...this.notifications].reverse();
  }

  getPendingCount(): number {
    return this.notifications.filter((n) => n.status === "pending").length;
  }

  /**
   * Send automatic SMS to all users within a radius of a fault location.
   */
  async sendProximityAlerts(faultPincode: string, faultType: string, radiusKm: number = 2.0): Promise<Notification[]> {
    const nearbyUsers = MOCK_USERS.filter((u) => u.pincode === faultPincode && u.distanceKm <= radiusKm);
    const sent: Notification[] = [];

    for (const user of nearbyUsers) {
      const message = this.buildFaultMessage(user.name, faultType, faultPincode);
      const notification = await this.sendSMS(user.phone, user.name, message, "high");
      notification.relatedFaultId = `${faultPincode}-${Date.now()}`;
      sent.push(notification);
    }

    // Also send a call for critical faults within 1km
    const criticalUsers = nearbyUsers.filter((u) => u.distanceKm <= 1.0);
    for (const user of criticalUsers) {
      const callMessage = `This is an automated alert from LT-FaultX. A ${faultType} has been detected in your area (${faultPincode}). Electricity may be disrupted. Please check the LT-FaultX website for updates.`;
      await this.sendCall(user.phone, user.name, callMessage);
    }

    return sent;
  }

  /**
   * Send notification to an operator about a new assignment.
   */
  async notifyOperator(operatorPhone: string, operatorName: string, jobId: string, location: string, deadlineMin: number): Promise<Notification> {
    const message = `New assignment: ${jobId} at ${location}. SLA: ${deadlineMin} minutes. Please acknowledge and begin work.`;
    return this.sendSMS(operatorPhone, operatorName, message, "high");
  }

  /**
   * Send notification to KSEB workers about scheduled maintenance.
   */
  async notifyMaintenanceTeam(workerPhone: string, workerName: string, location: string, date: string): Promise<Notification> {
    const message = `Scheduled maintenance at ${location} on ${date}. Please confirm availability and prepare equipment.`;
    return this.sendSMS(workerPhone, workerName, message, "medium");
  }

  /**
   * Send restoration confirmation to affected users.
   */
  async notifyRestorationComplete(pincode: string, locality: string): Promise<Notification[]> {
    const affectedUsers = MOCK_USERS.filter((u) => u.pincode === pincode);
    const sent: Notification[] = [];

    for (const user of affectedUsers) {
      const message = `Electricity has been restored in ${locality} (${pincode}). Thank you for your patience. Report any issues via LT-FaultX.`;
      const notification = await this.sendSMS(user.phone, user.name, message, "medium");
      sent.push(notification);
    }

    return sent;
  }

  private buildFaultMessage(userName: string, faultType: string, pincode: string): string {
    return `Alert for ${userName}: A ${faultType} has been detected in your area (Pincode: ${pincode}). Electricity supply may be affected. We are working to restore it as soon as possible. Track status: lt faultx dot app slash status`;
  }

  private async sendSMS(phone: string, name: string, message: string, priority: Notification["priority"]): Promise<Notification> {
    const notification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "sms",
      recipient: phone,
      recipientName: name,
      message,
      status: "sent",
      timestamp: new Date().toISOString(),
      priority,
    };

    // In production: integrate with Twilio API here
    console.log(`[SMS] To: ${phone} | ${name} | Priority: ${priority}`);
    console.log(`[SMS] Message: ${message}`);

    this.notifications.push(notification);
    this.notify();
    return notification;
  }

  private async sendCall(phone: string, name: string, message: string): Promise<Notification> {
    const notification: Notification = {
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "call",
      recipient: phone,
      recipientName: name,
      message,
      status: "sent",
      timestamp: new Date().toISOString(),
      priority: "critical",
    };

    // In production: integrate with Twilio Voice API here
    console.log(`[CALL] To: ${phone} | ${name} | Initiating voice call...`);
    console.log(`[CALL] Message: ${message}`);

    this.notifications.push(notification);
    this.notify();
    return notification;
  }

  getUsersNearPincode(pincode: string, radiusKm: number = 2.0): NearbyUser[] {
    return MOCK_USERS.filter((u) => u.pincode === pincode && u.distanceKm <= radiusKm);
  }
}

// Singleton instance
export const notificationService = typeof window !== "undefined" ? new NotificationService() : null;
