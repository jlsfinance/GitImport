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
    date: string;
    rawDate: string;
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
     * Schedule daily notification at 9 AM with Last Sale details
     */
    async scheduleDailyNotification(): Promise<void> {
        try {
            // Cancel existing daily notifications
            await LocalNotifications.cancel({ notifications: [{ id: 1 }] });

            // Get Last Sale Details
            const lastSale = await this.getLastSaleSummary();
            const company = StorageService.getCompanyProfile();

            // Schedule notification for 9 AM daily
            const now = new Date();
            const scheduledTime = new Date();
            scheduledTime.setHours(9, 0, 0, 0); // 9 AM

            // If 9 AM has already passed today, schedule for tomorrow
            if (scheduledTime <= now) {
                scheduledTime.setDate(scheduledTime.getDate() + 1);
            }

            const title = lastSale.totalSales > 0
                ? `Last Sale: ₹${lastSale.totalSales.toLocaleString()}`
                : 'Good Morning!';

            const body = lastSale.totalSales > 0
                ? `${company?.name || 'Your Firm'} • ${lastSale.date}\nTap to view Day Book`
                : `Ready to record sales for ${company?.name || 'your firm'}?`;

            await LocalNotifications.schedule({
                notifications: [
                    {
                        id: 1,
                        title: title,
                        body: body,
                        schedule: {
                            at: scheduledTime,
                            every: 'day',
                            allowWhileIdle: true
                        },
                        channelId: 'daily-sales',
                        smallIcon: 'ic_stat_name',
                        iconColor: '#4285F4',
                        sound: 'default',
                        extra: {
                            targetView: 'DAYBOOK',
                            date: lastSale.rawDate
                        }
                    },
                ],
            });

            console.log('Daily notification scheduled for:', scheduledTime);
        } catch (error) {
            console.error('Failed to schedule daily notification:', error);
        }
    },

    /**
     * Send immediate notification with sales summary (Deprecated/Modified)
     */
    async sendSalesSummaryNotification(_summary: DailySalesSummary): Promise<void> {
        // Kept for backward compatibility or testing, but updated logic
        if (!Capacitor.isNativePlatform()) return;
        // Logic same as schedule but immediate
    },

    /**
     * Get Last Sale details
     */
    async getLastSaleSummary(): Promise<DailySalesSummary> {
        const allInvoices = await StorageService.getInvoices();

        // Filter only sales (exclude credit notes)
        const sales = allInvoices.filter(inv => inv.type !== 'CREDIT_NOTE').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (sales.length > 0) {
            const lastSale = sales[0];
            return {
                totalSales: lastSale.total,
                date: format(new Date(lastSale.date), 'dd MMM yyyy'),
                rawDate: lastSale.date.split('T')[0]
            };
        }

        return {
            totalSales: 0,
            date: format(new Date(), 'dd MMM yyyy'),
            rawDate: new Date().toISOString().split('T')[0]
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
            if (notification.notification.channelId === 'daily-sales' || notification.notification.extra?.targetView === 'DAYBOOK') {
                const targetDate = notification.notification.extra?.date;
                // Dispatch event for AccountingApp to handle
                window.dispatchEvent(new CustomEvent('NAVIGATE_TO_VIEW', {
                    detail: {
                        view: 'DAYBOOK',
                        date: targetDate
                    }
                }));
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
            // Removed manual check/send logic as we are relying on scheduled notifications now.
            // But we can ensure schedule is updated.
            await this.scheduleDailyNotification();
            await StorageService.setLastNotificationDate(today);
        }
    },
};
