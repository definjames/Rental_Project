
let returnsUserFilterId = '';
function setReturnsUserFilter(userId) {
  returnsUserFilterId = userId || '';
  loadReturnsTable();
}

const returnsGroupOpen = Object.create(null);

function todayDateKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toggleReturnsGroup(userId) {
  returnsGroupOpen[userId] = !returnsGroupOpen[userId];
  const open = !!returnsGroupOpen[userId];
  const body = document.getElementById(`returns_body_${userId}`);
  if (body) body.style.display = open ? '' : 'none';
  const arrow = document.getElementById(`returns_arrow_${userId}`);
  if (arrow) arrow.textContent = open ? 'â–¾' : 'â–¸';
}

async function processReturnInline(rentalId) {
  const qtyInput = document.getElementById(`returnQty_${rentalId}`);
  const dateInput = document.getElementById(`returnDate_${rentalId}`);
  const billNow = document.getElementById(`billNow_${rentalId}`);
  const btn = document.getElementById(`returnBtn_${rentalId}`);

  const returnQty = parseInt(qtyInput?.value || '0', 10);
  const maxQty = parseInt(qtyInput?.max || '0', 10);
  const returnDate = dateInput?.value || undefined;
  const generateBill = !!billNow?.checked;

  if (!returnQty || returnQty <= 0 || (maxQty && returnQty > maxQty)) {
    showAlert('Please enter a valid return quantity', 'error');
    return;
  }

  try {
    if (btn) btn.disabled = true;
    const resp = await fetch(`${API_BASE}/admin/returns/${rentalId}`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ returnQty, returnDate, generateBill })
    });
    const data = await resp.json();
    if (!resp.ok) {
      showAlert(data.error || 'Failed to process return', 'error');
      return;
    }

    if (data.bill) {
      showAlert(`Return processed! Bill generated: ${CURRENCY}${data.bill.totalAmount.toFixed(2)} (${data.bill.daysRented} days)`, 'success');
    } else if (data.storedBillId) {
      showAlert(`Return saved for billing later. ${data.remainingQty} items still rented.`, 'success');
    } else {
      showAlert(`Return processed. ${data.remainingQty} items still rented.`, 'success');
    }

    loadReturnsTable();
    loadProductsTable();
    if (data.bill || data.storedBillId) loadBillsTable();
  } catch (err) {
    console.error('Error processing return:', err);
    showAlert('Failed to process return', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Load returns table (collapsible by user, inline processing)
async function loadReturnsTable() {
  try {
    // Active rentals only
    const rentalsResponse = await fetch(`${API_BASE}/admin/rentals`, { headers: getAuthHeader() });
    const allRentals = await rentalsResponse.json();

    // Load all users
    const usersResponse = await fetch(`${API_BASE}/admin/users`, { headers: getAuthHeader() });
    const allUsers = await usersResponse.json();

    // Populate returns user filter
    const returnsFilter = document.getElementById('returnsUserFilterSelect');
    if (returnsFilter) {
      const prev = returnsFilter.value;
      returnsFilter.innerHTML = '<option value="">-- All Users --</option>';
      allUsers.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u._id;
        opt.textContent = u.name + (u.email ? ` (${u.email})` : '');
        returnsFilter.appendChild(opt);
      });
      returnsFilter.value = returnsUserFilterId || prev || '';
      returnsUserFilterId = returnsFilter.value || '';
    }

    const container = document.getElementById('returnsContainer');
    container.innerHTML = '';

    if (allRentals.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--muted);">No rentals</p>';
      return;
    }

    const showDate = todayDateKey();

    // Group active rentals by user + borrowed date (local day)
    const groups = new Map();
    allRentals.forEach(r => {
      const userId = r.user?._id || 'unknown';
      if (returnsUserFilterId && userId !== returnsUserFilterId) return;
      const dateKey = rentalLocalDateKey(r.rentedAt);
      const key = `${userId}|${dateKey}`;
      if (!groups.has(key)) {
        groups.set(key, {
          userId,
          dateKey,
          userName: r.user?.name || 'Unknown',
          userEmail: r.user?.email || '',
          rentals: []
        });
      }
      groups.get(key).rentals.push(r);
    });

    let groupIndex = 0;
    for (const [, g] of groups) {
      const groupId = `ret_${groupIndex++}_${g.userId}_${g.dateKey}`.replace(/[^a-zA-Z0-9_]/g, '_');
      if (returnsGroupOpen[groupId] === undefined) returnsGroupOpen[groupId] = false;
      const open = !!returnsGroupOpen[groupId];

      const card = document.createElement('div');
      card.style.marginBottom = '14px';
      card.style.border = '1px solid rgba(255,255,255,0.06)';
      card.style.borderRadius = '10px';
      card.style.overflow = 'hidden';

      const headerBtn = document.createElement('button');
      headerBtn.type = 'button';
      headerBtn.className = 'btn';
      headerBtn.style.width = '100%';
      headerBtn.style.textAlign = 'left';
      headerBtn.style.borderRadius = '0';
      headerBtn.style.background = 'var(--surface)';
      headerBtn.style.display = 'block';
      headerBtn.style.padding = '14px 14px';
      headerBtn.style.border = 'none';
      headerBtn.style.cursor = 'pointer';
      headerBtn.addEventListener('click', () => toggleReturnsGroup(groupId));
      headerBtn.innerHTML = `
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <div id="returns_arrow_${groupId}" style="min-width:18px; font-size: 18px; line-height: 1; color: var(--text);">${open ? '▾' : '▸'}</div>
          <div style="flex:1;">
            <div style="font-weight:700; color: var(--text);">${g.userName}</div>
            <div style="font-size:12px; color: var(--muted);">${g.userEmail}</div>
            <div style="margin-top:6px; font-size:12px; color: var(--muted);">${g.dateKey}</div>
          </div>
          <div style="font-size:12px; color: var(--muted); white-space:nowrap;">${g.rentals.length} item(s)</div>
        </div>
      `;

      const body = document.createElement('div');
      body.id = `returns_body_${groupId}`;
      body.style.display = open ? '' : 'none';
      body.style.background = 'var(--card)';
      body.style.padding = '12px 14px';
      body.style.borderTop = '1px solid rgba(255,255,255,0.06)';

      const list = document.createElement('div');
      list.style.display = 'grid';
      list.style.gap = '10px';

      g.rentals.forEach(r => {
        const rentedAtText = new Date(r.rentedAt).toLocaleString();
        const row = document.createElement('div');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '1fr 80px 190px 110px';
        row.style.gap = '10px';
        row.style.alignItems = 'center';
        row.style.padding = '10px';
        row.style.border = '1px solid rgba(255,255,255,0.06)';
        row.style.borderRadius = '8px';
        row.innerHTML = `
          <div style="font-weight:700; color: var(--text);">${r.product?.name || 'Unknown'}</div>
          <div style="color: var(--text);">${r.qty}</div>
          <div style="color: var(--muted); font-size: 12px;">${rentedAtText}</div>
          <input id="returnGroupQty_${r._id}" type="number" min="0" max="${r.qty}" value="0" style="width: 110px; padding: 8px; border: 1px solid rgba(255,255,255,0.10); border-radius: 6px; background: var(--surface); color: var(--text);">
        `;
        list.appendChild(row);
      });

      const controls = document.createElement('div');
      controls.style.display = 'flex';
      controls.style.gap = '12px';
      controls.style.alignItems = 'center';
      controls.style.justifyContent = 'space-between';
      controls.style.marginTop = '12px';
      controls.style.paddingTop = '12px';
      controls.style.borderTop = '1px solid rgba(255,255,255,0.06)';
      controls.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
          <label style="display:flex;gap:8px;align-items:center;color:var(--muted);font-size:12px;">
            Return date
            <input id="returnGroupDate_${groupId}" type="date" value="${showDate}" style="width: 150px; padding: 8px; border: 1px solid rgba(255,255,255,0.10); border-radius: 6px; background: var(--surface); color: var(--text);">
          </label>
          <label style="display:flex;gap:6px;align-items:center;color:var(--muted);font-size:12px;white-space:nowrap;">
            <input id="returnGroupBill_${groupId}" type="checkbox" style="width: 14px; height: 14px;">
            Bill now
          </label>
        </div>
        <button id="returnGroupBtn_${groupId}" class="btn" style="white-space:nowrap;">Process Returns</button>
      `;

      const rentalIds = g.rentals.map(r => r._id);
      controls.querySelector(`#returnGroupBtn_${groupId}`).addEventListener('click', async () => {
        const returnDate = document.getElementById(`returnGroupDate_${groupId}`)?.value || undefined;
        const generateBill = !!document.getElementById(`returnGroupBill_${groupId}`)?.checked;
        let any = false;
        let billsShown = 0;

        for (const rid of rentalIds) {
          const qty = parseInt(document.getElementById(`returnGroupQty_${rid}`)?.value || '0', 10);
          if (!qty || qty <= 0) continue;
          any = true;
          const resp = await fetch(`${API_BASE}/admin/returns/${rid}`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({ returnQty: qty, returnDate, generateBill })
          });
          const data = await resp.json().catch(() => ({}));
          if (!resp.ok) throw new Error(data.error || 'Failed to process return');
          if (data.bill) billsShown++;
        }

        if (!any) {
          showAlert('Set return qty > 0 for at least one item', 'error');
          return;
        }

        showAlert(billsShown > 0 ? 'Returns processed and bill(s) generated' : 'Returns processed', 'success');
        loadReturnsTable();
        loadProductsTable();
        loadBillsTable();
      });

      body.appendChild(list);
      body.appendChild(controls);
      card.appendChild(headerBtn);
      card.appendChild(body);
      container.appendChild(card);
    }
  } catch (err) {
    console.error('Error loading returns:', err);
    showAlert('Failed to load rentals', 'error');
  }
}


function showReturnModal(rentalId, userName, productName, rentedQty) {
  document.getElementById('returnRentalId').value = rentalId;
  document.getElementById('returnConfirmText').textContent = `${userName} - ${productName} (${rentedQty} items)`;
  document.getElementById('returnQtyInput').value = rentedQty;
  document.getElementById('returnQtyInput').max = rentedQty;
  document.getElementById('maxReturnQtyValue').textContent = rentedQty;
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const returnDateInput = document.getElementById('returnDateInput');
  if (returnDateInput) returnDateInput.value = `${y}-${m}-${day}`;
  const billNow = document.getElementById('generateBillNow');
  if (billNow) billNow.checked = false;
  document.getElementById('returnModal').classList.add('show');
}

// Close return modal
function closeReturnModal() {
  document.getElementById('returnModal').classList.remove('show');
}

// Confirm return (process with selected quantity)
async function confirmReturn() {
  const rentalId = document.getElementById('returnRentalId').value;
  const returnQty = parseInt(document.getElementById('returnQtyInput').value, 10);
  const maxQty = parseInt(document.getElementById('returnQtyInput').max, 10);
  const returnDate = document.getElementById('returnDateInput')?.value || undefined;
  const generateBill = !!document.getElementById('generateBillNow')?.checked;

  if (!returnQty || returnQty <= 0 || returnQty > maxQty) {
    showAlert('Please enter a valid return quantity', 'error');
    return;
  }

  try {
    const resp = await fetch(`${API_BASE}/admin/returns/${rentalId}`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ returnQty, returnDate, generateBill })
    });
    const data = await resp.json();
    if (resp.ok) {
      if (data.bill) {
        showAlert(`Return processed! Bill generated: ${CURRENCY}${data.bill.totalAmount.toFixed(2)} (${data.bill.daysRented} days)`, 'success');
      } else if (data.storedBillId) {
        showAlert(`Partial return processed. Saved return record for billing later. ${data.remainingQty} items still rented.`, 'success');
      } else {
        showAlert(`Partial return processed successfully. ${data.remainingQty} items still rented.`, 'success');
      }
      closeReturnModal();
      loadReturnsTable();
      loadProductsTable(); // update stock display
      if (data.bill || data.storedBillId) loadBillsTable();
    } else {
      showAlert(data.error || 'Failed to process return', 'error');
    }
  } catch (err) {
    console.error('Error processing return:', err);
    showAlert('Failed to process return', 'error');
  }
}

// Load bills table
