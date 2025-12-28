/**
 * OneSignal Push Notification Service
 * Works alongside FCM for reliable push notification delivery
 * App ID: a32aa216-b7f2-4f8b-8e66-77efbf1c45cc
 */

import { Capacitor } from '@capacitor/core';

const ONESIGNAL_APP_ID = 'a32aa216-b7f2-4f8b-8e66-77efbf1c45cc';

export const OneSignalService = {
    /**
     * Initialize OneSignal with the app ID
     * Should be called once when the app starts
     */
    async initialize(): Promise<void> {
        if (!Capacitor.isNativePlatform()) {
            console.log('OneSignal: Skipping initialization on web platform');
            return;
        }

        try {
            // Dynamic import to avoid issues on web
            const OneSignal = (window as any).plugins?.OneSignal;

            if (!OneSignal) {
                console.warn('OneSignal plugin not available');
                return;
            }

            // Set log level for debugging (remove in production)
            OneSignal.setLogLevel(6, 0); // VERBOSE, NONE

            // Initialize with App ID
            OneSignal.setAppId(ONESIGNAL_APP_ID);

            // Prompt for push notifications
            OneSignal.promptForPushNotificationsWithUserResponse((accepted: boolean) => {
                console.log('OneSignal: User accepted notifications:', accepted);
            });

            // Handle notification received while app is open
            OneSignal.setNotificationOpenedHandler((jsonData: any) => {
                console.log('OneSignal: Notification opened:', JSON.stringify(jsonData));
                // Handle deep linking or navigation here
                const data = jsonData?.notification?.additionalData;
                if (data?.loanId) {
                    // Navigate to loan details
                    window.location.href = `/loan/details/${data.loanId}`;
                }
            });

            // Handle notification received in foreground
            OneSignal.setNotificationWillShowInForegroundHandler((notificationReceivedEvent: any) => {
                console.log('OneSignal: Notification received in foreground:', notificationReceivedEvent);
                const notification = notificationReceivedEvent.getNotification();

                // Display the notification (don't complete to show system notification)
                notificationReceivedEvent.complete(notification);
            });

            // Get player ID (OneSignal user ID) for sending targeted notifications
            const deviceState = await new Promise<any>((resolve) => {
                OneSignal.getDeviceState((state: any) => resolve(state));
            });

            if (deviceState?.userId) {
                localStorage.setItem('onesignal_player_id', deviceState.userId);
                console.log('OneSignal Player ID:', deviceState.userId);

                // Save to Firestore for sending notifications later
                await this.savePlayerId(deviceState.userId);
            }

            console.log('OneSignal initialized successfully');
        } catch (error) {
            console.error('OneSignal initialization failed:', error);
        }
    },

    /**
     * Save OneSignal Player ID to Firestore
     */
    async savePlayerId(playerId: string): Promise<void> {
        try {
            const { auth, db } = await import('../firebaseConfig');
            const { doc, setDoc, updateDoc } = await import('firebase/firestore');

            const user = auth.currentUser;
            if (user) {
                const userRef = doc(db, 'users', user.uid);
                try {
                    await updateDoc(userRef, { onesignalPlayerId: playerId });
                } catch (e) {
                    await setDoc(userRef, { onesignalPlayerId: playerId, email: user.email }, { merge: true });
                }
                console.log('OneSignal Player ID saved to Firestore');
            } else {
                // For customer portal
                const customerId = localStorage.getItem('customerPortalId');
                if (customerId) {
                    const custRef = doc(db, 'customers', customerId);
                    await updateDoc(custRef, { onesignalPlayerId: playerId }).catch(() => { });
                }
            }
        } catch (error) {
            console.error('Error saving OneSignal Player ID:', error);
        }
    },

    /**
     * Get stored Player ID
     */
    getPlayerId(): string | null {
        return localStorage.getItem('onesignal_player_id');
    },

    /**
     * Set external user ID (link OneSignal to your app's user ID)
     */
    async setExternalUserId(userId: string): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;

        try {
            const OneSignal = (window as any).plugins?.OneSignal;
            if (OneSignal) {
                OneSignal.setExternalUserId(userId);
                console.log('OneSignal external user ID set:', userId);
            }
        } catch (error) {
            console.error('Error setting external user ID:', error);
        }
    },

    /**
     * Send a tag for user segmentation
     */
    async sendTag(key: string, value: string): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;

        try {
            const OneSignal = (window as any).plugins?.OneSignal;
            if (OneSignal) {
                OneSignal.sendTag(key, value);
                console.log(`OneSignal tag sent: ${key}=${value}`);
            }
        } catch (error) {
            console.error('Error sending tag:', error);
        }
    },

    /**
     * Send notification via OneSignal Vercel API
     */
    async sendNotification(playerId: string, title: string, message: string, data?: any): Promise<boolean> {
        try {
            const isProduction = window.location.hostname !== 'localhost';
            const API_URL = isProduction
                ? 'https://git-import.vercel.app/api/onesignal-notification'
                : '/api/onesignal-notification';

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerId,
                    title,
                    body: message,
                    data,
                }),
            });

            const result = await response.json();
            console.log('OneSignal notification result:', result);
            return result.success === true;
        } catch (error) {
            console.error('Error sending OneSignal notification:', error);
            return false;
        }
    },

    /**
     * Send notification to multiple users
     */
    async sendToMultiple(playerIds: string[], title: string, message: string, data?: any): Promise<boolean> {
        try {
            const isProduction = window.location.hostname !== 'localhost';
            const API_URL = isProduction
                ? 'https://git-import.vercel.app/api/onesignal-notification'
                : '/api/onesignal-notification';

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerIds,
                    title,
                    body: message,
                    data,
                }),
            });

            const result = await response.json();
            return result.success === true;
        } catch (error) {
            console.error('Error sending OneSignal notifications:', error);
            return false;
        }
    },

    /**
     * Send notification to all subscribed users
     */
    async sendToAll(title: string, message: string, data?: any): Promise<boolean> {
        try {
            const isProduction = window.location.hostname !== 'localhost';
            const API_URL = isProduction
                ? 'https://git-import.vercel.app/api/onesignal-notification'
                : '/api/onesignal-notification';

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    segments: ['Subscribed Users'],
                    title,
                    body: message,
                    data,
                }),
            });

            const result = await response.json();
            return result.success === true;
        } catch (error) {
            console.error('Error sending broadcast notification:', error);
            return false;
        }
    },

    /**
     * Send EMI Reminder via OneSignal
     */
    async sendEMIReminder(playerId: string, customerName: string, amount: number, dueDate: string, loanId: string): Promise<boolean> {
        return this.sendNotification(
            playerId,
            '💰 EMI Payment Reminder',
            `Dear ${customerName}, your EMI of ₹${amount.toLocaleString('en-IN')} is due on ${dueDate}.`,
            { type: 'emi_reminder', loanId, amount: amount.toString(), dueDate }
        );
    },

    /**
     * Send Payment Received via OneSignal
     */
    async sendPaymentReceived(playerId: string, customerName: string, amount: number, receiptNo: string): Promise<boolean> {
        return this.sendNotification(
            playerId,
            '✅ Payment Received',
            `Dear ${customerName}, we received ₹${amount.toLocaleString('en-IN')}. Receipt: ${receiptNo}`,
            { type: 'payment_received', receiptNo, amount: amount.toString() }
        );
    }
};
