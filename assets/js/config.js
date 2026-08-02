// ================================================================
// FELICITY EMPIRE — Configuration
// ================================================================

// Business WhatsApp Number (without + sign)
// Change this number here and it updates everywhere
export const BUSINESS_WHATSAPP = "2348125913807";

// Site Configuration
export const SITE_CONFIG = {
    name: 'Felicity Empire',
    tagline: 'Signature Beauty Destination',
    currency: '₦',
    freeShippingThreshold: 50000,
    description: 'Luxury nails, lashes, clothes, and perfumes for the modern queen.',
    keywords: 'luxury beauty, nails, lashes, clothes, perfumes, Nigeria, Felicity Empire'
};

// WhatsApp Message Templates
export const WHATSAPP_TEMPLATES = {
    order: (data) => {
        const { name, phone, address, items, total, notes, orderNumber, date } = data;
        let message = `FELICITY EMPIRE — NEW ORDER \n\n`;
        message += `Order #: ${orderNumber}\n`;
        message += `Date: ${date}\n\n`;
        message += `Customer: ${name}\n`;
        message += `Phone: ${phone}\n`;
        message += `Address: ${address}\n\n`;
        message += `ITEMS:\n`;
        items.forEach((item, index) => {
            message += `${index + 1}. ${item.name}\n`;
            message += `   Qty: ${item.quantity}\n`;
            message += `   Price: ${SITE_CONFIG.currency}${item.price.toLocaleString()}\n`;
            message += `   Subtotal: ${SITE_CONFIG.currency}${(item.quantity * item.price).toLocaleString()}\n\n`;
        });
        message += `Total: ${SITE_CONFIG.currency}${total.toLocaleString()}\n\n`;
        if (notes) {
            message += ` Notes: ${notes}\n\n`;
        }
        message += `Thank you for choosing Felicity Empire!`;
        return message;
    },
    
    quickOrder: (productName, price) => {
        return `Hello Felicity Empire,\n\nI would like to order:\n\n ${productName}\n ${SITE_CONFIG.currency}${price.toLocaleString()}\n\nPlease provide payment details and delivery options.\n\nThank you! 👑`;
    },
    
    joinEmpire: (name, phone, email) => {
        let message = `FELICITY EMPIRE — NEW SUBSCRIBER \n\n`;
        message += ` Name: ${name}\n`;
        message += `Phone: ${phone}\n`;
        if (email) message += ` Email: ${email}\n`;
        message += `\nSubscribed to the Empire!\n`;
        message += `Welcome to Felicity Empire!`;
        return message;
    }
};

// Firestore Collections
export const COLLECTIONS = {
    products: 'products',
    orders: 'orders',
    categories: 'categories',
    subscribers: 'subscribers',
    videos: 'videos',
    banners: 'banners',
    admins: 'admins'
};