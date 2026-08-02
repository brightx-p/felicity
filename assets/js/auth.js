// ================================================================
// FELICITY EMPIRE — Authentication
// ================================================================

import {
    auth,
    db,
    googleProvider,
    appleProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    sendPasswordResetEmail,
    sendEmailVerification,
    onAuthStateChanged,
    signOut,
    updateProfile,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from './firebase-config.js';

// --- DOM Elements ---
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const googleBtn = document.getElementById('googleBtn');
const appleBtn = document.getElementById('appleBtn');
const logoutBtn = document.getElementById('logoutBtn');

// --- Show Toast Notification ---
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    
    if (toastMessage) toastMessage.textContent = message;
    if (toastIcon) {
        toastIcon.className = type === 'success' 
            ? 'fas fa-check-circle text-[#D4145A]' 
            : 'fas fa-exclamation-circle text-[#f59e0b]';
    }
    
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
}

// --- Show Loading State ---
function setLoading(button, isLoading) {
    if (!button) return;
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || button.textContent;
    }
}

// --- Login with Email & Password ---
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        
        if (!submitBtn.dataset.originalText) {
            submitBtn.dataset.originalText = submitBtn.innerHTML;
        }
        setLoading(submitBtn, true);
        
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Check if email is verified
            if (!user.emailVerified) {
                showToast('Please verify your email before logging in.', 'error');
                setLoading(submitBtn, false);
                return;
            }
            
            // Check if user is admin
            const adminDoc = await getDoc(doc(db, 'admins', user.uid));
            if (adminDoc.exists()) {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
            
            showToast('Welcome back! 🎉');
        } catch (error) {
            console.error('Login error:', error);
            showToast(getAuthErrorMessage(error.code), 'error');
            setLoading(submitBtn, false);
        }
    });
}

// --- Sign Up with Email & Password ---
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const phone = document.getElementById('signupPhone').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        
        // Validate passwords match
        if (password !== confirmPassword) {
            showToast('Passwords do not match!', 'error');
            return;
        }
        
        if (!submitBtn.dataset.originalText) {
            submitBtn.dataset.originalText = submitBtn.innerHTML;
        }
        setLoading(submitBtn, true);
        
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Update profile with name
            await updateProfile(user, { displayName: name });
            
            // Save user to Firestore
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                name: name,
                email: email,
                phone: phone || '',
                photoURL: user.photoURL || '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                isAdmin: false,
                joinedEmpire: false,
                notifications: {
                    email: true,
                    push: true,
                    sms: false
                },
                addresses: [],
                wishlist: [],
                cart: []
            });
            
            // Send email verification
            await sendEmailVerification(user);
            showToast('Account created! Please verify your email. 📧');
            
            // Redirect to login after verification
            setTimeout(() => {
                window.location.href = 'auth.html';
            }, 3000);
            
            setLoading(submitBtn, false);
        } catch (error) {
            console.error('Signup error:', error);
            showToast(getAuthErrorMessage(error.code), 'error');
            setLoading(submitBtn, false);
        }
    });
}

// --- Google Sign In ---
if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
        setLoading(googleBtn, true);
        
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            
            // Check if user exists in Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists()) {
                // Create user document
                await setDoc(doc(db, 'users', user.uid), {
                    uid: user.uid,
                    name: user.displayName || '',
                    email: user.email || '',
                    phone: user.phoneNumber || '',
                    photoURL: user.photoURL || '',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    isAdmin: false,
                    joinedEmpire: false,
                    notifications: {
                        email: true,
                        push: true,
                        sms: false
                    },
                    addresses: [],
                    wishlist: [],
                    cart: []
                });
            }
            
            // Check if admin
            const adminDoc = await getDoc(doc(db, 'admins', user.uid));
            if (adminDoc.exists()) {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
            
            showToast('Welcome! 🎉');
            setLoading(googleBtn, false);
        } catch (error) {
            console.error('Google sign-in error:', error);
            showToast(getAuthErrorMessage(error.code), 'error');
            setLoading(googleBtn, false);
        }
    });
}

// --- Apple Sign In ---
if (appleBtn) {
    appleBtn.addEventListener('click', async () => {
        setLoading(appleBtn, true);
        
        try {
            const result = await signInWithPopup(auth, appleProvider);
            const user = result.user;
            
            // Check if user exists in Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists()) {
                await setDoc(doc(db, 'users', user.uid), {
                    uid: user.uid,
                    name: user.displayName || '',
                    email: user.email || '',
                    phone: user.phoneNumber || '',
                    photoURL: user.photoURL || '',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    isAdmin: false,
                    joinedEmpire: false,
                    notifications: {
                        email: true,
                        push: true,
                        sms: false
                    },
                    addresses: [],
                    wishlist: [],
                    cart: []
                });
            }
            
            const adminDoc = await getDoc(doc(db, 'admins', user.uid));
            if (adminDoc.exists()) {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
            
            showToast('Welcome! 🎉');
            setLoading(appleBtn, false);
        } catch (error) {
            console.error('Apple sign-in error:', error);
            showToast(getAuthErrorMessage(error.code), 'error');
            setLoading(appleBtn, false);
        }
    });
}

// --- Forgot Password ---
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value;
        if (!email) {
            showToast('Please enter your email address.', 'error');
            return;
        }
        
        try {
            await sendPasswordResetEmail(auth, email);
            showToast('Password reset email sent! 📧');
        } catch (error) {
            console.error('Password reset error:', error);
            showToast(getAuthErrorMessage(error.code), 'error');
        }
    });
}

// --- Logout ---
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Error logging out.', 'error');
        }
    });
}

// --- Auth State Listener ---
onAuthStateChanged(auth, async (user) => {
    // Update UI based on auth state
    const authButtons = document.querySelectorAll('.auth-dependent');
    const userProfile = document.getElementById('userProfile');
    const adminLink = document.getElementById('adminLink');
    
    if (user) {
        // User is signed in
        authButtons.forEach(el => {
            if (el.dataset.showWhen === 'logged-out') {
                el.style.display = 'none';
            } else {
                el.style.display = 'inline-flex';
            }
        });
        
        // Update user profile
        if (userProfile) {
            const nameEl = userProfile.querySelector('.user-name');
            const emailEl = userProfile.querySelector('.user-email');
            const photoEl = userProfile.querySelector('.user-photo');
            
            if (nameEl) nameEl.textContent = user.displayName || 'User';
            if (emailEl) emailEl.textContent = user.email || '';
            if (photoEl) photoEl.src = user.photoURL || 'assets/img/default-avatar.png';
        }
        
        // Check if admin
        try {
            const adminDoc = await getDoc(doc(db, 'admins', user.uid));
            if (adminDoc.exists() && adminLink) {
                adminLink.style.display = 'block';
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
        }
        
        // Update cart badge from Firestore
        updateCartBadgeFromFirestore(user.uid);
        
    } else {
        // User is signed out
        authButtons.forEach(el => {
            if (el.dataset.showWhen === 'logged-in') {
                el.style.display = 'none';
            } else {
                el.style.display = 'inline-flex';
            }
        });
    }
});

// --- Helper: Get Auth Error Message ---
function getAuthErrorMessage(errorCode) {
    const messages = {
        'auth/user-not-found': 'User not found. Please check your email.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/email-already-in-use': 'Email already in use. Please login instead.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Please check your connection.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed.',
        'auth/cancelled-popup-request': 'Sign-in was cancelled.',
        'auth/account-exists-with-different-credential': 'Account exists with a different provider.'
    };
    return messages[errorCode] || 'An error occurred. Please try again.';
}

// --- Update Cart Badge from Firestore ---
async function updateCartBadgeFromFirestore(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const cart = userData.cart || [];
            const cartBadge = document.getElementById('cartBadge');
            const mobileCartBadge = document.getElementById('mobileCartBadge');
            
            if (cartBadge) cartBadge.textContent = cart.length;
            if (mobileCartBadge) mobileCartBadge.textContent = cart.length;
        }
    } catch (error) {
        console.error('Error fetching cart:', error);
    }
}

// --- Export functions ---
export { 
    showToast, 
    setLoading, 
    getAuthErrorMessage,
    updateCartBadgeFromFirestore
};