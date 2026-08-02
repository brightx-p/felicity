// ================================================================
// FELICITY EMPIRE — WhatsApp OTP Server
// ================================================================

const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const admin = require('firebase-admin');
const crypto = require('crypto');

// --- Initialize Firebase Admin ---
const serviceAccount = require('./service-account-key.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// --- Initialize Express ---
const app = express();
app.use(cors());
app.use(express.json());

// --- Configuration ---
const CONFIG = {
    // WhatsApp Business API via Twilio
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || 'YOUR_TWILIO_ACCOUNT_SID',
        authToken: process.env.TWILIO_AUTH_TOKEN || 'YOUR_TWILIO_AUTH_TOKEN',
        from: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886', // Twilio Sandbox Number
    },
    // Alternative: Use WhatsApp Cloud API (Meta)
    whatsappCloud: {
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || 'YOUR_PHONE_NUMBER_ID',
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN',
        from: process.env.WHATSAPP_FROM || 'YOUR_WHATSAPP_NUMBER',
        apiVersion: 'v18.0'
    },
    // OTP Settings
    otp: {
        length: 6,
        expirySeconds: 300, // 5 minutes
        maxAttempts: 3
    }
};

// Initialize Twilio client
const twilioClient = twilio(
    CONFIG.twilio.accountSid,
    CONFIG.twilio.authToken
);

// ================================================================
// OTP STORAGE (In-memory cache, use Redis in production)
// ================================================================

const otpStore = new Map();

// Cleanup expired OTPs every minute
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of otpStore.entries()) {
        if (data.expiresAt < now) {
            otpStore.delete(key);
        }
    }
}, 60000);

// ================================================================
// GENERATE OTP
// ================================================================

function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

// ================================================================
// SEND OTP VIA WHATSAPP (Twilio)
// ================================================================

async function sendOTPViaTwilio(phoneNumber, otp) {
    try {
        const message = await twilioClient.messages.create({
            body: `✨ Welcome to Felicity Empire!\n\nYour verification code is: *${otp}*\n\nThis code expires in 5 minutes.\n\nIf you didn't request this, please ignore this message.\n\n👑 Felicity Empire — Luxury that speaks for you.`,
            from: CONFIG.twilio.from,
            to: `whatsapp:${phoneNumber}`
        });
        
        console.log(`✅ OTP sent to ${phoneNumber}: ${message.sid}`);
        return { success: true, sid: message.sid };
    } catch (error) {
        console.error('❌ Twilio Error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// SEND OTP VIA WHATSAPP CLOUD API (Meta)
// ================================================================

async function sendOTPViaWhatsAppCloud(phoneNumber, otp) {
    try {
        const response = await fetch(
            `https://graph.facebook.com/${CONFIG.whatsappCloud.apiVersion}/${CONFIG.whatsappCloud.phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${CONFIG.whatsappCloud.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: phoneNumber,
                    type: 'text',
                    text: {
                        preview_url: false,
                        body: `✨ Welcome to Felicity Empire!\n\nYour verification code is: *${otp}*\n\nThis code expires in 5 minutes.\n\nIf you didn't request this, please ignore this message.\n\n👑 Felicity Empire — Luxury that speaks for you.`
                    }
                })
            }
        );
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || 'WhatsApp API error');
        }
        
        console.log(`✅ OTP sent to ${phoneNumber}: ${data.messages?.[0]?.id}`);
        return { success: true, sid: data.messages?.[0]?.id };
    } catch (error) {
        console.error('❌ WhatsApp Cloud Error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// SEND OTP (Main function)
// ================================================================

async function sendOTP(phoneNumber) {
    // Clean phone number (remove + and spaces)
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + (CONFIG.otp.expirySeconds * 1000);
    
    // Store OTP
    otpStore.set(cleanPhone, {
        otp,
        expiresAt,
        attempts: 0,
        createdAt: Date.now()
    });
    
    console.log(`📱 OTP for ${cleanPhone}: ${otp}`);
    
    // Send via WhatsApp (try Twilio first, fallback to Cloud API)
    let result;
    
    // Try Twilio
    result = await sendOTPViaTwilio(cleanPhone, otp);
    if (result.success) {
        return { success: true, provider: 'twilio' };
    }
    
    // Try WhatsApp Cloud API as fallback
    result = await sendOTPViaWhatsAppCloud(cleanPhone, otp);
    if (result.success) {
        return { success: true, provider: 'whatsapp-cloud' };
    }
    
    // If both fail, log error
    console.error('❌ All WhatsApp providers failed');
    return { success: false, error: 'Unable to send OTP via WhatsApp' };
}

// ================================================================
// VERIFY OTP
// ================================================================

async function verifyOTP(phoneNumber, userOTP) {
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    const stored = otpStore.get(cleanPhone);
    
    if (!stored) {
        return { success: false, error: 'No OTP found. Please request a new code.' };
    }
    
    if (Date.now() > stored.expiresAt) {
        otpStore.delete(cleanPhone);
        return { success: false, error: 'OTP has expired. Please request a new code.' };
    }
    
    if (stored.attempts >= CONFIG.otp.maxAttempts) {
        otpStore.delete(cleanPhone);
        return { success: false, error: 'Too many attempts. Please request a new code.' };
    }
    
    stored.attempts += 1;
    
    if (stored.otp === userOTP) {
        // OTP verified - delete from store
        otpStore.delete(cleanPhone);
        return { success: true, message: 'OTP verified successfully' };
    }
    
    return { success: false, error: `Invalid OTP. ${CONFIG.otp.maxAttempts - stored.attempts} attempts remaining.` };
}

// ================================================================
// CREATE/GET USER IN FIRESTORE
// ================================================================

async function getOrCreateUser(phoneNumber, userData = {}) {
    try {
        const cleanPhone = phoneNumber.replace(/\s/g, '');
        const userRef = db.collection('users').doc(cleanPhone);
        const userDoc = await userRef.get();
        
        if (userDoc.exists) {
            // Update last login
            await userRef.update({
                lastLogin: admin.firestore.FieldValue.serverTimestamp(),
                lastVisit: admin.firestore.FieldValue.serverTimestamp(),
                ...userData
            });
            return { success: true, user: userDoc.data(), isNew: false };
        } else {
            // Create new user
            const newUser = {
                phoneNumber: cleanPhone,
                joinDate: admin.firestore.FieldValue.serverTimestamp(),
                lastLogin: admin.firestore.FieldValue.serverTimestamp(),
                lastVisit: admin.firestore.FieldValue.serverTimestamp(),
                loginCount: 1,
                wishlist: [],
                cart: [],
                orders: [],
                notificationPreferences: {
                    email: true,
                    sms: true,
                    push: true
                },
                ...userData
            };
            await userRef.set(newUser);
            return { success: true, user: newUser, isNew: true };
        }
    } catch (error) {
        console.error('Error getting/creating user:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// API ENDPOINTS
// ================================================================

// --- Request OTP ---
app.post('/api/auth/request-otp', async (req, res) => {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
        return res.status(400).json({ success: false, error: 'Phone number is required' });
    }
    
    // Basic phone validation
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
        return res.status(400).json({ success: false, error: 'Invalid phone number format' });
    }
    
    const result = await sendOTP(cleanPhone);
    
    if (result.success) {
        res.json({
            success: true,
            message: 'OTP sent successfully via WhatsApp',
            provider: result.provider
        });
    } else {
        res.status(500).json({
            success: false,
            error: result.error || 'Failed to send OTP'
        });
    }
});

// --- Verify OTP ---
app.post('/api/auth/verify-otp', async (req, res) => {
    const { phoneNumber, otp, userData } = req.body;
    
    if (!phoneNumber || !otp) {
        return res.status(400).json({ success: false, error: 'Phone number and OTP are required' });
    }
    
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    const verifyResult = await verifyOTP(cleanPhone, otp);
    
    if (!verifyResult.success) {
        return res.status(400).json(verifyResult);
    }
    
    // Get or create user
    const userResult = await getOrCreateUser(cleanPhone, userData || {});
    
    if (!userResult.success) {
        return res.status(500).json({ success: false, error: 'Failed to create user profile' });
    }
    
    // Generate a session token (JWT or Firebase Custom Token)
    // For simplicity, we'll create a Firebase Custom Token
    try {
        const customToken = await admin.auth().createCustomToken(cleanPhone);
        
        res.json({
            success: true,
            message: 'OTP verified successfully',
            user: userResult.user,
            isNew: userResult.isNew,
            token: customToken
        });
    } catch (error) {
        console.error('Error creating custom token:', error);
        res.status(500).json({ success: false, error: 'Failed to create session' });
    }
});

// --- Resend OTP ---
app.post('/api/auth/resend-otp', async (req, res) => {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
        return res.status(400).json({ success: false, error: 'Phone number is required' });
    }
    
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    
    // Delete existing OTP
    otpStore.delete(cleanPhone);
    
    const result = await sendOTP(cleanPhone);
    
    if (result.success) {
        res.json({
            success: true,
            message: 'New OTP sent successfully via WhatsApp'
        });
    } else {
        res.status(500).json({
            success: false,
            error: result.error || 'Failed to send OTP'
        });
    }
});

// ================================================================
// START SERVER
// ================================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`👑 Felicity Empire — WhatsApp OTP Server`);
    console.log(`🚀 Running on http://localhost:${PORT}`);
    console.log(`📱 Ready to send OTPs via WhatsApp`);
});