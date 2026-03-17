async function loadUsersTable() {
  try {
    const response = await fetch(`${API_BASE}/admin/users`, { headers: getAuthHeader() });
    const users = await response.json();

    const table = document.getElementById('usersTable').querySelector('tbody');
    table.innerHTML = '';

    if (users.length === 0) {
      table.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--muted);">No users</td></tr>';
      return;
    }

    users.forEach(user => {
      const row = document.createElement('tr');
      const statusBadge = user.firstLogin
        ? '<span style="background: #f39c12; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">Pending</span>'
        : '<span style="background: #27ae60; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">Active</span>';

      const deleteBtn = user.role !== 'admin'
        ? `<button class="btn btn-danger btn-sm" onclick="deleteUser('${user._id}')">Delete</button>`
        : '<span style="color: var(--muted); font-size: 12px;">Protected</span>';

      row.innerHTML = `
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td><span style="text-transform: capitalize;">${user.role}</span></td>
        <td>${statusBadge}</td>
        <td>
          <div class="actions">
            ${deleteBtn}
          </div>
        </td>
      `;
      table.appendChild(row);
    });
  } catch (err) {
    console.error('Error loading users:', err);
    showAlert('Failed to load users', 'error');
  }
}

// Load products table

async function deleteUser(id) {
  if (!confirm('Are you sure you want to delete this user?')) return;

  try {
    const response = await fetch(`${API_BASE}/admin/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });

    if (response.ok) {
      showAlert('User deleted successfully', 'success');
      loadUsersTable();
    } else {
      showAlert('Failed to delete user', 'error');
    }
  } catch (err) {
    console.error('Error deleting user:', err);
    showAlert('Failed to delete user', 'error');
  }
}

// Show add user modal
function showAddUserModal() {
  document.getElementById('addUserModal').classList.add('show');
}


// Close add user modal
function closeAddUserModal() {
  document.getElementById('addUserModal').classList.remove('show');
  document.getElementById('addUserForm').reset();
}

// Add user
async function addUser(event) {
  event.preventDefault();

  const user = {
    userid: document.getElementById('userId').value,
    name: document.getElementById('newUserName').value,
    email: document.getElementById('userEmail').value,
    password: document.getElementById('userPassword').value,
    role: document.getElementById('userRole').value
  };

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(user)
    });

    if (response.ok) {
      showAlert('User added successfully', 'success');
      closeAddUserModal();
      loadUsersTable();
    } else {
      const error = await response.json();
      showAlert(error.error || 'Failed to add user', 'error');
    }
  } catch (err) {
    console.error('Error adding user:', err);
    showAlert('Failed to add user', 'error');
  }
}

