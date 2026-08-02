// ================================================================
// FELICITY EMPIRE — Firestore Operations
// ================================================================

import {
    db,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    addDoc,
    serverTimestamp,
    arrayUnion,
    arrayRemove,
    increment
} from './firebase-config.js';

// ================================================================
// PRODUCT OPERATIONS
// ================================================================

// --- Add Product ---
export async function addProduct(productData) {
    try {
        const docRef = await addDoc(collection(db, 'products'), {
            ...productData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            stock: productData.stock || 0,
            featured: productData.featured || false,
            tags: productData.tags || [],
            views: 0,
            sales: 0
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error adding product:', error);
        return { success: false, error: error.message };
    }
}

// --- Get All Products ---
export async function getProducts(filters = {}) {
    try {
        let q = collection(db, 'products');
        let constraints = [];
        
        // Apply filters
        if (filters.category) {
            constraints.push(where('category', '==', filters.category));
        }
        if (filters.featured) {
            constraints.push(where('featured', '==', true));
        }
        if (filters.sortBy) {
            constraints.push(orderBy(filters.sortBy, filters.sortOrder || 'desc'));
        }
        if (filters.limit) {
            constraints.push(limit(filters.limit));
        }
        
        if (constraints.length > 0) {
            q = query(q, ...constraints);
        }
        
        const snapshot = await getDocs(q);
        const products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        return { success: true, products };
    } catch (error) {
        console.error('Error fetching products:', error);
        return { success: false, error: error.message };
    }
}

// --- Get Product by ID ---
export async function getProductById(productId) {
    try {
        const docRef = doc(db, 'products', productId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            // Increment view count
            await updateDoc(docRef, {
                views: increment(1)
            });
            return { success: true, product: { id: docSnap.id, ...docSnap.data() } };
        } else {
            return { success: false, error: 'Product not found' };
        }
    } catch (error) {
        console.error('Error fetching product:', error);
        return { success: false, error: error.message };
    }
}

// --- Update Product ---
export async function updateProduct(productId, productData) {
    try {
        const docRef = doc(db, 'products', productId);
        await updateDoc(docRef, {
            ...productData,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating product:', error);
        return { success: false, error: error.message };
    }
}

// --- Delete Product ---
export async function deleteProduct(productId) {
    try {
        await deleteDoc(doc(db, 'products', productId));
        return { success: true };
    } catch (error) {
        console.error('Error deleting product:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// CATEGORY OPERATIONS
// ================================================================

// --- Add Category ---
export async function addCategory(categoryData) {
    try {
        const docRef = await addDoc(collection(db, 'categories'), {
            ...categoryData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error adding category:', error);
        return { success: false, error: error.message };
    }
}

// --- Get All Categories ---
export async function getCategories() {
    try {
        const snapshot = await getDocs(collection(db, 'categories'));
        const categories = [];
        snapshot.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        return { success: true, categories };
    } catch (error) {
        console.error('Error fetching categories:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// USER OPERATIONS
// ================================================================

// --- Get User Profile ---
export async function getUserProfile(uid) {
    try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return { success: true, user: { id: docSnap.id, ...docSnap.data() } };
        } else {
            return { success: false, error: 'User not found' };
        }
    } catch (error) {
        console.error('Error fetching user:', error);
        return { success: false, error: error.message };
    }
}

// --- Update User Profile ---
export async function updateUserProfile(uid, data) {
    try {
        const docRef = doc(db, 'users', uid);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating user:', error);
        return { success: false, error: error.message };
    }
}

// --- Add to Wishlist ---
export async function addToWishlist(uid, productId) {
    try {
        const docRef = doc(db, 'users', uid);
        await updateDoc(docRef, {
            wishlist: arrayUnion(productId)
        });
        return { success: true };
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        return { success: false, error: error.message };
    }
}

// --- Remove from Wishlist ---
export async function removeFromWishlist(uid, productId) {
    try {
        const docRef = doc(db, 'users', uid);
        await updateDoc(docRef, {
            wishlist: arrayRemove(productId)
        });
        return { success: true };
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        return { success: false, error: error.message };
    }
}

// --- Add to Cart ---
export async function addToCart(uid, productId, quantity = 1) {
    try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const cart = docSnap.data().cart || [];
            const existingItem = cart.find(item => item.productId === productId);
            
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                cart.push({ productId, quantity });
            }
            
            await updateDoc(docRef, {
                cart: cart,
                updatedAt: serverTimestamp()
            });
            return { success: true };
        }
        return { success: false, error: 'User not found' };
    } catch (error) {
        console.error('Error adding to cart:', error);
        return { success: false, error: error.message };
    }
}

// --- Remove from Cart ---
export async function removeFromCart(uid, productId) {
    try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const cart = docSnap.data().cart || [];
            const updatedCart = cart.filter(item => item.productId !== productId);
            
            await updateDoc(docRef, {
                cart: updatedCart,
                updatedAt: serverTimestamp()
            });
            return { success: true };
        }
        return { success: false, error: 'User not found' };
    } catch (error) {
        console.error('Error removing from cart:', error);
        return { success: false, error: error.message };
    }
}

// --- Join Empire (Subscription) ---
export async function joinEmpire(uid) {
    try {
        const docRef = doc(db, 'users', uid);
        await updateDoc(docRef, {
            joinedEmpire: true,
            empireJoinedAt: serverTimestamp(),
            notifications: {
                email: true,
                push: true,
                sms: false
            }
        });
        return { success: true };
    } catch (error) {
        console.error('Error joining empire:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// ORDER OPERATIONS
// ================================================================

// --- Create Order ---
export async function createOrder(orderData) {
    try {
        const docRef = await addDoc(collection(db, 'orders'), {
            ...orderData,
            status: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error creating order:', error);
        return { success: false, error: error.message };
    }
}

// --- Get User Orders ---
export async function getUserOrders(uid) {
    try {
        const q = query(
            collection(db, 'orders'),
            where('userId', '==', uid),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const orders = [];
        snapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        return { success: true, orders };
    } catch (error) {
        console.error('Error fetching orders:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// ADMIN OPERATIONS
// ================================================================

// --- Check if User is Admin ---
export async function isAdmin(uid) {
    try {
        const docRef = doc(db, 'admins', uid);
        const docSnap = await getDoc(docRef);
        return docSnap.exists();
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// --- Get Admin Stats ---
export async function getAdminStats() {
    try {
        // Get products count
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const productsCount = productsSnapshot.size;
        
        // Get orders count
        const ordersSnapshot = await getDocs(collection(db, 'orders'));
        const ordersCount = ordersSnapshot.size;
        
        // Get users count
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersCount = usersSnapshot.size;
        
        // Calculate revenue
        let revenue = 0;
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            if (order.status === 'delivered' || order.status === 'completed') {
                revenue += order.total || 0;
            }
        });
        
        return {
            success: true,
            stats: {
                products: productsCount,
                orders: ordersCount,
                members: usersCount,
                revenue: revenue,
                visitors: 0 // Would need analytics for this
            }
        };
    } catch (error) {
        console.error('Error getting admin stats:', error);
        return { success: false, error: error.message };
    }
}

// --- Get Recent Orders ---
export async function getRecentOrders(limitCount = 10) {
    try {
        const q = query(
            collection(db, 'orders'),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );
        const snapshot = await getDocs(q);
        const orders = [];
        snapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        return { success: true, orders };
    } catch (error) {
        console.error('Error fetching recent orders:', error);
        return { success: false, error: error.message };
    }
}