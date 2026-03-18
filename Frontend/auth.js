
// HTTP helpers
// -----------------------------------------------------------------------------
async function apiFetch(path, options = {}) {
  const base = 'https://rental-project-6tni.onrender.com';
  if (!options.headers) options.headers = {};
  if (options.body && !(options.body instanceof FormData)) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const res = await fetch(base + '/api' + path, { ...options, credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

async function loginApi(email, password) {
  return apiFetch('/auth/login', { method: 'POST', body: { email, password } });
}
async function registerApi(userObj) {
  return apiFetch('/auth/register', { method: 'POST', body: userObj });
}

async function meApi() {
  const data = await apiFetch('/auth/me');
  return data.user || null;
}

async function logoutApi() {
  return apiFetch('/auth/logout', { method: 'POST' });
}

// -----------------------------------------------------------------------------
// UI helpers
// -----------------------------------------------------------------------------
async function updateHeaderUI() {
  let current = null;
  try {
    current = await meApi();
  } catch (e) {
    current = null;
  }
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminNav = document.getElementById('adminNav');

  if (!loginBtn || !signupBtn || !logoutBtn) return;

  if (current) {
    loginBtn.classList.add('hidden');
    signupBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    logoutBtn.textContent = current.name ? ('Logout (' + current.name + ')') : 'Logout';
    if (adminNav) {
      if (current.role === 'admin') adminNav.classList.remove('hidden');
      else adminNav.classList.add('hidden');
    }
  } else {
    loginBtn.classList.remove('hidden');
    signupBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    logoutBtn.textContent = 'Logout';
    if (adminNav) adminNav.classList.add('hidden');
  }
}

function injectAdminNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  if (document.getElementById('adminNav')) return;
  const a = document.createElement('a');
  a.id = 'adminNav';
  a.className = 'nav-link';
  a.href = '#admin';
  a.textContent = 'Admin';
  a.addEventListener('click', function (e) { e.preventDefault(); window.showSection('admin'); });
  const dropdown = nav.querySelector('.nav-item.dropdown');
  if (dropdown) nav.insertBefore(a, dropdown);
  else nav.appendChild(a);
}

// -----------------------------------------------------------------------------
// Initialization and event wiring
// -----------------------------------------------------------------------------
async function initAuth() {
  await updateHeaderUI();
  try {
    const cur = await meApi();
    if (cur && cur.role === 'admin') injectAdminNav();
  } catch (e) {}

  const loginForm = document.querySelector('#loginForm');
  const loginStatus = document.getElementById('loginStatus');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.querySelector('#loginEmail').value.trim();
      const pass = document.querySelector('#loginPassword').value;
      try {
        const resp = await loginApi(email, pass);
        const curUser = resp.user || null;
        if (curUser && curUser.role === 'admin') injectAdminNav();
        if (loginStatus) loginStatus.textContent = 'Login success';
        alert('Login success');
        location.href = 'index.html';
      } catch (err) {
        console.error('login error', err);
        const msg = err.error || 'Invalid credentials';
        if (loginStatus) loginStatus.textContent = msg;
        else alert(msg);
      }
    });
  }

  document.querySelector('#logoutBtn')?.addEventListener('click', async () => {
    try { await logoutApi(); } catch (e) {}
    const adm = document.getElementById('adminNav'); if (adm) adm.remove();
    alert('Logged out'); await updateHeaderUI(); location.reload();
  });

  // forgot-password logic unchanged
  (function () {
    const forgotLink = document.getElementById('forgotLink');
    const forgotBox = document.getElementById('forgotBox');
    const forgotForm = document.getElementById('forgotForm');
    const forgotSend = document.getElementById('forgotSend');
    const forgotEmail = document.getElementById('forgotEmail');
    const forgotStatus = document.getElementById('forgotStatus');
    const backBtn = document.getElementById('backToLogin');

    if (!forgotLink || !forgotBox) return;

    function showForgot() {
      forgotBox.classList.remove('hidden');
      forgotBox.setAttribute('aria-hidden', 'false');
      forgotEmail?.focus();
    }

    function hideForgot() {
      forgotBox.classList.add('hidden');
      forgotBox.setAttribute('aria-hidden', 'true');
      if (forgotStatus) forgotStatus.textContent = '';
    }

    forgotLink.addEventListener('click', function (e) {
      e.preventDefault();
      showForgot();
    });

    backBtn.addEventListener('click', function () {
      hideForgot();
    });

    forgotSend?.addEventListener('click', function (e) {
      const email = forgotEmail.value.trim();
      if (!email) { if (forgotStatus) forgotStatus.textContent = 'Enter email'; return; }
      if (forgotStatus) forgotStatus.textContent = 'If an account exists for that email, a reset link has been sent.';
      forgotSend.setAttribute('disabled', 'true');
    });
  })();

  // first-login password change logic unchanged (frontend-only fallback)
  (function(){
    const modal = document.getElementById('firstLoginModal');
    const closeBtn = document.getElementById('firstLoginClose');
    const cancelBtn = document.getElementById('firstPassCancel');
    const saveBtn = document.getElementById('firstPassSave');
    const newPass = document.getElementById('firstNewPass');
    const newPassConfirm = document.getElementById('firstNewPassConfirm');
    const errEl = document.getElementById('firstPassError');

    function showModal(){
      if(!modal) return;
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden','false');
      newPass?.focus();
    }
    function hideModal(){
      if(!modal) return;
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden','true');
      if(errEl) errEl.textContent = '';
      if(newPass) newPass.value='';
      if(newPassConfirm) newPassConfirm.value='';
    }

    (async function(){
      try{
        const cur = await meApi();
        if(cur && cur.firstLogin){
          if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showModal);
          else showModal();
        }
      }catch(e){}
    })();

    closeBtn?.addEventListener('click', async function(){
      try { await logoutApi(); } catch (e) {}
      hideModal();
      await updateHeaderUI();
      location.href = 'login.html';
    });
    cancelBtn?.addEventListener('click', async function(){
      try { await logoutApi(); } catch (e) {}
      hideModal();
      await updateHeaderUI();
      location.href='login.html';
    });

    saveBtn?.addEventListener('click', async function(){
      const p = newPass?.value || '';
      const q = newPassConfirm?.value || '';
      if(p.length < 7 || p.length > 12){ if(errEl) errEl.textContent='Password must be 7-12 characters'; return; }
      if(p !== q){ if(errEl) errEl.textContent='Passwords do not match'; return; }
      try{
        await apiFetch('/auth/change-password', { method: 'POST', body: { newPassword: p } });
        if(window.setAdminStatus) setAdminStatus('Password updated');
        hideModal();
        alert('Password updated. Welcome!');
        location.href = 'index.html';
      }catch(err){
        console.error('change password failed', err);
        if(errEl) errEl.textContent = err.error || 'Failed to update password';
      }
    });
  })();
}

// Run init immediately if ready, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAuth);
else initAuth();

