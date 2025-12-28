import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * OneSignal Push Notification API
 * Sends notifications via OneSignal REST API
 * Works even when app is closed
 */

const ONESIGNAL_APP_ID = 'a32aa216-b7f2-4f8b-8e66-77efbf1c45cc';
const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

        if (!REST_API_KEY) {
            return res.status(500).json({
                error: 'OneSignal REST API Key not configured',
                hint: 'Add ONESIGNAL_REST_API_KEY to Vercel environment variables'
            });
        }

        const {
            playerIds,      // Array of OneSignal player IDs
            playerId,       // Single player ID
            segments,       // Array of segments like ["All"]
            title,
            body,
            data,
            url             // Optional: deep link URL
        } = req.body;

        if (!title || !body) {
            return res.status(400).json({ error: 'Title and body are required' });
        }

        // Build notification payload
        const notification: any = {
            app_id: ONESIGNAL_APP_ID,
            headings: { en: title },
            contents: { en: body },
            data: data || {},
        };

        // Add URL if provided
        if (url) {
            notification.url = url;
        }

        // Target: Player IDs, Segments, or All
        if (playerIds && Array.isArray(playerIds) && playerIds.length > 0) {
            notification.include_player_ids = playerIds;
        } else if (playerId) {
            notification.include_player_ids = [playerId];
        } else if (segments && Array.isArray(segments)) {
            notification.included_segments = segments;
        } else {
            // Default: send to all subscribed users
            notification.included_segments = ['Subscribed Users'];
        }

        // Android specific settings
        notification.android_channel_id = 'default';
        notification.priority = 10; // High priority
        notification.android_visibility = 1; // Public

        // Send to OneSignal
        const response = await fetch(ONESIGNAL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${REST_API_KEY}`,
            },
            body: JSON.stringify(notification),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('OneSignal error:', result);
            return res.status(response.status).json({
                success: false,
                error: 'OneSignal API error',
                details: result
            });
        }

        console.log('OneSignal notification sent:', result);
        return res.status(200).json({
            success: true,
            result,
            message: 'Notification sent via OneSignal'
        });

    } catch (error: any) {
        console.error('Error sending OneSignal notification:', error);
        return res.status(500).json({
            error: 'Failed to send notification',
            details: error.message
        });
    }
}
