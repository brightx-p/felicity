// ================================================================
// FELICITY EMPIRE — Firebase Initialization
// ================================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, limit, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { getMessaging, getToken, onMessage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js';

const app = initializeApp(FE_CONFIG.firebase);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Initialize messaging only if supported
let messaging = null;
try {
    messaging = getMessaging(app);
} catch (e) {
    console.log('Firebase Messaging not supported in this environment');
}

// ================================================================
// FIRESTORE HELPERS
// ================================================================

// Add document
async function addDocument(collectionName, data) {
    try {
        const docRef = await addDoc(collection(db, collectionName), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error adding document:', error);
        return { success: false, error: error.message };
    }
}

// Get all documents
async function getDocuments(collectionName, orderByField = 'createdAt', orderDirection = 'desc') {
    try {
        const q = query(collection(db, collectionName), orderBy(orderByField, orderDirection));
        const snapshot = await getDocs(q);
        const documents = [];
        snapshot.forEach(doc => {
            documents.push({ id: doc.id, ...doc.data() });
        });
        return documents;
    } catch (error) {
        console.error('Error getting documents:', error);
        return [];
    }
}

// Get document by ID
async function getDocument(collectionName, docId) {
    try {
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error('Error getting document:', error);
        return null;
    }
}

// Update document
async function updateDocument(collectionName, docId, data) {
    try {
        const docRef = doc(db, collectionName, docId);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating document:', error);
        return { success: false, error: error.message };
    }
}

// Delete document
async function deleteDocument(collectionName, docId) {
    try {
        await deleteDoc(doc(db, collectionName, docId));
        return { success: true };
    } catch (error) {
        console.error('Error deleting document:', error);
        return { success: false, error: error.message };
    }
}

// Real-time listener
function listenToCollection(collectionName, callback, orderByField = 'createdAt', orderDirection = 'desc') {
    const q = query(collection(db, collectionName), orderBy(orderByField, orderDirection));
    return onSnapshot(q, (snapshot) => {
        const documents = [];
        snapshot.forEach(doc => {
            documents.push({ id: doc.id, ...doc.data() });
        });
        callback(documents);
    });
}

// ================================================================
// STORAGE HELPERS
// ================================================================

// Upload file
async function uploadFile(file, path) {
    return new Promise((resolve, reject) => {
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload progress:', progress + '%');
            },
            (error) => {
                reject(error);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve({ success: true, url: downloadURL, path: path });
            }
        );
    });
}

// Delete file
async function deleteFile(path) {
    try {
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ================================================================
// AUTH HELPERS
// ================================================================

async function adminLogin(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Check if email is authorized
        if (!FE_CONFIG.admin.authorizedEmails.includes(user.email)) {
            await signOut(auth);
            return { success: false, error: 'Unauthorized email address' };
        }
        
        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function adminLogout() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function onAdminAuthChange(callback) {
    return onAuthStateChanged(auth, (user) => {
        if (user && FE_CONFIG.admin.authorizedEmails.includes(user.email)) {
            callback({ loggedIn: true, user });
        } else {
            callback({ loggedIn: false, user: null });
        }
    });
}

// ================================================================
// ORDER HELPERS
// ================================================================

async function createOrder(orderData) {
    const orderId = 'FE-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-4);
    
    const order = {
        orderId: orderId,
        customer: orderData.customer,
        phone: orderData.phone,
        email: orderData.email || '',
        products: orderData.products || [],
        subtotal: orderData.subtotal || 0,
        delivery: orderData.delivery || 0,
        discount: orderData.discount || 0,
        total: orderData.total || 0,
        address: orderData.address || '',
        state: orderData.state || '',
        city: orderData.city || '',
        landmark: orderData.landmark || '',
        notes: orderData.notes || '',
        paymentStatus: 'pending',
        orderStatus: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    
    return await addDocument(FE_CONFIG.collections.orders, order);
}

// ================================================================
// APPOINTMENT HELPERS
// ================================================================

async function createAppointment(appointmentData) {
    const appointment = {
        customer: appointmentData.customer,
        phone: appointmentData.phone,
        email: appointmentData.email || '',
        service: appointmentData.service,
        date: appointmentData.date,
        time: appointmentData.time,
        location: appointmentData.location || 'Studio',
        notes: appointmentData.notes || '',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    
    return await addDocument(FE_CONFIG.collections.appointments, appointment);
}

// ================================================================
// EXPORTS
// ================================================================
export {
    db, auth, storage, messaging,
    addDocument, getDocuments, getDocument, updateDocument, deleteDocument,
    listenToCollection,
    uploadFile, deleteFile,
    adminLogin, adminLogout, onAdminAuthChange,
    createOrder, createAppointment,
};