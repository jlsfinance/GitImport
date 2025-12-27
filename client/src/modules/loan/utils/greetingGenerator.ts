import { format, parseISO } from 'date-fns';

export const generateHindiGreeting = (
    festivalName: string,
    companyName: string,
    dateStr: string
): string => {
    const formattedDate = format(parseISO(dateStr), 'dd MMMM yyyy');

    // Custom messages based on festival keywords
    let specificMessage = `इस पावन पर्व पर आपके जीवन में सुख, समृद्धि, स्वास्थ्य और सफलता का उजाला भर दें।`;

    if (festivalName.toLowerCase().includes('diwali') || festivalName.toLowerCase().includes('deepawali')) {
        specificMessage = `इस पावन पर्व पर माँ लक्ष्मी आपके जीवन में सुख, समृद्धि, स्वास्थ्य और सफलता का उजाला भर दें।`;
    } else if (festivalName.toLowerCase().includes('holi')) {
        specificMessage = `रंगों का यह त्यौहार आपके जीवन में खुशियों के नए रंग भरे।`;
    } else if (festivalName.toLowerCase().includes('raksha') || festivalName.toLowerCase().includes('bhai')) {
        specificMessage = `भाई-बहन के प्रेम का यह प्रतीक आपके रिश्तों में और मिठास घोले।`;
    } else if (festivalName.toLowerCase().includes('shiv') || festivalName.toLowerCase().includes('mahadev')) {
        specificMessage = `भगवान शिव की कृपा आप और आपके पूरे परिवार पर सदैव बनी रहे।`;
    } else if (festivalName.toLowerCase().includes('ganesh')) {
        specificMessage = `विघ्नहर्ता भगवान गणेश आपके सभी कष्टों को दूर करें और नई शुरुआत दें।`;
    }

    return `*${festivalName} की हार्दिक शुभकामनाएं*

${specificMessage}
आपके सभी कार्यों में उन्नति हो और
आपका परिवार हमेशा खुशहाल रहे।

सदैव आपकी प्रगति के लिए प्रतिबद्ध,
*${companyName}*

दिनांक: ${formattedDate}`;
};

export const getWhatsAppLink = (phoneNumber: string | null, message: string) => {
    const encodedMessage = encodeURIComponent(message);
    if (phoneNumber) {
        // Remove non-digits and ensure 91 prefix
        const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
        return `https://wa.me/91${cleanPhone}?text=${encodedMessage}`;
    }
    // Generic share link (opens contact picker on mobile)
    return `https://wa.me/?text=${encodedMessage}`;
};
