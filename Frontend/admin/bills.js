async function loadBillsTable() {
  try {
    const container = document.getElementById('billsContainer');
    if (!container) return;

    // Need rentals + bills to generate grouped invoices.
    const [rentalsResp, billsResp] = await Promise.all([
      fetch(`${API_BASE}/admin/rentals?includeCompleted=true`, { headers: getAuthHeader() }),
      fetch(`${API_BASE}/admin/bills`, { headers: getAuthHeader() }),
    ]);
    const rentals = await rentalsResp.json().catch(() => []);
    const bills = await billsResp.json().catch(() => []);

    container.innerHTML = '';
    if (!Array.isArray(rentals) || rentals.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--muted);">No rentals found</p>';
      return;
    }

    // Index bills by rentalId
    const billsByRental = new Map();
    (bills || []).forEach(b => {
      const rid = b.rental?._id || b.rental;
      if (!rid) return;
      if (!billsByRental.has(rid)) billsByRental.set(rid, []);
      billsByRental.get(rid).push(b);
    });

    // Group rentals by user + borrowed date
    const groups = new Map();
    rentals.forEach(r => {
      const userId = r.user?._id || 'unknown';
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

    const todayKey = todayDateKey();
    let idx = 0;
    for (const [, g] of groups) {
      const groupId = `bill_${idx++}_${g.userId}_${g.dateKey}`.replace(/[^a-zA-Z0-9_]/g, '_');
      if (window.__billsGroupOpen === undefined) window.__billsGroupOpen = Object.create(null);
      const openMap = window.__billsGroupOpen;
      if (openMap[groupId] === undefined) openMap[groupId] = false;
      const open = !!openMap[groupId];

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
      headerBtn.addEventListener('click', () => {
        openMap[groupId] = !openMap[groupId];
        const body = document.getElementById(`bills_body_${groupId}`);
        const arrow = document.getElementById(`bills_arrow_${groupId}`);
        const o = !!openMap[groupId];
        if (body) body.style.display = o ? '' : 'none';
        if (arrow) arrow.textContent = o ? '▾' : '▸';
      });
      headerBtn.innerHTML = `
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <div id="bills_arrow_${groupId}" style="min-width:18px; font-size: 18px; line-height: 1; color: var(--text);">${open ? '▾' : '▸'}</div>
          <div style="flex:1;">
            <div style="font-weight:700; color: var(--text);">${g.userName}</div>
            <div style="font-size:12px; color: var(--muted);">${g.userEmail}</div>
            <div style="margin-top:6px; font-size:12px; color: var(--muted);">Borrowed: ${g.dateKey}</div>
          </div>
          <div style="font-size:12px; color: var(--muted); white-space:nowrap;">${g.rentals.length} item(s)</div>
        </div>
      `;

      const body = document.createElement('div');
      body.id = `bills_body_${groupId}`;
      body.style.display = open ? '' : 'none';
      body.style.background = 'var(--card)';
      body.style.padding = '12px 14px';
      body.style.borderTop = '1px solid rgba(255,255,255,0.06)';

      const list = document.createElement('div');
      list.style.display = 'grid';
      list.style.gap = '10px';

      g.rentals.forEach(r => {
        const rid = r._id;
        const billList = billsByRental.get(rid) || [];
        const returnedQtyAll = billList.reduce((sum, b) => sum + (b.qty || 0), 0);
        const remainingNow = r.qty || 0;
        const borrowedQty = (r.originalQty != null) ? r.originalQty : (remainingNow + returnedQtyAll);
        const status = remainingNow > 0 ? 'Not returned' : 'Returned';

        const row = document.createElement('div');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '1fr 110px 110px 110px 140px';
        row.style.gap = '10px';
        row.style.alignItems = 'center';
        row.style.padding = '10px';
        row.style.border = '1px solid rgba(255,255,255,0.06)';
        row.style.borderRadius = '8px';
        row.innerHTML = `
          <div style="font-weight:700; color: var(--text);">${r.product?.name || 'Unknown'}</div>
          <div style="color: var(--text);">Borrowed: ${borrowedQty}</div>
          <div style="color: var(--text);">Returned: ${returnedQtyAll}</div>
          <div style="color: var(--text);">Left: ${remainingNow}</div>
          <div style="color: var(--muted); font-size: 12px;">${status}</div>
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
        <label style="display:flex;gap:8px;align-items:center;color:var(--muted);font-size:12px;">
          Bill as of
          <input id="billAsOf_${groupId}" type="date" value="${todayKey}" style="width: 150px; padding: 8px; border: 1px solid rgba(255,255,255,0.10); border-radius: 6px; background: var(--surface); color: var(--text);">
        </label>
        <button class="btn" id="printBill_${groupId}" style="white-space:nowrap;">Print Bill (All Items)</button>
      `;

      controls.querySelector(`#printBill_${groupId}`).addEventListener('click', () => {
        const asOf = document.getElementById(`billAsOf_${groupId}`)?.value || todayKey;
        printBorrowGroup({
          group: g,
          rentals: g.rentals,
          billsByRental,
          asOf
        });
      });

      body.appendChild(list);
      body.appendChild(controls);
      card.appendChild(headerBtn);
      card.appendChild(body);
      container.appendChild(card);
    }
  } catch (err) {
    console.error('Error loading bills:', err);
    showAlert('Failed to load bills', 'error');
  }
}

function printBorrowGroup({ group, rentals, billsByRental, asOf }) {
  // Interpret `asOf` as end of that day in local time.
  const asOfEnd = new Date(asOf + 'T23:59:59');
  const rentedDateStr = group.dateKey;

  let subtotal = 0;
  const lines = [];

  rentals.forEach(r => {
    const rid = r._id;
    const billList = (billsByRental.get(rid) || []).slice().sort((a, b) => new Date(a.returnedAt) - new Date(b.returnedAt));
    const dailyRate = r.product?.price || (billList[0]?.dailyRate || 0);
    const returnedBills = billList.filter(b => new Date(b.returnedAt) <= asOfEnd);
    const returnedQty = returnedBills.reduce((sum, b) => sum + (b.qty || 0), 0);
    const returnedAmount = returnedBills.reduce((sum, b) => sum + (b.subtotal || 0), 0);
    const remainingNow = r.qty || 0;
    const borrowedQty = (r.originalQty != null) ? r.originalQty : (remainingNow + billList.reduce((s, b) => s + (b.qty || 0), 0));

    // Charge for returned qty using stored bill subtotals up to asOf.
    if (returnedQty > 0) {
      subtotal += returnedAmount;
      lines.push(`<tr><td>${r.product?.name || 'Unknown'}</td><td>${returnedQty}</td><td>Returned</td><td>${CURRENCY}${dailyRate.toFixed(2)}</td><td>${CURRENCY}${returnedAmount.toFixed(2)}</td></tr>`);
    }

    // Charge remaining qty up to asOfEnd (still not returned).
    const remainingAsOf = Math.max(0, borrowedQty - returnedQty);
    if (remainingAsOf > 0) {
      let days = Math.ceil((asOfEnd - new Date(r.rentedAt)) / (1000 * 60 * 60 * 24));
      if (days < 1) days = 1;
      const activeSub = remainingAsOf * dailyRate * days;
      subtotal += activeSub;
      lines.push(`<tr><td>${r.product?.name || 'Unknown'}</td><td>${remainingAsOf}</td><td>Not returned (as of ${asOf})</td><td>${CURRENCY}${dailyRate.toFixed(2)}</td><td>${CURRENCY}${activeSub.toFixed(2)}</td></tr>`);
    }
  });

  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Borrowed Items Bill</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #111; }
        h1 { margin: 0 0 6px 0; }
        .muted { color: #555; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
        th { background: #f5f5f5; }
        .totals { margin-top: 14px; display: grid; grid-template-columns: 1fr auto; gap: 8px; max-width: 420px; }
        .totals div { padding: 6px 0; }
        .totals .strong { font-weight: 700; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <h1>Rental Bill</h1>
      <div class="muted">${group.userName} (${group.userEmail || 'N/A'})</div>
      <div class="muted">Borrowed date: ${rentedDateStr}</div>
      <div class="muted">Bill as of: ${asOf}</div>

      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Status</th>
            <th>Rate/day</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${lines.join('')}
        </tbody>
      </table>

      <div class="totals">
        <div>Subtotal</div><div>${CURRENCY}${subtotal.toFixed(2)}</div>
        <div>GST (18%)</div><div>${CURRENCY}${gst.toFixed(2)}</div>
        <div class="strong">Total</div><div class="strong">${CURRENCY}${total.toFixed(2)}</div>
      </div>
    </body>
    </html>
  `;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.print();
}

// View bill details
async function viewBill(billId) {
  try {
    const response = await fetch(`${API_BASE}/admin/bills`, { headers: getAuthHeader() });
    const bills = await response.json();
    const bill = bills.find(b => b._id === billId);

    if (bill) {
      const billDetails = document.getElementById('billDetails');
      billDetails.innerHTML = `
        <div style="padding: 20px; border: 1px solid var(--accent); border-radius: 8px; background: var(--surface);">
          <h3 style="color: var(--accent); margin-bottom: 20px;">Rental Bill</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div><strong>Bill ID:</strong> ${bill._id}</div>
            <div><strong>Generated:</strong> ${new Date(bill.generatedAt).toLocaleString()}</div>
            <div><strong>Customer:</strong> ${bill.user?.name || 'Unknown'}</div>
            <div><strong>Email:</strong> ${bill.user?.email || 'N/A'}</div>
          </div>

          <div style="border-top: 1px solid var(--muted); padding-top: 15px; margin-bottom: 15px;">
            <h4 style="color: var(--text); margin-bottom: 10px;">Rental Details</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div><strong>Product:</strong> ${bill.product?.name || 'Unknown'}</div>
              <div><strong>Category:</strong> ${bill.product?.cat || 'N/A'}</div>
              <div><strong>Quantity:</strong> ${bill.qty}</div>
              <div><strong>Daily Rate:</strong> ${CURRENCY}${bill.dailyRate.toFixed(2)}</div>
              <div><strong>Days Rented:</strong> ${bill.daysRented}</div>
              <div><strong>Rented Date:</strong> ${new Date(bill.rentedAt).toLocaleDateString()}</div>
              <div><strong>Return Date:</strong> ${new Date(bill.returnedAt).toLocaleDateString()}</div>
            </div>
          </div>

          <div style="border-top: 1px solid var(--muted); padding-top: 15px;">
            <h4 style="color: var(--text); margin-bottom: 10px;">Bill Summary</h4>
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px; align-items: center;">
              <div><strong>Subtotal (${bill.qty} x ${CURRENCY}${bill.dailyRate.toFixed(2)} x ${bill.daysRented} days):</strong></div>
              <div>${CURRENCY}${bill.subtotal.toFixed(2)}</div>

              <div><strong>GST (18%):</strong></div>
              <div>${CURRENCY}${bill.gstAmount.toFixed(2)}</div>

              <div style="border-top: 1px solid var(--accent); padding-top: 10px; font-size: 18px; font-weight: bold; color: var(--accent);">
                <strong>Total Amount:</strong>
              </div>
              <div style="border-top: 1px solid var(--accent); padding-top: 10px; font-size: 18px; font-weight: bold; color: var(--accent);">
                ${CURRENCY}${bill.totalAmount.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      `;
      document.getElementById('viewBillModal').classList.add('show');
    }
  } catch (err) {
    console.error('Error loading bill details:', err);
    showAlert('Failed to load bill details', 'error');
  }
}

// Close view bill modal
function closeViewBillModal() {
  document.getElementById('viewBillModal').classList.remove('show');
}

// Print bill
function printBill() {
  const billDetails = document.getElementById('billDetails');
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Rental Bill</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .bill-header { text-align: center; margin-bottom: 30px; }
        .bill-details { margin-bottom: 20px; }
        .bill-summary { border-top: 1px solid #000; padding-top: 15px; }
        .total { font-size: 18px; font-weight: bold; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <div class="bill-header">
        <h1>Rental Management System</h1>
        <h2>Bill Receipt</h2>
      </div>
      ${billDetails.innerHTML}
      <div style="text-align: center; margin-top: 30px;">
        <p>Thank you for your business!</p>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}
