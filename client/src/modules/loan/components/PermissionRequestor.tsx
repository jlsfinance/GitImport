import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';

import { NotificationService } from '../services/NotificationService';
import { OneSignalService } from '../services/OneSignalService';

const PermissionRequestor: React.FC = () => {

    useEffect(() => {
        const requestAllPermissions = async () => {
            if (!Capacitor.isNativePlatform()) return;

            try {
                // 1. Storage / Filesystem (Force Request)
                try {
                    const fsPerms = await Filesystem.requestPermissions();
                    console.log('Storage Permissions Result:', fsPerms);
                } catch (e) {
                    console.warn('Filesystem Permission Error:', e);
                }

                // 2. Camera
                try {
                    const camPerms = await Camera.checkPermissions();
                    if (camPerms.camera !== 'granted' || camPerms.photos !== 'granted') {
                        await Camera.requestPermissions();
                    }
                } catch (e) { console.warn('Camera Error:', e); }

                // 3. Local Notifications
                try {
                    const notifPerms = await LocalNotifications.checkPermissions();
                    if (notifPerms.display !== 'granted') {
                        const result = await LocalNotifications.requestPermissions();
                        console.log('Local Notification Permission:', result);
                    }
                } catch (e) { console.warn('Local Notification Error:', e); }

                // 4. PUSH Notifications (FCM) - CRITICAL for Android 13+
                try {
                    const { PushNotifications } = await import('@capacitor/push-notifications');

                    // Check current permission status
                    const pushStatus = await PushNotifications.checkPermissions();
                    console.log('Push Notification Permission Status:', pushStatus);

                    // Request permission if not granted
                    if (pushStatus.receive !== 'granted') {
                        console.log('Requesting Push Notification permission...');
                        const pushResult = await PushNotifications.requestPermissions();
                        console.log('Push Permission Result:', pushResult);

                        if (pushResult.receive === 'granted') {
                            // Register only after permission is granted
                            await PushNotifications.register();
                            console.log('Push Notifications registered after permission grant');
                        }
                    } else {
                        // Already granted, just register
                        await PushNotifications.register();
                        console.log('Push Notifications registered (already had permission)');
                    }
                } catch (e) {
                    console.warn('Push Notification Error:', e);
                }

            } catch (error) {
                console.error('Error in permission sequence:', error);
            }

            // 5. Full Push Service Registration (sets up listeners and saves token)
            try {
                await NotificationService.registerNotifications();
            } catch (e) {
                console.warn('FCM Push Registration Error:', e);
            }

            // 6. Initialize OneSignal (works alongside FCM)
            try {
                await OneSignalService.initialize();
                console.log('OneSignal initialized successfully');
            } catch (e) {
                console.warn('OneSignal Initialization Error:', e);
            }
        };

        // Small delay to let the app load first
        const timer = setTimeout(() => {
            requestAllPermissions();
        }, 1500); // Slightly longer delay for app to fully initialize

        return () => clearTimeout(timer);
    }, []);

    return null; // Logic only
};

export default PermissionRequestor;
