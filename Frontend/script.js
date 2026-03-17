const $ = s => document.querySelector(s);

let products = [];
let currentUser = null;
let searchQuery = '';

async function apiFetch(path, options = {}){
  // point to local backend
  const base = '';

  if(!options.headers) options.headers = {};
  if(options.body && !(options.body instanceof FormData)){
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(base + '/api' + path, { ...options, credentials: 'same-origin' });
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

async function loadMe(){
  try{
    const data = await apiFetch('/auth/me');
    currentUser = data.user || null;
  }catch(e){
    currentUser = null;
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
    const search = document.getElementById('search');
    if (search && currentUser && (search.value === currentUser.email || search.value === currentUser.userid)) {
      search.value = '';
      searchQuery = '';
    }
    const inner = productsSection?.querySelector('.section-inner');
    if(inner) inner.scrollTop = 0;
  } else {
    productsSection?.classList.remove('scrollable');
  }

  // Admin access: redirect to admin.html for admins
  if(id === 'admin'){
    if(!currentUser || currentUser.role !== 'admin'){
      alert('Access denied: Admins only');
      // fallback to home
      window.showSection('home');
      return;
    }
    // Redirect to admin.html
    window.location.href = 'admin.html';
    return;
  }

  // update active nav link
  document.querySelectorAll('.nav a').forEach(a=>{
    a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
  });
};

function renderProductsGrid(){
  const q = (searchQuery || '').trim().toLowerCase();
  const visible = q
    ? products.filter(p => String(p.name || '').toLowerCase().includes(q) || String(p.cat || '').toLowerCase().includes(q))
    : products;

  const grid = $('#productGrid');
  grid.innerHTML = '';
  visible.forEach(p=>{
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
      ${ (currentUser?.role === 'admin') ? `<div class="product-actions"><button class="btn small" data-action="edit" data-id="${p.id}">Edit</button> <button class="btn small ghost" data-action="remove" data-id="${p.id}">Remove</button></div>` : ''}
    `;
    grid.appendChild(c);
  });
}

function wireSearch(){
  const search = document.getElementById('search');
  if (!search) return;
  // prevent autofill showing user id/email in the products search box
  search.value = '';
  searchQuery = '';

  search.addEventListener('input', () => {
    searchQuery = search.value || '';
    renderProductsGrid();
  });

  search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      search.value = '';
      searchQuery = '';
      renderProductsGrid();
    }
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
  await Promise.all([loadProducts(), loadMe()]);
  const handler = async ()=>{
    wireSearch();
    renderProductsGrid();

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

    // Admin UI lives in admin.html; index.html just redirects on #admin
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ()=>handler());
  else handler();
})();
