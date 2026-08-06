/* ================================================================
   FELICITY EMPIRE — Admin Core JavaScript
   Location: /assets/js/admin.js
   Purpose: Shared admin functionality
   ================================================================ */

// Admin Authentication
const ADMIN_CONFIG = {
    password: 'felicity2026',
    storagePrefix: 'fe_admin_'
};

// Check if admin is logged in
function adminCheckAuth() {
    const loggedIn = sessionStorage.getItem(ADMIN_CONFIG.storagePrefix + 'auth');
    if (!loggedIn && !window.location.pathname.includes('login')) {
        // Verify via session
        const pw = sessionStorage.getItem(ADMIN_CONFIG.storagePrefix + 'pw');
        if (pw !== ADMIN_CONFIG.password) {
            window.location.href = '../index.html';
        }
    }
}

// Toast Notifications
function adminToast(message, type = 'success') {
    const container = document.querySelector('.admin-toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `admin-toast ${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle' };
    toast.innerHTML = `<i class="fas ${icons[type] || icons.success}"></i><span>${message}</span>`;
    
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// Sidebar Toggle
function adminToggleSidebar() {
    const sidebar = document.querySelector('.admin-sidebar');
    const overlay = document.querySelector('.admin-mobile-overlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
}

// Modal Management
function adminOpenModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function adminCloseModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Close modal on overlay click
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('admin-modal-overlay') && e.target.classList.contains('active')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.admin-modal-overlay.active');
        openModals.forEach(m => {
            m.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
});

// Data Helpers
function adminGetData(key) {
    try {
        return JSON.parse(localStorage.getItem(ADMIN_CONFIG.storagePrefix + key) || '[]');
    } catch (e) {
        return [];
    }
}

function adminSaveData(key, data) {
    localStorage.setItem(ADMIN_CONFIG.storagePrefix + key, JSON.stringify(data));
}

function adminGenerateId() {
    return 'fe_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Format currency
function adminFormatCurrency(amount) {
    return 'N' + Number(amount).toLocaleString();
}

// Format date
function adminFormatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

// Debounce function
function adminDebounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Initialize admin
document.addEventListener('DOMContentLoaded', function() {
    adminCheckAuth();
    
    // Close sidebar when clicking overlay
    const overlay = document.querySelector('.admin-mobile-overlay');
    if (overlay) {
        overlay.addEventListener('click', adminToggleSidebar);
    }
    
    // Update sidebar badges
    updateSidebarBadges();
});

function updateSidebarBadges() {
    const products = adminGetData('products');
    const orders = adminGetData('orders');
    const appointments = adminGetData('appointments');
    
    const productBadge = document.getElementById('productCount');
    const orderBadge = document.getElementById('orderCount');
    const aptBadge = document.getElementById('aptCount');
    
    if (productBadge) productBadge.textContent = products.length;
    if (orderBadge) orderBadge.textContent = orders.length;
    if (aptBadge) aptBadge.textContent = appointments.filter(a => a.status === 'pending').length;
}

console.log('Felicity Empire Admin — Core JS Loaded');