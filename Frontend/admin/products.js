async function loadProductsTable() {
  try {
    const response = await fetch(`${API_BASE}/admin/products`, { headers: getAuthHeader() });
    const products = await response.json();

    const table = document.getElementById('productsTable').querySelector('tbody');
    table.innerHTML = '';

    if (products.length === 0) {
      table.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--muted);">No products</td></tr>';
      return;
    }

    products.forEach(product => {
      const row = document.createElement('tr');
      const imageHtml = product.img
        ? `<img src="${product.img}" alt="${product.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">`
        : '<span style="color: var(--muted);">No image</span>';

      row.innerHTML = `
        <td>${imageHtml}</td>
        <td>${product.name}</td>
        <td>${product.cat}</td>
        <td>${CURRENCY}${product.price}</td>
        <td>${product.qty}</td>
        <td>
          <div class="actions">
            <button class="btn btn-sm" onclick="editProduct('${product._id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteProduct('${product._id}')">Delete</button>
          </div>
        </td>
      `;
      table.appendChild(row);
    });
  } catch (err) {
    console.error('Error loading products:', err);
    showAlert('Failed to load products', 'error');
  }
}

// Load rentals table with user dropdown

// Delete product
async function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;

  try {
    const response = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });

    if (response.ok) {
      showAlert('Product deleted successfully', 'success');
      loadProductsTable();
    } else {
      showAlert('Failed to delete product', 'error');
    }
  } catch (err) {
    console.error('Error deleting product:', err);
    showAlert('Failed to delete product', 'error');
  }
}

// Edit product
async function editProduct(id) {
  try {
    // Fetch product details
    const response = await fetch(`${API_BASE}/admin/products`, { headers: getAuthHeader() });
    const products = await response.json();
    const product = products.find(p => p._id === id);

    if (product) {
      document.getElementById('editProductId').value = product._id;
      document.getElementById('editProductName').value = product.name;
      document.getElementById('editProductCategory').value = product.cat;
      document.getElementById('editProductPrice').value = product.price;
      document.getElementById('editProductStock').value = product.qty;
      document.getElementById('editProductImage').value = product.img || '';
      document.getElementById('editProductModal').classList.add('show');
    }
  } catch (err) {
    console.error('Error fetching product:', err);
    showAlert('Failed to load product details', 'error');
  }
}

// Close edit product modal
function closeEditProductModal() {
  document.getElementById('editProductModal').classList.remove('show');
  document.getElementById('editProductForm').reset();
}

// Update product
async function updateProduct(event) {
  event.preventDefault();

  const id = document.getElementById('editProductId').value;
  const product = {
    name: document.getElementById('editProductName').value,
    cat: document.getElementById('editProductCategory').value,
    price: parseFloat(document.getElementById('editProductPrice').value),
    qty: parseInt(document.getElementById('editProductStock').value),
    img: document.getElementById('editProductImage').value || undefined
  };

  try {
    const response = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(product)
    });

    if (response.ok) {
      showAlert('Product updated successfully', 'success');
      closeEditProductModal();
      loadProductsTable();
    } else {
      const error = await response.json();
      showAlert(error.error || 'Failed to update product', 'error');
    }
  } catch (err) {
    console.error('Error updating product:', err);
    showAlert('Failed to update product', 'error');
  }
}


// Show add product modal
function showAddProductModal() {
  document.getElementById('addProductModal').classList.add('show');
  // Reset image preview
  const preview = document.getElementById('imagePreview');
  preview.innerHTML = '<div class="preview-placeholder">Click to upload image</div>';
  document.getElementById('productImage').value = '';

  // Make preview clickable
  preview.addEventListener('click', () => {
    document.getElementById('productImageFile').click();
  });
}

// Close add product modal
function closeAddProductModal() {
  document.getElementById('addProductModal').classList.remove('show');
  document.getElementById('addProductForm').reset();
  // Reset image preview
  const preview = document.getElementById('imagePreview');
  preview.innerHTML = '<div class="preview-placeholder">Click to upload image</div>';
}

// Preview image before upload
function previewImage(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById('imagePreview');
      preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
      // Clear URL input when file is selected
      document.getElementById('productImage').value = '';
    };
    reader.readAsDataURL(file);
  }
}

// Add product
async function addProduct(event) {
  event.preventDefault();

  const name = document.getElementById('productName').value;
  const category = document.getElementById('productCategory').value;
  const price = parseFloat(document.getElementById('productPrice').value);
  const stock = parseInt(document.getElementById('productStock').value);
  const imageUrl = document.getElementById('productImage').value;
  const imageFile = document.getElementById('productImageFile').files[0];

  let img = imageUrl || undefined;

  // If file is selected, convert to base64
  if (imageFile) {
    img = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(imageFile);
    });
  }

  const product = {
    name,
    cat: category,
    price,
    qty: stock,
    img
  };

  try {
    const response = await fetch(`${API_BASE}/admin/products`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(product)
    });

    if (response.ok) {
      showAlert('Product added successfully', 'success');
      closeAddProductModal();
      loadProductsTable();
    } else {
      const error = await response.json();
      showAlert(error.error || 'Failed to add product', 'error');
    }
  } catch (err) {
    console.error('Error adding product:', err);
    showAlert('Failed to add product', 'error');
  }
}

