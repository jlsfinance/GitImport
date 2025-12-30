export interface Festival {
    date: string; // YYYY-MM-DD
    name: string;
    greeting?: string; // Custom override, otherwise auto-generated
}

// Major Hindu Festivals for 2026 (and late 2025 for immediate testing)
export const FESTIVALS: Festival[] = [
    // 2025 (late)
    { date: '2025-12-25', name: 'Christmas' }, // Added for immediate testing if needed
    { date: '2025-12-31', name: 'New Year Eve' },

    // 2026
    { date: '2026-01-01', name: 'New Year 2026' },
    { date: '2026-01-14', name: 'Makar Sankranti' },
    { date: '2026-01-26', name: 'Republic Day' },
    { date: '2026-02-16', name: 'Maha Shivratri' },
    { date: '2026-03-04', name: 'Holi' },
    { date: '2026-03-27', name: 'Ram Navami' },
    { date: '2026-04-02', name: 'Hanuman Jayanti' },
    { date: '2026-08-02', name: 'Raksha Bandhan' },
    { date: '2026-08-15', name: 'Independence Day' },
    { date: '2026-09-04', name: 'Janmashtami' },
    { date: '2026-09-14', name: 'Ganesh Chaturthi' },
    { date: '2026-10-02', name: 'Gandhi Jayanti' },
    { date: '2026-10-12', name: 'Navratri Start' },
    { date: '2026-10-20', name: 'Dussehra' },
    { date: '2026-11-08', name: 'Diwali' },
    { date: '2026-11-10', name: 'Bhai Dooj' },
    { date: '2026-11-15', name: 'Chhath Puja' },
];
