/**
 * Push Notification API Client
 * Calls the Vercel serverless function to send FCM push notifications
 * This works even when the app is closed because the server sends the notification
 */

const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
const API_URL = isProduction
    ? 'https://git-import.vercel.app/api/send-notification'
    : '/api/send-notification';


interface NotificationResponse {
    success: boolean;
    result?: any;
    message?: string;
    error?: string;
}

/**
 * Send push notification to a single device
 */
export async function sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>
): Promise<NotificationResponse> {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token,
                title,
                body,
                data,
            }),
        });

        return await response.json();
    } catch (error: any) {
        console.error('Failed to send push notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send push notification to multiple devices
 */
export async function sendMultiplePushNotifications(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>
): Promise<NotificationResponse> {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tokens,
                title,
                body,
                data,
            }),
        });

        return await response.json();
    } catch (error: any) {
        console.error('Failed to send push notifications:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send push notification to all users subscribed to a topic
 */
export async function sendTopicNotification(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>
): Promise<NotificationResponse> {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                topic,
                title,
                body,
                data,
            }),
        });

        return await response.json();
    } catch (error: any) {
        console.error('Failed to send topic notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Helper: Send Installment due reminder to a specific customer
 */
export async function sendInstallmentReminderNotification(
    customerFcmToken: string,
    customerName: string,
    amount: number,
    dueDate: string,
    recordId: string
): Promise<NotificationResponse> {
    return sendPushNotification(
        customerFcmToken,
        'Payment Reminder',
        `Dear ${customerName}, your scheduled payment of ₹${amount.toLocaleString('en-IN')} is due on ${dueDate}. Please update your record.`,
        {
            type: 'inst_reminder',
            recordId,
            amount: amount.toString(),
            dueDate,
        }
    );
}

/**
 * Helper: Send payment received notification
 */
export async function sendPaymentReceivedNotification(
    customerFcmToken: string,
    customerName: string,
    amount: number,
    receiptNo: string
): Promise<NotificationResponse> {
    return sendPushNotification(
        customerFcmToken,
        'Payment Received',
        `Dear ${customerName}, we have received your payment of ₹${amount.toLocaleString('en-IN')}. Ref: ${receiptNo}. Thank you.`,
        {
            type: 'payment_received',
            receiptNo,
            amount: amount.toString(),
        }
    );
}

/**
 * Helper: Send record approved notification
 */
export async function sendRecordApprovedNotification(
    customerFcmToken: string,
    customerName: string,
    recordAmount: number,
    recordId: string
): Promise<NotificationResponse> {
    return sendPushNotification(
        customerFcmToken,
        'Record Verified',
        `Dear ${customerName}, your record of ₹${recordAmount.toLocaleString('en-IN')} has been verified. Check your app for details.`,
        {
            type: 'record_approved',
            recordId,
            amount: recordAmount.toString(),
        }
    );
}

/**
 * Helper: Send overdue payment alert to admin
 */
export async function sendOverdueAlertToAdmin(
    adminFcmToken: string,
    customerName: string,
    amount: number,
    daysPastDue: number,
    recordId: string
): Promise<NotificationResponse> {
    return sendPushNotification(
        adminFcmToken,
        'Overdue Payment Alert',
        `${customerName}'s payment of ₹${amount.toLocaleString('en-IN')} is ${daysPastDue} days overdue.`,
        {
            type: 'overdue_alert',
            recordId,
            customerName,
            daysPastDue: daysPastDue.toString(),
        }
    );
}
