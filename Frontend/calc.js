//for pop up window

const openBtn = document.getElementById("openCalcBtn");
const modal = document.getElementById("calcModal");
const closeBtn = document.getElementById("closeCalcBtn");

if (openBtn && modal) openBtn.onclick = () => modal.classList.remove("hidden");
if (closeBtn && modal) closeBtn.onclick = () => modal.classList.add("hidden");

if (modal) modal.onclick = e => {
  if (e.target === modal) modal.classList.add("hidden");
};



// Calculator 
document.addEventListener('DOMContentLoaded', function () {
  const display = document.getElementById('calcDisplay');
  if (!display) return;

  let expr = '';

  function update() {
    display.textContent = expr || '0';
  }

  function isOperator(ch) {
    return ch === '+' || ch === '-' || ch === '*' || ch === '/';
  }

  // Add a character to the expression
  function appendChar(ch) {
    const last = expr.charAt(expr.length - 1);

    // Don't start with an operator (except minus for negative numbers)
    if (isOperator(ch) && expr === '' && ch !== '-') return;

    // If last character is an operator, don't add another operator
    if (isOperator(ch) && isOperator(last)) return;

    // Simple append for everything else (numbers, ., %, operators)
    expr = expr + ch;
    update();
  }

  function clearAll() {
    expr = '';
    update();
  }

  function backspace() {
    // remove last character (use substring for clarity)
    expr = expr.substring(0, Math.max(0, expr.length - 1));
    update();
  }

  // Evaluate expression safely (basic check + replace % -> /100)
  function evaluateExpr() {
    if (!expr) return;
    if (!/^[0-9+\-*/().%\s]+$/.test(expr)) { display.textContent = 'Error'; expr = ''; return; }
    try {
      const safe = expr.replace(/%/g, '/100');
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict";return (' + safe + ')')();
      expr = String(result);
      update();
    } catch (err) {
      display.textContent = 'Error';
      expr = '';
    }
  }

  // Buttons
  document.querySelectorAll('.btn-calc').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const action = btn.getAttribute('data-action');
      const value = btn.getAttribute('data-value');
      if (action === 'clear') return clearAll();
      if (action === 'back') return backspace();
      if (action === 'percent') return appendChar('%');
      if (action === 'equals') return evaluateExpr();
      if (value) return appendChar(value);
    });
  });

  // Keyboard support (numbers, operators, ., %, Enter, Backspace, Escape)
  document.addEventListener('keydown', function (e) {
    const k = e.key;
    if (k === 'Enter') { e.preventDefault(); return evaluateExpr(); }
    if (k === 'Backspace') return backspace();
    if (k === 'Escape') return clearAll();
    if (/^[0-9]$/.test(k)) return appendChar(k);
    if (['+', '-', '*', '/'].includes(k)) return appendChar(k);
    if (k === '.') return appendChar('.');
    if (k === '%') return appendChar('%');
  });

  update();
});