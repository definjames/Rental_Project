const $ = s => document.querySelector(s);

let products = [];

// wrapper for backend fetch calls (similar pattern to auth.js)
async function apiFetch(path, options = {}){
  // point to live backend on Render instead of localhost
  const base = 'https://rental-project-6tni.onrender.com';

  if(!options.headers) options.headers = {};
  if(options.body && !(options.body instanceof FormData)){
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const token = localStorage.getItem('token');
  if(token) options.headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(base + '/api' + path, options);
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw data;
  return data;
}

async function loadProducts(){
  try{
    const data = await apiFetch('/products');
    products = data.map(p=>({ ...p, id: p._id }));
  }catch(err){
    console.error('Failed to load products from API', err);
    products = []; // fallback empty
  }
}

// Global showSection: hides other sections, locks body scroll, enables internal scroll for products.
window.showSection = function(id){
  const sections = Array.from(document.querySelectorAll('section'));
  sections.forEach(s=>{ if(s.id === id) s.classList.remove('hidden'); else s.classList.add('hidden'); });

  // Always prevent body-level scroll so we control scroll per-section
  document.body.classList.add('no-scroll');

  // Products internal scroll
  const productsSection = document.getElementById('products');
  if(id === 'products'){
    productsSection?.classList.add('scrollable');
    const inner = productsSection?.querySelector('.section-inner');
    if(inner) inner.scrollTop = 0;
  } else {
    productsSection?.classList.remove('scrollable');
  }

  // Admin access: admin section shows admin panel only for admins
  if(id === 'admin'){
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if(!currentUser || currentUser.role !== 'admin'){
      alert('Access denied: Admins only');
      // fallback to home
      window.showSection('home');
      return;
    }
    const panel = document.getElementById('adminPanel');
    panel?.classList.remove('hidden');
    panel?.classList.add('is-open');
    panel?.setAttribute('aria-hidden','false');
    document.body.classList.add('no-scroll');
  } else {
    const panel = document.getElementById('adminPanel');
    if(panel){
      panel.classList.add('hidden');
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden','true');
    }
  }

  // update active nav link
  document.querySelectorAll('.nav a').forEach(a=>{
    a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
  });
};

function renderProductsGrid(){
  const grid = $('#productGrid');
  grid.innerHTML = '';
  products.forEach(p=>{
    const c = document.createElement('div');
    c.className = 'product-card';
    c.setAttribute('data-id', p.id);
    c.innerHTML = `
      ${p.img ? `<div class="product-thumb"><img src="${p.img}" alt="${p.name}" /> </div>` : ''}
      <div class="product-info">
        <div class="product-title">${p.name}</div>
        <div class="product-meta">${p.cat} • ${p.qty} in stock</div>
        <div class="product-price">₹${p.price}/day</div>
      </div>
      ${ (JSON.parse(localStorage.getItem('currentUser')||'null')?.role === 'admin') ? `<div class="product-actions"><button class="btn small" data-action="edit" data-id="${p.id}">Edit</button> <button class="btn small ghost" data-action="remove" data-id="${p.id}">Remove</button></div>` : ''}
    `;
    grid.appendChild(c);
  });
}

function setAdminStatus(msg){
  const el = document.getElementById('adminStatus');
  if(!el) return;
  el.textContent = msg;
  setTimeout(()=>{ if(el && el.textContent === msg) el.textContent = ''; }, 4000);
}

function renderAdminProductList(){
  const list = $('#adminProductList');
  if(!list) return;
  list.innerHTML = '';
  if(products.length===0) list.textContent = 'No products';
  products.forEach(p=>{
    const row = document.createElement('div');
    row.className = 'admin-row';
    row.innerHTML = `<strong>${p.name}</strong> — ${p.cat} — ₹${p.price}/day — ${p.qty} qty
    <div style="margin-top:6px">
      <button class="btn small" data-action="edit" data-id="${p.id}">Edit</button>
      <button class="btn small ghost" data-action="remove" data-id="${p.id}">Remove</button>
    </div>`;
    list.appendChild(row);
  });
}

window.renderUserList = async function(){
  const userList = $('#userList');
  if(!userList) return;
  try{
    const users = await apiFetch('/users');
    if(users.length === 0){ userList.textContent = 'No users found'; return; }
    userList.innerHTML = '';
    users.forEach(u=>{
      const urow = document.createElement('div');
      urow.className = 'admin-row';
      const resetBtn = u.role !== 'admin' ? `<button class="btn small ghost" data-action="remove-user" data-id="${u._id}">Remove</button>` : '';
      const forceBtn = `<button class="btn small" data-action="force-reset" data-id="${u._id}">Force reset</button>`;
      const firstBadge = u.firstLogin ? `<span class="badge" style="margin-left:8px;color:#c00">(change password on first login)</span>` : '';
      urow.innerHTML = `<strong>${u.name}</strong> <small>(${u.email})</small> — <em>${u.role}</em> ${firstBadge}
        <div style="margin-top:6px">
          ${resetBtn} ${forceBtn}
        </div>`;
      userList.appendChild(urow);
    });
  }catch(err){
    console.error('failed to fetch users', err);
    userList.textContent = 'Unable to load users';
  }
};

function attachAdminHandlers(){
  // product card click (open admin edit) and button actions
  document.body.addEventListener('click', async function(e){
    // if admin clicked a product card (but not a button), open admin edit
    const card = e.target.closest('.product-card');
    const isBtn = e.target.closest('button');
    if(card && !isBtn && JSON.parse(localStorage.getItem('currentUser')||'null')?.role === 'admin'){
      const id = card.getAttribute('data-id');
      const p = products.find(x=>x.id===id);
      if(p){
        // navigate to admin section and load product for edit
        window.showSection('admin');
        document.querySelectorAll('.admin-tab').forEach(b=>b.classList.remove('active'));
        document.querySelector('.admin-tab[data-tab="products"]')?.classList.add('active');
        $('#adminTabProducts')?.classList.remove('hidden');
        $('#adminTabUsers')?.classList.add('hidden');

        setTimeout(()=>{
          $('#pId').value = p.id;
          $('#pName').value = p.name;
          $('#pCategory').value = p.cat;
          $('#pPrice').value = p.price;
          $('#pQty').value = p.qty;
          $('#pImg').value = p.img || '';
          const preview = document.getElementById('pImgPreview');
          if(preview && p.img){ preview.src = p.img; preview.style.display='block'; } else if(preview){ preview.src=''; preview.style.display='none'; }
          if(window.setAdminStatus) setAdminStatus('Loaded product for edit: ' + p.name);
        }, 30);
        return;
      }
    }

    const btn = e.target.closest('button[data-action]');
    if(!btn) return;
    const action = btn.getAttribute('data-action');
    if(action === 'edit'){
      const id = btn.getAttribute('data-id');
      const p = products.find(x=>x.id===id);
      if(p){
        $('#pId').value = p.id;
        $('#pName').value = p.name;
        $('#pCategory').value = p.cat;
        $('#pPrice').value = p.price;
        $('#pQty').value = p.qty;
        $('#pImg').value = p.img || '';
        const preview = document.getElementById('pImgPreview');
        if(preview && p.img){ preview.src = p.img; preview.style.display='block'; } else if(preview){ preview.src=''; preview.style.display='none'; }
        window.scrollTo({top:0, behavior:'smooth'});
      }
    } else if(action === 'remove'){
      const id = btn.getAttribute('data-id');
      if(!confirm('Remove product?')) return;
      try{
        await apiFetch('/products/' + id, { method: 'DELETE' });
        products = products.filter(x=>x.id!==id);
        renderProductsGrid();
        renderAdminProductList();
        if(window.setAdminStatus) setAdminStatus('Product removed');
      }catch(err){
        console.error('delete product error', err);
        alert('Failed to delete product');
      }
    } else if(action === 'remove-user'){
      const id = btn.getAttribute('data-id');
      if(!confirm('Remove user?')) return;
      try{
        await apiFetch('/users/' + id, { method: 'DELETE' });
        if(window.setAdminStatus) setAdminStatus('User removed');
        await window.renderUserList();
      }catch(err){
        console.error('delete user failed', err);
        alert('Failed to delete user');
      }
    } else if(action === 'force-reset'){
      alert('Force reset is not implemented in backend demo');
    }
  });

  // admin form submit
  $('#adminForm')?.addEventListener('submit', async e=>{
    e.preventDefault();
    const id = $('#pId').value;
    const name = $('#pName').value?.trim();
    if(!name) return alert('Please enter a product name');
    const pObj = {
      name,
      cat: $('#pCategory').value?.trim() || 'General',
      price: +$('#pPrice').value || 0,
      qty: +$('#pQty').value || 0,
      img: $('#pImg').value?.trim() || ''
    };
    try{
      if(id){
        const updated = await apiFetch('/products/' + id, { method:'PUT', body: pObj });
        products = products.map(p => p.id === id ? { ...updated, id: updated._id } : p);
        if(window.setAdminStatus) setAdminStatus('Product updated');
      } else {
        const created = await apiFetch('/products', { method:'POST', body: pObj });
        products.push({ ...created, id: created._id });
        if(window.setAdminStatus) setAdminStatus('Product added');
      }
      renderProductsGrid();
      renderAdminProductList();
      $('#adminForm').reset();
      const preview = document.getElementById('pImgPreview'); if(preview){ preview.src=''; preview.style.display='none'; }
    }catch(err){
      console.error('product save error', err);
      alert('Failed to save product');
    }
  });

  $('#adminReset')?.addEventListener('click', ()=>$('#adminForm').reset());

  // Admin: Add User form (creates a user object with firstLogin=true)
  document.getElementById('adminAddUserForm')?.addEventListener('submit', function(e){
    e.preventDefault();
    const name = $('#uName').value?.trim();
    const email = $('#uEmail').value?.trim();
    const pass = $('#uPass').value || '';
    const role = $('#uRole').value || 'user';
    if(!name || !email || !pass) return alert('Please fill all fields');
    // Basic validations
    if(pass.length < 7 || pass.length > 12) return alert('Password must be 7-12 characters');
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if(users.find(u=>u.email===email)) return alert('User with this email already exists');
    const newUser = { userid: name, name: name, email: email, password: pass, role: role, firstLogin: true, createdAt: Date.now() };
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    if(window.setAdminStatus) setAdminStatus('User added: ' + name);
    window.renderUserList();
    this.reset();
  });

  document.getElementById('adminAddUserReset')?.addEventListener('click', ()=>document.getElementById('adminAddUserForm')?.reset());

  // Product image file input: read file and set as data URL to pImg and preview
  const pImgFile = document.getElementById('pImgFile');
  pImgFile?.addEventListener('change', function(){
    const f = this.files && this.files[0];
    const preview = document.getElementById('pImgPreview');
    if(!f) { if(preview){ preview.src=''; preview.style.display='none'; } return; }
    if(!f.type.startsWith('image/')) return alert('Please select an image file');
    const reader = new FileReader();
    reader.onload = function(ev){
      const data = ev.target.result;
      $('#pImg').value = data; // store data URL in pImg field to persist
      if(preview){ preview.src = data; preview.style.display = 'block'; }
    };
    reader.readAsDataURL(f);
  });
}

//make dropdown dissappear
 const utilitiesDropdown = document.querySelector(".utils-details");

 if (utilitiesDropdown) {
  document.addEventListener("click", function (event) {
    const clickedOutside = !utilitiesDropdown.contains(event.target);

    if (clickedOutside) {
      utilitiesDropdown.open = false;
    }
  });
 }


(async function init(){
  await loadProducts();
  const handler = async ()=>{
    renderProductsGrid();
    renderAdminProductList();
    await window.renderUserList();
    attachAdminHandlers();

    // Use global section navigation (window.showSection)
    const start = location.hash.slice(1) || 'home';
    window.showSection(start);

    // Intercept internal anchor links and show section instead of scrolling
    document.querySelectorAll('a[href^="#"]').forEach(a=>{
      a.addEventListener('click', e=>{
        e.preventDefault();
        const id = a.getAttribute('href').slice(1);
        if(id) window.showSection(id);
        // reflect in URL without scrolling
        history.replaceState(null,'',`#${id}`);
      });
    });

    // show/hide admin panel based on currentUser (in case auth.js didn't run)
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (currentUser?.role === 'admin'){
      const panel = $('#adminPanel');
      panel?.classList.remove('hidden');
      panel?.classList.add('is-open');
      document.body.classList.add('no-scroll');
      panel?.setAttribute('aria-hidden', 'false');
    }

    // Admin tab switching
    document.querySelectorAll('.admin-tab').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('.admin-tab').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-tab');
        if(tab === 'products'){
          $('#adminTabProducts')?.classList.remove('hidden');
          $('#adminTabUsers')?.classList.add('hidden');
        } else {
          $('#adminTabProducts')?.classList.add('hidden');
          $('#adminTabUsers')?.classList.remove('hidden');
        }
      });
    });

    // Close admin button
    document.getElementById('adminCloseBtn')?.addEventListener('click', ()=>{
      window.showSection('home');
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ()=>handler());
  else handler();
})();
