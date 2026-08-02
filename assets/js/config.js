// ================================================================
// FELICITY EMPIRE — Configuration
// ================================================================

// Business WhatsApp Number (without + sign)
export const BUSINESS_WHATSAPP = "2348125913807";

// Authentication Configuration
export const AUTH_CONFIG = {
    // OTP Provider: 'firebase' or 'whatsapp'
    otpProvider: 'firebase',
    
    // WhatsApp OTP Provider (future use)
    whatsappConfig: {
        apiKey: '',
        apiUrl: '',
        senderId: ''
    },
    
    // Country defaults
    defaultCountry: {
        code: '+234',
        name: 'Nigeria',
        flag: '🇳🇬'
    }
};

// Site Configuration
export const SITE_CONFIG = {
    name: 'Felicity Empire',
    tagline: 'Signature Beauty Destination',
    currency: '₦',
    freeShippingThreshold: 50000
};

// Firestore Collections
export const COLLECTIONS = {
    users: 'users',
    products: 'products',
    orders: 'orders',
    categories: 'categories',
    videos: 'videos',
    banners: 'banners',
    admins: 'admins'
};