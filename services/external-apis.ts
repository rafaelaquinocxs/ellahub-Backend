// WhatsApp Business API
export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string,
  accessToken: string,
  phoneNumberId: string
) {
  const response = await fetch(
    `https://graph.instagram.com/v18.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "text",
        text: { body: message },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`WhatsApp Error: ${response.statusText}`);
  }

  return await response.json();
}

// Email via Mailgun
export async function sendEmailMailgun(
  to: string,
  subject: string,
  html: string,
  domain: string,
  apiKey: string
) {
  const formData = new FormData();
  formData.append("from", `noreply@${domain}`);
  formData.append("to", to);
  formData.append("subject", subject);
  formData.append("html", html);

  const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Mailgun Error: ${response.statusText}`);
  }

  return await response.json();
}

// Email via SendGrid
export async function sendEmailSendGrid(
  to: string,
  subject: string,
  html: string,
  apiKey: string
) {
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: "noreply@datapay.com" },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });

  if (!response.ok) {
    throw new Error(`SendGrid Error: ${response.statusText}`);
  }

  return await response.json();
}

// Salesforce CRM
export async function createSalesforceTask(
  instanceUrl: string,
  accessToken: string,
  taskData: {
    subject: string;
    description: string;
    whoId?: string;
    whatId?: string;
    dueDate?: string;
    priority?: string;
  }
) {
  const response = await fetch(`${instanceUrl}/services/data/v57.0/sobjects/Task`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(taskData),
  });

  if (!response.ok) {
    throw new Error(`Salesforce Error: ${response.statusText}`);
  }

  return await response.json();
}

// HubSpot CRM
export async function createHubSpotContact(
  accessToken: string,
  contactData: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    company?: string;
  }
) {
  const response = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        email: contactData.email,
        firstname: contactData.firstName,
        lastname: contactData.lastName,
        phone: contactData.phone,
        company: contactData.company,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HubSpot Error: ${response.statusText}`);
  }

  return await response.json();
}

export async function createHubSpotTask(
  accessToken: string,
  taskData: {
    subject: string;
    description: string;
    dueDate: string;
    priority: "LOW" | "MEDIUM" | "HIGH";
    associatedContactId?: string;
  }
) {
  const response = await fetch("https://api.hubapi.com/crm/v3/objects/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        hs_task_subject: taskData.subject,
        hs_task_body: taskData.description,
        hs_task_due_date: taskData.dueDate,
        hs_task_priority: taskData.priority,
      },
      associations: taskData.associatedContactId
        ? [
            {
              types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 1 }],
              id: taskData.associatedContactId,
            },
          ]
        : [],
    }),
  });

  if (!response.ok) {
    throw new Error(`HubSpot Error: ${response.statusText}`);
  }

  return await response.json();
}

// Notification System
export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
}

const notifications = new Map<string, Notification[]>();

export function createNotification(
  userId: string,
  type: "success" | "error" | "warning" | "info",
  title: string,
  message: string
): Notification {
  const notification: Notification = {
    id: `notif-${Date.now()}`,
    type,
    title,
    message,
    createdAt: new Date(),
    read: false,
  };

  if (!notifications.has(userId)) {
    notifications.set(userId, []);
  }

  notifications.get(userId)!.push(notification);

  // Manter apenas últimas 50 notificações
  const userNotifs = notifications.get(userId)!;
  if (userNotifs.length > 50) {
    userNotifs.shift();
  }

  return notification;
}

export function getNotifications(userId: string): Notification[] {
  return notifications.get(userId) || [];
}

export function markNotificationAsRead(userId: string, notificationId: string): boolean {
  const userNotifs = notifications.get(userId);
  if (!userNotifs) return false;

  const notif = userNotifs.find((n) => n.id === notificationId);
  if (notif) {
    notif.read = true;
    return true;
  }

  return false;
}

export function clearNotifications(userId: string): void {
  notifications.delete(userId);
}
