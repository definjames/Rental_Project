async function loadRentalsTable() {
  try {
    // Fetch all rentals and users
    const [rentalsResp, usersResp] = await Promise.all([
      fetch(`${API_BASE}/admin/rentals`, { headers: getAuthHeader() }),
      fetch(`${API_BASE}/admin/users`, { headers: getAuthHeader() })
    ]);
    const rentals = await rentalsResp.json();
    const users = await usersResp.json();

    // Populate user dropdown
    const userSelect = document.getElementById('userFilterSelect');
    userSelect.innerHTML = '<option value="">-- All Users --</option>';
    users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u._id;
      opt.textContent = u.name + ' (' + u.email + ')';
      userSelect.appendChild(opt);
    });

    // Populate batch rental creator dropdowns (one user, many products)
    loadRentalFormDropdowns(users);

    // Display all rentals
    displayRentals(rentals);
  } catch (err) {
    console.error('Error loading rentals:', err);
    showAlert('Failed to load rentals', 'error');
  }
}

// Filter rentals by user
async function filterRentalsByUser(userId) {
  try {
    const response = await fetch(`${API_BASE}/admin/rentals`, { headers: getAuthHeader() });
    let rentals = await response.json();
    
    if (userId) {
      rentals = rentals.filter(r => r.user._id === userId);
    }
    
    displayRentals(rentals);
  } catch (err) {
    console.error('Error filtering rentals:', err);
    showAlert('Failed to load rentals', 'error');
  }
}

// Display rentals in table
const rentalGroupOpen = Object.create(null);

function rentalLocalDateKey(d) {
  const dt = (d instanceof Date) ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toggleRentalGroup(groupId) {
  rentalGroupOpen[groupId] = !rentalGroupOpen[groupId];
  const open = !!rentalGroupOpen[groupId];

  document.querySelectorAll(`tr[data-parent-group="${groupId}"]`).forEach(tr => {
    tr.style.display = open ? '' : 'none';
  });

  const btn = document.querySelector(`button[data-group-toggle="${groupId}"]`);
  if (btn) btn.innerHTML = open ? '&#9662;' : '&#9656;'; // â–¼ / â–¶
}

function displayRentals(rentals) {
  const table = document.getElementById('rentalsTable').querySelector('tbody');
  table.innerHTML = '';

  if (rentals.length === 0) {
    table.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--muted);">No rentals found</td></tr>';
    return;
  }

  // Group by user + rented date (day)
  const groups = new Map();
  rentals.forEach(r => {
    const userId = r.user?._id || 'unknown';
    const dateKey = rentalLocalDateKey(r.rentedAt);
    const key = `${userId}|${dateKey}`;
    if (!groups.has(key)) {
      groups.set(key, {
        userName: r.user?.name || 'Unknown',
        userEmail: r.user?.email || '',
        dateKey,
        items: [],
      });
    }
    groups.get(key).items.push(r);
  });

  // Render groups (collapsed by default)
  let groupIndex = 0;
  for (const [, g] of groups) {
    const groupId = `rgrp_${groupIndex++}`;
    if (rentalGroupOpen[groupId] === undefined) rentalGroupOpen[groupId] = false;
    const open = !!rentalGroupOpen[groupId];

    const header = document.createElement('tr');
    header.innerHTML = `
      <td colspan="4" style="padding: 12px; background: var(--surface); border-bottom: 1px solid rgba(255,255,255,0.06);">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <button class="btn btn-sm" data-group-toggle="${groupId}" onclick="toggleRentalGroup('${groupId}')" style="min-width: 34px; padding: 4px 8px;">${open ? '&#9662;' : '&#9656;'}</button>
            <div>
              <div style="font-weight: 700; color: var(--text);">${g.userName}</div>
              <div style="font-size: 12px; color: var(--muted);">${g.userEmail}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="color: var(--text); font-weight: 700;">${g.dateKey}</div>
            <div style="font-size: 12px; color: var(--muted);">${g.items.length} item(s)</div>
          </div>
        </div>
      </td>
    `;
    table.appendChild(header);

    g.items.forEach(r => {
      const row = document.createElement('tr');
      row.setAttribute('data-parent-group', groupId);
      row.style.display = open ? '' : 'none';
      row.innerHTML = `
        <td style="color: var(--muted);"> </td>
        <td style="padding-left: 18px;">${r.product?.name || 'Unknown'}</td>
        <td>${r.qty}</td>
        <td>${new Date(r.rentedAt).toLocaleString()}</td>
      `;
      table.appendChild(row);
    });
  }
}

// Delete product

async function loadRentalFormDropdowns(users) {
  try {
    const userSelect = document.getElementById('rentalUserSelect');
    const productSelect = document.getElementById('rentalProductSelect');
    if (!userSelect || !productSelect) return;

    // Clear existing options (except first placeholder)
    while (userSelect.options.length > 1) {
      userSelect.remove(1);
    }
    while (productSelect.options.length > 1) {
      productSelect.remove(1);
    }

    // Populate users (filter out admins if needed)
    users.forEach(u => {
      const option = document.createElement('option');
      option.value = u._id;
      option.textContent = u.name;
      userSelect.appendChild(option);
    });

    // Lock the user dropdown when a batch is in progress.
    if (rentalsList_userId) {
      userSelect.value = rentalsList_userId;
      userSelect.disabled = true;
    } else {
      userSelect.disabled = false;
    }
    setRentalUserHint();

    // Populate products
    const productsResponse = await fetch(`${API_BASE}/admin/products`, { headers: getAuthHeader() });
    const products = await productsResponse.json();
    products.forEach(p => {
      const option = document.createElement('option');
      option.value = p._id;
      option.textContent = `${p.name} (Available: ${p.qty})`;
      productSelect.appendChild(option);
    });
  } catch (err) {
    console.error('Error loading form dropdowns:', err);
  }
}

// Rental list for batch creation
let rentalsList_data = [];
let rentalsList_userId = null;
let rentalsList_userName = '';

function setRentalUserHint() {
  const el = document.getElementById('rentalUserHint');
  if (!el) return;
  if (!rentalsList_userId) {
    el.textContent = 'Select one user, then add multiple products.';
    return;
  }
  el.textContent = `Selected user: ${rentalsList_userName}. Clear the list to change user.`;
}

// Add rental to list
function addRentalToList() {
  const userId = document.getElementById('rentalUserSelect').value;
  const productId = document.getElementById('rentalProductSelect').value;
  const qty = parseInt(document.getElementById('rentalQtyInput').value, 10);

  if (!userId || !productId || !qty || qty <= 0) {
    showAlert('Please select user, product and enter valid quantity', 'error');
    return;
  }

  const userOption = document.getElementById('rentalUserSelect').selectedOptions[0];
  const productOption = document.getElementById('rentalProductSelect').selectedOptions[0];

  if (!rentalsList_userId) {
    rentalsList_userId = userId;
    rentalsList_userName = userOption ? userOption.textContent : '';
    setRentalUserHint();
  } else if (rentalsList_userId !== userId) {
    showAlert('You can only add products for one user at a time. Clear the list to change user.', 'error');
    return;
  }

  rentalsList_data.push({
    userId: rentalsList_userId,
    productId,
    qty,
    userName: rentalsList_userName,
    productName: productOption.textContent
  });

  updateRentalsListDisplay();
  document.getElementById('rentalQtyInput').value = '1';
}

// Update rentals list display
function updateRentalsListDisplay() {
  const display = document.getElementById('rentalsList');
  if (rentalsList_data.length === 0) {
    display.innerHTML = '<p style="color: var(--muted);">No rentals added yet</p>';
    return;
  }

  display.innerHTML = rentalsList_data.map((r, idx) => `
    <div style="margin-bottom: 10px; padding: 10px; background: var(--card); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; display: flex; justify-content: space-between; align-items: center; color: var(--text);">
      <div style="font-size: 12px; line-height: 1.3;">
        <div><strong>${r.userName}</strong></div>
        <div>${r.productName} x${r.qty}</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="removeFromRentalsList(${idx})" style="padding: 2px 6px;">Remove</button>
    </div>
  `).join('');
}

// Remove rental from list
function removeFromRentalsList(idx) {
  rentalsList_data.splice(idx, 1);
  updateRentalsListDisplay();
  if (rentalsList_data.length === 0) {
    rentalsList_userId = null;
    rentalsList_userName = '';
    setRentalUserHint();
  }
}

// Clear rentals list
function clearRentalsList() {
  rentalsList_data = [];
  rentalsList_userId = null;
  rentalsList_userName = '';
  updateRentalsListDisplay();
  setRentalUserHint();
}

// Create all rentals
async function createRentals() {
  if (rentalsList_data.length === 0) {
    showAlert('No rentals to create', 'error');
    return;
  }

  try {
    let successCount = 0;
    for (const rental of rentalsList_data) {
      const resp = await fetch(`${API_BASE}/admin/rentals`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({
          userId: rental.userId,
          productId: rental.productId,
          qty: rental.qty
        })
      });

      if (resp.ok) {
        successCount++;
      }
    }

    showAlert(`${successCount}/${rentalsList_data.length} rental(s) created successfully`, 'success');
    rentalsList_data = [];
    rentalsList_userId = null;
    rentalsList_userName = '';
    updateRentalsListDisplay();
    setRentalUserHint();
    loadReturnsTable();
    loadRentalsTable();
    loadProductsTable();
  } catch (err) {
    console.error('Error creating rentals:', err);
    showAlert('Failed to create some rentals', 'error');
  }
}

