/**
 * Notification Service - Manages daily sales notifications
 * Sends a daily notification at 9 PM with yesterday's sales summary
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { StorageService } from './storageService';
import { format } from 'date-fns';

export interface DailySalesSummary {
    totalSales: number;
    totalInvoices: number;
    totalReceived: number;
    date: string;
}

export const NotificationService = {
    /**
     * Initialize notification service and request permissions
     */
    async initialize(): Promise<void> {
        if (!Capacitor.isNativePlatform()) {
            console.log('Notifications only work on native platforms');
            return;
        }

        try {
            // Request permissions
            const permissionStatus = await LocalNotifications.requestPermissions();

            if (permissionStatus.display === 'granted') {
                console.log('Notification permissions granted');

                // Schedule daily notification
                await this.scheduleDailyNotification();
            } else {
                console.log('Notification permissions denied');
            }
        } catch (error) {
            console.error('Failed to initialize notifications:', error);
        }
    },

    /**
     * Schedule daily notification at 9 PM
     */
    async scheduleDailyNotification(): Promise<void> {
        try {
            // Cancel existing daily notifications
            await LocalNotifications.cancel({ notifications: [{ id: 1 }] });

            // Schedule notification for 9 PM daily
            const now = new Date();
            let scheduledTime = new Date();
            scheduledTime.setHours(21, 0, 0, 0); // 9 PM

            // If 9 PM has already passed today, schedule for tomorrow
            if (scheduledTime <= now) {
                scheduledTime.setDate(scheduledTime.getDate() + 1);
            }

            await LocalNotifications.schedule({
                notifications: [
                    {
                        id: 1,
                        title: '📊 Daily Sales Report',
                        body: 'Tap to view your sales summary',
                        schedule: {
                            at: scheduledTime,
                            every: 'day',
                        },
                        channelId: 'daily-sales',
                        smallIcon: 'ic_stat_name',
                        iconColor: '#4285F4',
                        sound: 'default',
                    },
                ],
            });

            console.log('Daily notification scheduled for:', scheduledTime);
        } catch (error) {
            console.error('Failed to schedule daily notification:', error);
        }
    },

    /**
     * Send immediate notification with sales summary
     */
    async sendSalesSummaryNotification(summary: DailySalesSummary): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;

        try {
            const message = summary.totalInvoices > 0
                ? `${summary.totalInvoices} bills • ₹${summary.totalSales.toFixed(0)} sales • ₹${summary.totalReceived.toFixed(0)} received`
                : 'No sales recorded yesterday';

            await LocalNotifications.schedule({
                notifications: [
                    {
                        id: Date.now(),
                        title: `📈 ${summary.date} Sales`,
                        body: message,
                        channelId: 'daily-sales',
                        smallIcon: 'ic_stat_name',
                        iconColor: '#4285F4',
                        sound: 'default',
                    },
                ],
            });
        } catch (error) {
            console.error('Failed to send sales summary notification:', error);
        }
    },

    /**
     * Calculate yesterday's sales summary
     */
    async getYesterdaySalesSummary(): Promise<DailySalesSummary> {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

        const allInvoices = await StorageService.getInvoices();
        const allPayments = await StorageService.getPayments();

        // Filter invoices from yesterday
        const yesterdayInvoices = allInvoices.filter(inv =>
            inv.date.startsWith(yesterdayStr)
        );

        const totalSales = yesterdayInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const totalInvoices = yesterdayInvoices.length;

        // Filter payments from yesterday
        const yesterdayPayments = allPayments.filter(payment =>
            payment.date.startsWith(yesterdayStr) && payment.type === 'RECEIVED'
        );

        const totalReceived = yesterdayPayments.reduce((sum, payment) => sum + payment.amount, 0);

        return {
            totalSales,
            totalInvoices,
            totalReceived,
            date: format(yesterday, 'dd MMM yyyy'),
        };
    },

    /**
     * Create notification channels (Android)
     */
    async createChannels(): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;

        try {
            const channels = await LocalNotifications.listChannels();
            console.log('Existing channels:', channels);

            // Create daily sales channel if it doesn't exist
            if (!channels.channels.find(ch => ch.id === 'daily-sales')) {
                await LocalNotifications.createChannel({
                    id: 'daily-sales',
                    name: 'Daily Sales Reports',
                    description: 'Daily notifications with sales summary',
                    importance: 4, // High importance
                    visibility: 1, // Public
                    sound: 'default',
                    vibration: true,
                });
                console.log('Created daily-sales channel');
            }

            // Create updates channel
            if (!channels.channels.find(ch => ch.id === 'app-updates')) {
                await LocalNotifications.createChannel({
                    id: 'app-updates',
                    name: 'App Updates',
                    description: 'Notifications about new features and updates',
                    importance: 3, // Default importance
                    visibility: 1, // Public
                    sound: 'default',
                    vibration: true,
                });
                console.log('Created app-updates channel');
            }
        } catch (error) {
            console.error('Failed to create notification channels:', error);
        }
    },

    /**
     * Send update notification
     */
    async sendUpdateNotification(version: string, message: string): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;

        try {
            await LocalNotifications.schedule({
                notifications: [
                    {
                        id: Date.now(),
                        title: `🎉 BillBook Updated - v${version}`,
                        body: message,
                        channelId: 'app-updates',
                        smallIcon: 'ic_stat_name',
                        iconColor: '#4285F4',
                        sound: 'default',
                    },
                ],
            });
        } catch (error) {
            console.error('Failed to send update notification:', error);
        }
    },

    /**
     * Handle notification tap
     */
    setupNotificationListeners(): void {
        if (!Capacitor.isNativePlatform()) return;

        LocalNotifications.addListener('localNotificationActionPerformed', async (notification) => {
            console.log('Notification tapped:', notification);

            // Handle based on notification ID or channel
            if (notification.notification.channelId === 'daily-sales') {
                // Navigate to dashboard/reports
                window.location.hash = '#/dashboard';
            } else if (notification.notification.channelId === 'app-updates') {
                // Show changelog
                StorageService.setShouldShowChangelog(true);
            }
        });
    },

    /**
     * Check and send daily notification if needed
     */
    async checkAndSendDailyNotification(): Promise<void> {
        const lastNotificationDate = await StorageService.getLastNotificationDate();
        const today = format(new Date(), 'yyyy-MM-dd');

        if (lastNotificationDate !== today) {
            const summary = await this.getYesterdaySalesSummary();
            await this.sendSalesSummaryNotification(summary);
            await StorageService.setLastNotificationDate(today);
        }
    },
};
