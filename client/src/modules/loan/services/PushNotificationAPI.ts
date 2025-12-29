/**
 * Push Notification API Client
 * Calls the Vercel serverless function to send FCM push notifications
 * This works even when the app is closed because the server sends the notification
 */

const API_URL = import.meta.env.PROD
    ? 'https://git-import.vercel.app/api/send-notification'
    : '/api/send-notification';

interface NotificationPayload {
    token?: string;
    tokens?: string[];
    topic?: string;
    title: string;
    body: string;
    data?: Record<string, string>;
}

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
 * Helper: Send EMI due reminder to a specific customer
 */
export async function sendEMIReminderNotification(
    customerFcmToken: string,
    customerName: string,
    amount: number,
    dueDate: string,
    loanId: string
): Promise<NotificationResponse> {
    return sendPushNotification(
        customerFcmToken,
        '💰 Installment Payment Reminder',
        `Dear ${customerName}, your installment of ₹${amount.toLocaleString('en-IN')} is due on ${dueDate}. Please make the payment to avoid late fees.`,
        {
            type: 'emi_reminder',
            loanId,
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
        '✅ Payment Received',
        `Dear ${customerName}, we have received your payment of ₹${amount.toLocaleString('en-IN')}. Receipt No: ${receiptNo}. Thank you!`,
        {
            type: 'payment_received',
            receiptNo,
            amount: amount.toString(),
        }
    );
}

/**
 * Helper: Send loan approved notification
 */
export async function sendLoanApprovedNotification(
    customerFcmToken: string,
    customerName: string,
    loanAmount: number,
    loanId: string
): Promise<NotificationResponse> {
    return sendPushNotification(
        customerFcmToken,
        '🎉 Record Approved!',
        `Congratulations ${customerName}! Your credit of ₹${loanAmount.toLocaleString('en-IN')} has been approved. Check your app for details.`,
        {
            type: 'loan_approved',
            loanId,
            amount: loanAmount.toString(),
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
    loanId: string
): Promise<NotificationResponse> {
    return sendPushNotification(
        adminFcmToken,
        '⚠️ Overdue Installment Alert',
        `${customerName}'s installment of ₹${amount.toLocaleString('en-IN')} is ${daysPastDue} days overdue. Immediate follow-up required.`,
        {
            type: 'overdue_alert',
            loanId,
            customerName,
            daysPastDue: daysPastDue.toString(),
        }
    );
}
