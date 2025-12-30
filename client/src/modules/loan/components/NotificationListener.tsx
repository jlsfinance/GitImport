import React, { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { LocalNotifications } from '@capacitor/local-notifications';
import { onAuthStateChanged } from 'firebase/auth';

const NotificationListener: React.FC = () => {
    useEffect(() => {
        const checkPerms = async () => {
            try {
                const perm = await LocalNotifications.checkPermissions();
                if (perm.display !== 'granted') {
                    // Only request if not explicitly turned off, or rely on system settings
                    await LocalNotifications.requestPermissions();
                }
                await LocalNotifications.createChannel({
                    id: 'default',
                    name: 'General Alerts',
                    description: 'General system notifications',
                    importance: 5,
                    visibility: 1,
                    sound: 'beep.wav',
                    vibration: true,
                });
            } catch (e) {
                // Ignore web errors
            }
        };
        checkPerms();

        let unsubscribe: any;
        // Debounce timer and queue to prevent notification spam
        let notificationQueue: any[] = [];
        let debounceTimer: any = null;

        const processQueue = async () => {
            if (notificationQueue.length === 0) return;

            // If only 1, show it
            if (notificationQueue.length === 1) {
                const data = notificationQueue[0];
                try {
                    await LocalNotifications.schedule({
                        notifications: [{
                            title: data.title || 'BillBook Update',
                            body: data.message || '',
                            id: Math.floor(Math.random() * 1000000),
                            schedule: { at: new Date(Date.now() + 100) },
                            sound: 'beep.wav',
                            channelId: 'default',
                            smallIcon: 'ic_launcher'
                        }]
                    });
                } catch (e) {
                    console.warn("Local notification failed", e);
                }
            } else {
                // If multiple, show a summary
                try {
                    await LocalNotifications.schedule({
                        notifications: [{
                            title: 'BillBook Updates',
                            body: `You have ${notificationQueue.length} new updates.`,
                            id: Math.floor(Math.random() * 1000000),
                            schedule: { at: new Date(Date.now() + 100) },
                            sound: 'beep.wav',
                            channelId: 'default',
                            smallIcon: 'ic_launcher'
                        }]
                    });
                } catch (e) {
                    console.warn("Local summary notification failed", e);
                }
            }

            // Clear queue
            notificationQueue = [];
            debounceTimer = null;
        };

        const setupListener = (userId: string | null) => {
            const customerId = localStorage.getItem('customerPortalId');
            const recipients = ['all'];
            if (customerId) recipients.push(customerId);
            if (userId) recipients.push(userId);

            const q = query(
                collection(db, 'notifications'),
                where('recipientId', 'in', recipients)
            );

            unsubscribe = onSnapshot(q, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const data = change.doc.data();

                        // Age check (10 mins)
                        const ts = data.date || data.createdAt;
                        const createdAt = ts?.toMillis ? ts.toMillis() : (ts?.seconds ? ts.seconds * 1000 : Date.now());
                        if (Date.now() - createdAt > 600000) return;

                        // Add to queue
                        notificationQueue.push(data);
                    }
                });

                // Reset timer on every new batch
                if (debounceTimer) clearTimeout(debounceTimer);
                // Wait 2 seconds for more notifications to clump together
                debounceTimer = setTimeout(processQueue, 2000);

            }, (error) => {
                console.error("Firestore Listener Error:", error);
            });
        };

        const authUnsub = onAuthStateChanged(auth, (user) => {
            if (unsubscribe) unsubscribe();
            setupListener(user ? user.uid : null);
        });

        return () => {
            if (unsubscribe) unsubscribe();
            if (authUnsub) authUnsub();
            if (debounceTimer) clearTimeout(debounceTimer);
        };
    }, []);

    return null;
};

export default NotificationListener;
