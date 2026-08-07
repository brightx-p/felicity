// ================================================================
// FELICITY EMPIRE — Central Configuration
// TEMPORARY TEST NUMBER: 07081219784 — REPLACE BEFORE PRODUCTION
// ================================================================

const FE_CONFIG = {
    business: {
        name: 'Felicity Empire',
        tagline: 'Luxury that speaks for you.',
        email: 'felicityempirez@gmail.com',
        phone: '08125913807',
        whatsapp: '07081219784', // TEMPORARY — REPLACE BEFORE PRODUCTION
        address: 'Lagos, Nigeria',
        hours: 'Mon - Sat, 9AM - 6PM',
        currency: 'NGN',
        currencySymbol: 'N',
    },
    founder: {
        name: 'Ogunsanya Felicia',
        title: 'Founder & Creative Director',
    },
    firebase: {
        apiKey: "AIzaSyDummyKeyForNow",
        authDomain: "felicity-empire.firebaseapp.com",
        projectId: "felicity-empire",
        storageBucket: "felicity-empire.appspot.com",
        messagingSenderId: "123456789",
        appId: "1:123456789:web:abc123",
    },
    collections: {
        products: 'products',
        categories: 'categories',
        orders: 'orders',
        appointments: 'appointments',
        customers: 'customers',
        services: 'services',
        reviews: 'reviews',
        notifications: 'notifications',
        subscribers: 'subscribers',
        gallery: 'gallery',
        videos: 'videos',
        settings: 'settings',
    },
    admin: {
        authorizedEmails: ['felicityempirez@gmail.com'],
    },
    site: {
        publicHome: '/brand/views/index.html',
        adminHome: '/admin/index.html',
        shop: '/brand/views/shop.html',
        checkout: '/brand/views/checkout.html',
    },
};