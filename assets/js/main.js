// ================================================================
// FELICITY EMPIRE — Main JavaScript
// ================================================================

import {
    auth,
    db,
    onAuthStateChanged,
    signOut,
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    arrayUnion,
    arrayRemove
} from './firebase-config.js';
import { showToast } from './auth.js';

// --- DOM Ready ---
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// --- Initialize App ---
function initializeApp() {
    // Load products
    loadFeaturedProducts();
    loadCategories();
    
    // Setup auth listener
    setupAuthListener();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load cart from localStorage
    loadCartFromStorage();
}

// --- Load Featured Products ---
async function loadFeaturedProducts() {
    const container = document.getElementById('featuredProducts');
    if (!container) return;
    
    try {
        const q = query(
            collection(db, 'products'),
            where('featured', '==', true),
            orderBy('createdAt', 'desc'),
            limit(8)
        );
        
        const snapshot = await getDocs(q);
        const products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        
        if (products.length === 0) {
            // If no featured products, get latest products
            const fallbackQuery = query(
                collection(db, 'products'),
                orderBy('createdAt', 'desc'),
                limit(8)
            );
            const fallbackSnapshot = await getDocs(fallbackQuery);
            fallbackSnapshot.forEach(doc => {
                products.push({ id: doc.id, ...doc.data() });
            });
        }
        
        renderProducts(container, products);
    } catch (error) {
        console.error('Error loading products:', error);
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-exclamation-circle text-4xl text-[#D4145A] mb-4"></i>
                <p class="text-[#4A1942]/60">Unable to load products. Please try again.</p>
                <button onclick="loadFeaturedProducts()" class="btn-primary mt-4 text-sm">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

// --- Render Products ---
function renderProducts(container, products) {
    if (products.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-box-open text-4xl text-[#D4145A] mb-4"></i>
                <p class="text-[#4A1942]/60">No products available yet.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = products.map(product => `
        <div class="product-card" data-aos="fade-up" data-aos-delay="${Math.random() * 300}">
            <a href="product.html?id=${product.id}">
                <img src="${product.images?.[0] || 'assets/img/placeholder-product.jpg'}" 
                     alt="${product.name}" 
                     class="product-image" 
                     loading="lazy" />
            </a>
            <div class="p-4">
                <div class="flex justify-between items-start">
                    <div>
                        <a href="product.html?id=${product.id}">
                            <h3 class="font-semibold text-[#4A1942] hover:text-[#D4145A] transition">${product.name}</h3>
                        </a>
                        <p class="text-sm text-[#4A1942]/60">${product.category || 'Uncategorized'}</p>
                        <p class="text-xl font-bold text-[#D4145A] mt-2">₦${product.price?.toLocaleString() || 0}</p>
                    </div>
                    <button class="wishlist-btn text-[#4A1942]/40 hover:text-[#D4145A] transition text-xl" 
                            data-product-id="${product.id}"
                            onclick="toggleWishlist('${product.id}')">
                        <i class="far fa-heart"></i>
                    </button>
                </div>
                <div class="product-actions mt-4">
                    <button class="w-full btn-primary text-sm py-2" onclick="addToCart('${product.id}', '${product.name}', ${product.price})">
                        <i class="fas fa-plus"></i> Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// --- Load Categories ---
async function loadCategories() {
    const container = document.getElementById('categoriesGrid');
    if (!container) return;
    
    try {
        const snapshot = await getDocs(collection(db, 'categories'));
        const categories = [];
        snapshot.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        
        // If no categories in Firestore, use defaults
        if (categories.length === 0) {
            const defaultCategories = [
                { id: 'nails', name: 'Nails', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop' },
                { id: 'lashes', name: 'Lashes', image: 'https://images.unsplash.com/photo-1583243130284-7d9f9b67f865?w=400&h=300&fit=crop' },
                { id: 'clothes', name: 'Clothes', image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&h=300&fit=crop' },
                { id: 'perfumes', name: 'Perfumes', image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=300&fit=crop' },
                { id: 'joggers', name: 'Joggers', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=300&fit=crop', comingSoon: true },
                { id: 'polo', name: 'Polo', image: 'https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=400&h=300&fit=crop', comingSoon: true }
            ];
            categories.push(...defaultCategories);
        }
        
        renderCategories(container, categories);
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// --- Render Categories ---
function renderCategories(container, categories) {
    container.innerHTML = categories.map(cat => `
        <div class="category-card" data-aos="zoom-in">
            <img src="${cat.image || 'assets/img/placeholder-category.jpg'}" alt="${cat.name}" />
            <div class="p-4 text-center">
                <h3 class="font-bold text-[#4A1942]">${cat.name}</h3>
                ${cat.comingSoon 
                    ? '<span class="text-xs bg-[#D4145A] text-white px-2 py-0.5 rounded-full">Coming Soon</span>'
                    : `<a href="shop.html?category=${cat.id}" class="text-sm text-[#D4145A] font-semibold hover:underline">Explore →</a>`
                }
            </div>
        </div>
    `).join('');
}

// --- Add to Cart ---
window.addToCart = function(productId, productName, price) {
    const user = auth.currentUser;
    
    if (!user) {
        showToast('Please login to add items to cart.', 'error');
        setTimeout(() => {
            window.location.href = 'auth.html';
        }, 1500);
        return;
    }
    
    // Get current cart from localStorage or Firestore
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id: productId, name: productName, price: price, quantity: 1 });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
    showToast(`${productName} added to cart! 🛍️`);
    
    // Also save to Firestore if user is logged in
    if (user) {
        const userRef = doc(db, 'users', user.uid);
        updateDoc(userRef, {
            cart: cart
        }).catch(error => {
            console.error('Error saving cart to Firestore:', error);
        });
    }
};

// --- Remove from Cart ---
window.removeFromCart = function(productId) {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const updatedCart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    updateCartBadge();
    showToast('Item removed from cart.');
    
    // Update Firestore
    const user = auth.currentUser;
    if (user) {
        const userRef = doc(db, 'users', user.uid);
        updateDoc(userRef, {
            cart: updatedCart
        }).catch(error => {
            console.error('Error updating cart in Firestore:', error);
        });
    }
};

// --- Update Cart Badge ---
function updateCartBadge() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    const badges = document.querySelectorAll('#cartBadge, #mobileCartBadge');
    badges.forEach(badge => {
        if (badge) badge.textContent = count;
    });
}

// --- Load Cart from Storage ---
function loadCartFromStorage() {
    updateCartBadge();
    
    // If user is logged in, sync cart with Firestore
    const user = auth.currentUser;
    if (user) {
        const userRef = doc(db, 'users', user.uid);
        getDoc(userRef).then(docSnap => {
            if (docSnap.exists()) {
                const userData = docSnap.data();
                if (userData.cart && userData.cart.length > 0) {
                    localStorage.setItem('cart', JSON.stringify(userData.cart));
                    updateCartBadge();
                }
            }
        }).catch(error => {
            console.error('Error loading cart from Firestore:', error);
        });
    }
}

// --- Toggle Wishlist ---
window.toggleWishlist = async function(productId) {
    const user = auth.currentUser;
    
    if (!user) {
        showToast('Please login to add to wishlist.', 'error');
        setTimeout(() => {
            window.location.href = 'auth.html';
        }, 1500);
        return;
    }
    
    try {
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists()) {
            const wishlist = docSnap.data().wishlist || [];
            const isInWishlist = wishlist.includes(productId);
            
            if (isInWishlist) {
                await updateDoc(userRef, {
                    wishlist: arrayRemove(productId)
                });
                showToast('Removed from wishlist 💔');
            } else {
                await updateDoc(userRef, {
                    wishlist: arrayUnion(productId)
                });
                showToast('Added to wishlist ❤️');
            }
        }
    } catch (error) {
        console.error('Error toggling wishlist:', error);
        showToast('Error updating wishlist.', 'error');
    }
};

// --- Setup Auth Listener ---
function setupAuthListener() {
    onAuthStateChanged(auth, (user) => {
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
            const adminRef = doc(db, 'admins', user.uid);
            getDoc(adminRef).then(docSnap => {
                if (docSnap.exists() && adminLink) {
                    adminLink.style.display = 'block';
                }
            }).catch(error => {
                console.error('Error checking admin status:', error);
            });
            
            // Sync cart with Firestore
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            const userRef = doc(db, 'users', user.uid);
            getDoc(userRef).then(docSnap => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    if (userData.cart && userData.cart.length > 0) {
                        localStorage.setItem('cart', JSON.stringify(userData.cart));
                        updateCartBadge();
                    }
                }
            }).catch(error => {
                console.error('Error syncing cart:', error);
            });
            
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
}

// --- Setup Event Listeners ---
function setupEventListeners() {
    // Mobile menu toggle
    const menuBtn = document.getElementById('menuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            const icon = menuBtn.querySelector('i');
            if (mobileMenu.classList.contains('hidden')) {
                icon.className = 'fas fa-bars';
            } else {
                icon.className = 'fas fa-times';
            }
        });
        
        document.querySelectorAll('#mobileMenu a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                menuBtn.querySelector('i').className = 'fas fa-bars';
            });
        });
    }
    
    // Scroll to top
    const scrollTopBtn = document.getElementById('scrollTop');
    if (scrollTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollTopBtn.classList.add('visible');
            } else {
                scrollTopBtn.classList.remove('visible');
            }
        });
        
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    
    // Navbar scroll shadow
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }
    
    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }
}

// --- Toggle Dark Mode ---
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const icon = document.querySelector('#darkModeToggle i');
    if (icon) {
        icon.className = document.body.classList.contains('dark-mode') 
            ? 'fas fa-sun' 
            : 'fas fa-moon';
    }
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    showToast(document.body.classList.contains('dark-mode') ? 'Dark mode enabled 🌙' : 'Light mode enabled ☀️');
}

// --- Load Dark Mode Preference ---
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    const icon = document.querySelector('#darkModeToggle i');
    if (icon) icon.className = 'fas fa-sun';
}

// --- Join Empire ---
window.joinEmpire = async function() {
    const user = auth.currentUser;
    
    if (!user) {
        showToast('Please login to join the Empire.', 'error');
        setTimeout(() => {
            window.location.href = 'auth.html';
        }, 1500);
        return;
    }
    
    try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
            joinedEmpire: true,
            empireJoinedAt: serverTimestamp(),
            notifications: {
                email: true,
                push: true,
                sms: false
            }
        });
        showToast('🎉 Welcome to the Empire! You\'ll now receive exclusive updates.');
    } catch (error) {
        console.error('Error joining empire:', error);
        showToast('Error joining Empire. Please try again.', 'error');
    }
};

// --- Export for global use ---
window.loadFeaturedProducts = loadFeaturedProducts;
window.loadCategories = loadCategories;
window.updateCartBadge = updateCartBadge;

console.log('👑 Felicity Empire — Luxury that speaks for you.');