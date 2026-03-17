async function loadDashboard() {
  try {
    // Load users count
    const usersResponse = await fetch(`${API_BASE}/admin/users`, { headers: getAuthHeader() });
    const users = await usersResponse.json();
    document.getElementById('totalUsers').textContent = users.length;

    // Load products count
    const productsResponse = await fetch(`${API_BASE}/admin/products`, { headers: getAuthHeader() });
    const products = await productsResponse.json();
    document.getElementById('totalProducts').textContent = products.length;

    // Load rentals for active rentals count
    const rentalsResp = await fetch(`${API_BASE}/admin/rentals`, { headers: getAuthHeader() });
    const rentals = await rentalsResp.json().catch(() => []);
    const activeUserCount = new Set((rentals || []).map(r => r.user?._id).filter(Boolean)).size;
    document.getElementById('activeRentals').textContent = String(activeUserCount);

    // Load bills and calculate total revenue
    const billsResponse = await fetch(`${API_BASE}/admin/bills`, { headers: getAuthHeader() });
    const bills = await billsResponse.json().catch(() => []);
    const totalRevenue = (bills || []).reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
    document.getElementById('totalRevenue').textContent = CURRENCY + totalRevenue.toFixed(2);
  } catch (err) {
    console.error('Error loading dashboard:', err);
    document.getElementById('totalRevenue').textContent = CURRENCY + '0';
  }
}
