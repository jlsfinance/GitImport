/**
 * Contacts Service - Privacy-Compliant Contact Suggestions
 * 
 * COMPLIANCE NOTES:
 * - Contacts are read ONLY when user explicitly types in customer name field
 * - NO bulk contact upload to server
 * - NO background contact syncing
 * - Permission requested before first use
 * - Clear disclosure in Privacy Policy
 */

import { Contacts } from '@capacitor-community/contacts';

interface ContactSuggestion {
    name: string;
    phone: string;
}

class ContactsServiceClass {
    private hasPermission: boolean = false;
    private contactCache: ContactSuggestion[] = [];
    private cacheExpiry: number = 0;

    /**
     * Request contacts permission
     */
    async requestPermission(): Promise<boolean> {
        try {
            const result = await Contacts.requestPermissions();
            this.hasPermission = result.contacts === 'granted';
            return this.hasPermission;
        } catch (error) {
            console.warn('Contacts permission not available:', error);
            return false;
        }
    }

    /**
     * Check if permission is granted
     */
    async checkPermission(): Promise<boolean> {
        try {
            const result = await Contacts.checkPermissions();
            this.hasPermission = result.contacts === 'granted';
            return this.hasPermission;
        } catch (error) {
            return false;
        }
    }

    /**
     * Search contacts by name (local only, no server upload)
     * @param query - Name to search for
     * @returns Array of contact suggestions
     */
    async searchContacts(query: string): Promise<ContactSuggestion[]> {
        if (!query || query.length < 2) return [];

        // Check permission first
        const hasPermission = await this.checkPermission();
        if (!hasPermission) {
            return [];
        }

        try {
            // Use cache if available and fresh (5 minutes)
            const now = Date.now();
            if (this.contactCache.length > 0 && now < this.cacheExpiry) {
                return this.filterContacts(this.contactCache, query);
            }

            // Fetch contacts
            const result = await Contacts.getContacts({
                projection: {
                    name: true,
                    phones: true
                }
            });

            // Transform to our format
            const contacts: ContactSuggestion[] = [];
            for (const contact of result.contacts) {
                const name = contact.name?.display || contact.name?.given || '';
                const phone = contact.phones?.[0]?.number || '';

                if (name && phone) {
                    contacts.push({ name, phone });
                }
            }

            // Cache for 5 minutes
            this.contactCache = contacts;
            this.cacheExpiry = now + (5 * 60 * 1000);

            return this.filterContacts(contacts, query);
        } catch (error) {
            console.error('Error fetching contacts:', error);
            return [];
        }
    }

    /**
     * Filter contacts by query (case-insensitive)
     */
    private filterContacts(contacts: ContactSuggestion[], query: string): ContactSuggestion[] {
        const lowerQuery = query.toLowerCase();
        return contacts
            .filter(c => c.name.toLowerCase().includes(lowerQuery))
            .slice(0, 10); // Limit to 10 suggestions
    }

    /**
     * Clear cache (useful when user revokes permission)
     */
    clearCache(): void {
        this.contactCache = [];
        this.cacheExpiry = 0;
    }

    /**
     * Show permission rationale to user
     */
    getPermissionRationale(): string {
        return `📱 Contacts Permission

This helps you quickly add customers by:
• Auto-suggesting names as you type
• Auto-filling phone numbers

✅ Privacy Protected:
• Only searches locally on your device
• NO contacts uploaded to server
• Used ONLY when you create customers

Tap "Allow" to enable this convenience feature.`;
    }

    /**
     * Request permission with disclosure shown first
     * Returns true if permission was granted
     */
    async requestWithDisclosure(): Promise<boolean> {
        // First check if already have permission
        const alreadyGranted = await this.checkPermission();
        if (alreadyGranted) return true;

        // Show disclosure and ask for confirmation
        const userAccepted = confirm(this.getPermissionRationale());
        if (!userAccepted) {
            return false;
        }

        // Now request the actual system permission
        const granted = await this.requestPermission();
        return granted;
    }
}

export const ContactsService = new ContactsServiceClass();
