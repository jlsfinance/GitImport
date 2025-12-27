
import { Contacts } from '@capacitor-community/contacts';
import { Capacitor } from '@capacitor/core';
import { StorageService } from './storageService';

export const ContactService = {
    normalizePhone: (num: string) => num.replace(/\D/g, '').slice(-10),

    getContactNameFromPhone: async (inputNumber: string): Promise<string> => {
        if (!Capacitor.isNativePlatform()) return '';
        try {
            const permission = await Contacts.checkPermissions();
            if (permission.contacts !== 'granted') {
                const request = await Contacts.requestPermissions();
                if (request.contacts !== 'granted') return '';
            }

            const { contacts } = await Contacts.getContacts({
                projection: {
                    name: true,
                    phones: true,
                }
            });

            const input = ContactService.normalizePhone(inputNumber);
            for (const contact of contacts) {
                if (!contact.phones) continue;
                for (const phone of contact.phones) {
                    const saved = ContactService.normalizePhone(phone.number || '');
                    if (saved === input) {
                        return contact.name?.display || '';
                    }
                }
            }
        } catch (e) {
            console.warn('Contact read error', e);
        }
        return '';
    },

    getCombinedContacts: async (query: string): Promise<Array<{ id: string; name: string; phone: string; source: 'db' | 'phone' }>> => {
        const results: Array<{ id: string; name: string; phone: string; source: 'db' | 'phone' }> = [];
        const q = query.toLowerCase().trim();

        // 1. Get DB Contacts
        const dbCustomers = StorageService.getCustomers();
        dbCustomers.forEach(c => {
            if (c.name.toLowerCase().includes(q) || c.phone.includes(q)) {
                results.push({ id: c.id, name: c.name, phone: c.phone, source: 'db' });
            }
        });

        // 2. Get Device Contacts (only if native)
        if (Capacitor.isNativePlatform()) {
            try {
                const { contacts } = await Contacts.getContacts({
                    projection: { name: true, phones: true }
                });

                contacts.forEach(c => {
                    const name = c.name?.display || '';
                    if (name.toLowerCase().includes(q)) {
                        const phone = c.phones?.[0]?.number || '';
                        if (phone) results.push({ id: c.contactId || Math.random().toString(), name, phone, source: 'phone' });
                    } else {
                        // Check phones if name doesn't match
                        const matchingPhone = c.phones?.find(p => p.number?.includes(q));
                        if (matchingPhone) {
                            results.push({ id: c.contactId || Math.random().toString(), name, phone: matchingPhone.number || '', source: 'phone' });
                        }
                    }
                });
            } catch (e) {
                console.warn('Search contacts error', e);
            }
        }

        // De-duplicate by phone
        const seen = new Set();
        return results.filter(item => {
            const normalized = ContactService.normalizePhone(item.phone);
            if (seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
        }).slice(0, 50); // Limit to 50 results
    },

    resolveName: async (number: string): Promise<{ name: string; source: 'db' | 'phone' | 'manual' }> => {
        const cleaned = ContactService.normalizePhone(number);
        if (cleaned.length < 10) return { name: '', source: 'manual' };

        // 1. App Database
        const existing = StorageService.getCustomers().find(c => ContactService.normalizePhone(c.phone) === cleaned);
        if (existing) {
            return { name: existing.name, source: 'db' };
        }

        // 2. Phone Contacts
        const phoneName = await ContactService.getContactNameFromPhone(cleaned);
        if (phoneName) {
            return { name: phoneName, source: 'phone' };
        }

        return { name: '', source: 'manual' };
    }
};
