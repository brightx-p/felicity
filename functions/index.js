// ================================================================
// FELICITY EMPIRE — WhatsApp OTP via Firebase Cloud Functions
// ================================================================

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const twilio = require('twilio');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Twilio Configuration (from environment variables)
// Set these using: firebase functions:config:set twilio.sid="YOUR_SID" twilio.token="YOUR_TOKEN" twilio.from="whatsapp:+14155238886"
const accountSid = functions.config().twilio?.sid || process.env.TWILIO_ACCOUNT_SID;
const authToken = functions.config().twilio?.token || process.env.TWILIO_AUTH_TOKEN;
const fromNumber = functions.config().twilio?.from || process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

const twilioClient = twilio(accountSid, authToken);

// ================================================================
// OTP STORE (Firestore)
// ================================================================

async function storeOTP(phoneNumber, otp) {
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes
    await db.collection('otps').doc(phoneNumber).set({
        otp: otp,
        expiresAt: expiresAt,
        attempts: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return true;
}

async function getOTP(phoneNumber) {
    const doc = await db.collection('otps').doc(phoneNumber).get();
    if (!doc.exists) return null;
    return doc.data();
}

async function deleteOTP(phoneNumber) {
    await db.collection('otps').doc(phoneNumber).delete();
    return true;
}

// ================================================================
// GENERATE OTP
// ================================================================

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ================================================================
// SEND OTP VIA WHATSAPP (Twilio)
// ================================================================

async function sendWhatsAppOTP(phoneNumber, otp) {
    try {
        const message = await twilioClient.messages.create({
            body: `✨ Welcome to Felicity Empire!\n\nYour verification code is: *${otp}*\n\nThis code expires in 5 minutes.\n\nIf you didn't request this, please ignore this message.\n\n👑 Felicity Empire — Luxury that speaks for you.`,
            from: fromNumber,
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
// API: Request OTP
// ================================================================

exports.requestOTP = functions.https.onCall(async (data, context) => {
    const { phoneNumber } = data;
    
    if (!phoneNumber) {
        return { success: false, error: 'Phone number is required' };
    }
    
    // Clean phone number
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    
    // Validate phone number
    if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
        return { success: false, error: 'Invalid phone number format' };
    }
    
    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP in Firestore
    await storeOTP(cleanPhone, otp);
    
    // Send via WhatsApp
    const result = await sendWhatsAppOTP(cleanPhone, otp);
    
    if (result.success) {
        return {
            success: true,
            message: 'OTP sent successfully via WhatsApp'
        };
    } else {
        return {
            success: false,
            error: result.error || 'Failed to send OTP'
        };
    }
});

// ================================================================
// API: Verify OTP
// ================================================================

exports.verifyOTP = functions.https.onCall(async (data, context) => {
    const { phoneNumber, otp, userData } = data;
    
    if (!phoneNumber || !otp) {
        return { success: false, error: 'Phone number and OTP are required' };
    }
    
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    
    // Get stored OTP
    const stored = await getOTP(cleanPhone);
    
    if (!stored) {
        return { success: false, error: 'No OTP found. Please request a new code.' };
    }
    
    // Check expiry
    if (Date.now() > stored.expiresAt) {
        await deleteOTP(cleanPhone);
        return { success: false, error: 'OTP has expired. Please request a new code.' };
    }
    
    // Check attempts
    if (stored.attempts >= 3) {
        await deleteOTP(cleanPhone);
        return { success: false, error: 'Too many attempts. Please request a new code.' };
    }
    
    // Increment attempts
    await db.collection('otps').doc(cleanPhone).update({
        attempts: admin.firestore.FieldValue.increment(1)
    });
    
    // Verify OTP
    if (stored.otp === otp) {
        // Delete OTP
        await deleteOTP(cleanPhone);
        
        // Get or create user
        const userResult = await getOrCreateUser(cleanPhone, userData || {});
        
        if (!userResult.success) {
            return { success: false, error: 'Failed to create user profile' };
        }
        
        // Create custom token
        try {
            const customToken = await admin.auth().createCustomToken(cleanPhone);
            
            return {
                success: true,
                message: 'OTP verified successfully',
                user: userResult.user,
                isNew: userResult.isNew,
                token: customToken
            };
        } catch (error) {
            console.error('Error creating custom token:', error);
            return { success: false, error: 'Failed to create session' };
        }
    }
    
    return {
        success: false,
        error: `Invalid OTP. ${3 - (stored.attempts + 1)} attempts remaining.`
    };
});

// ================================================================
// API: Resend OTP
// ================================================================

exports.resendOTP = functions.https.onCall(async (data, context) => {
    const { phoneNumber } = data;
    
    if (!phoneNumber) {
        return { success: false, error: 'Phone number is required' };
    }
    
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    
    // Delete existing OTP
    await deleteOTP(cleanPhone);
    
    // Generate new OTP
    const otp = generateOTP();
    
    // Store new OTP
    await storeOTP(cleanPhone, otp);
    
    // Send via WhatsApp
    const result = await sendWhatsAppOTP(cleanPhone, otp);
    
    if (result.success) {
        return {
            success: true,
            message: 'New OTP sent successfully via WhatsApp'
        };
    } else {
        return {
            success: false,
            error: result.error || 'Failed to send OTP'
        };
    }
});

// ================================================================
// HELPER: Get or Create User
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