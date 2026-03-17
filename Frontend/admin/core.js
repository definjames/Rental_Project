// Configuration
var API_BASE = '/api';
var CURRENCY = '\u20B9';
var currentUser = null;

// Initialize on page load
window.addEventListener('DOMContentLoaded', async () => {
  const ok = await checkAuth();
  if (!ok) return;
  loadDashboard();
  setRentalUserHint();
});

// Check authentication
async function checkAuth() {
  try {
    const resp = await fetch(`${API_BASE}/auth/me`, { credentials: 'same-origin' });
    const data = await resp.json().catch(() => ({}));
    const userObj = data.user || null;
    if (!resp.ok || !userObj) throw new Error('not logged in');

    if (userObj.role !== 'admin') {
      alert('Admin access required');
      window.location.href = 'index.html';
      return;
    }

    currentUser = userObj;
    document.getElementById('userName').textContent = userObj.name;
    return true;
  } catch (e) {
    alert('Please login first');
    window.location.href = 'login.html';
    return false;
  }
}

// Get authorization header
function getAuthHeader() {
  return {
    'Content-Type': 'application/json'
  };
}

// Show section
function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.content-area').forEach(el => {
    el.classList.remove('active');
  });

  // Show selected section
  document.getElementById(sectionId).classList.add('active');

  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  const navLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
  if (navLink) navLink.classList.add('active');

  // Update page title
  const titles = {
    dashboard: 'Dashboard',
    users: 'Users',
    products: 'Products',
    rentals: 'Rentals',
    returns: 'Returns',
    bills: 'Bills'
  };
  document.getElementById('pageTitle').textContent = titles[sectionId] || 'Dashboard';

  // Load section-specific data
  if (sectionId === 'users') {
    loadUsersTable();
  } else if (sectionId === 'products') {
    loadProductsTable();
  } else if (sectionId === 'rentals') {
    loadRentalsTable();
  } else if (sectionId === 'returns') {
    loadReturnsTable();
  } else if (sectionId === 'bills') {
    loadBillsTable();
  }
}

// Load dashboard stats

// Show alert
function showAlert(message, type) {
  const alertEl = document.getElementById('alert');
  alertEl.textContent = message;
  alertEl.className = `alert alert-${type} show`;
  setTimeout(() => {
    alertEl.classList.remove('show');
  }, 3000);
}

// Logout
function logout() {
  fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'same-origin' }).catch(() => {});
  window.location.href = 'index.html';
}
