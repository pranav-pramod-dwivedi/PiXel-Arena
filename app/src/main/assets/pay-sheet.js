/* ============================================================
   PaySheet — reusable payment flow (amount -> PIN -> receipt)
   Requires app.js loaded first (window.NovaPay).
   Usage:  PaySheet.open({ name, handle, img, note })
           PaySheet.request({ name, handle, img })   // receive/request money
   ============================================================ */
(function () {
  'use strict';
  if (!window.NovaPay) { console.warn('PaySheet: app.js must load before pay-sheet.js'); }

  // ---- one-time style + DOM injection ----
  const style = document.createElement('style');
  style.textContent = `
    .ps-overlay{position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(6px);z-index:9999;display:none;align-items:flex-end;justify-content:center}
    .ps-overlay.open{display:flex}
    .ps-sheet{width:100%;max-width:448px;background:#fff;border-radius:28px 28px 0 0;padding:24px 22px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.2);transform:translateY(100%);transition:transform .32s cubic-bezier(.16,1,.3,1);font-family:'Plus Jakarta Sans','Outfit',sans-serif;max-height:92vh;overflow-y:auto}
    .ps-overlay.open .ps-sheet{transform:translateY(0)}
    .ps-grab{width:40px;height:5px;border-radius:99px;background:#e2e8f0;margin:0 auto 18px}
    .ps-who{display:flex;align-items:center;gap:12px;margin-bottom:20px}
    .ps-av{width:48px;height:48px;border-radius:50%;object-fit:cover;background:#eef2ff}
    .ps-name{font-weight:800;color:#0f172a;font-size:16px;line-height:1.1}
    .ps-handle{font-size:12px;color:#94a3b8;font-weight:600}
    .ps-amount{text-align:center;font-weight:800;color:#0f172a;font-size:44px;letter-spacing:-1px;margin:8px 0 4px;min-height:52px}
    .ps-amount .cur{color:#94a3b8;font-size:28px;vertical-align:top;margin-right:2px}
    .ps-avail{text-align:center;font-size:12px;color:#94a3b8;font-weight:600;margin-bottom:14px}
    .ps-note-in{width:100%;text-align:center;border:none;outline:none;font-size:13px;color:#475569;font-weight:600;background:#f8fafc;border-radius:12px;padding:10px;margin-bottom:16px}
    .ps-err{color:#ef4444;text-align:center;font-size:12px;font-weight:700;min-height:16px;margin-bottom:6px}
    .ps-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
    .ps-key{background:#f1f5f9;border:none;border-radius:16px;padding:16px 0;font-size:22px;font-weight:700;color:#0f172a;transition:transform .1s,background .15s}
    .ps-key:active{transform:scale(.94);background:#e2e8f0}
    .ps-cta{width:100%;background:#0052FF;color:#fff;font-weight:800;font-size:16px;padding:16px;border:none;border-radius:18px;margin-top:16px;box-shadow:0 10px 24px rgba(0,82,255,.28);transition:transform .1s,opacity .2s}
    .ps-cta:active{transform:scale(.98)}
    .ps-cta.gray{background:#0f172a;box-shadow:none}
    .ps-cta:disabled{opacity:.45}
    .ps-dots{display:flex;justify-content:center;gap:14px;margin:18px 0 22px}
    .ps-dot{width:16px;height:16px;border-radius:50%;background:#e2e8f0;transition:background .15s,transform .15s}
    .ps-dot.on{background:#0052FF;transform:scale(1.1)}
    .ps-title{text-align:center;font-weight:800;font-size:18px;color:#0f172a;margin-bottom:4px}
    .ps-sub{text-align:center;font-size:13px;color:#64748b;margin-bottom:8px}
    .ps-check{width:78px;height:78px;border-radius:50%;background:#dcfce7;color:#16a34a;display:flex;align-items:center;justify-content:center;font-size:34px;margin:6px auto 14px;animation:pspop .4s cubic-bezier(.16,1.3,.3,1)}
    @keyframes pspop{0%{transform:scale(.4);opacity:0}100%{transform:scale(1);opacity:1}}
    .ps-receipt{background:#f8fafc;border-radius:16px;padding:14px 16px;margin:14px 0}
    .ps-rrow{display:flex;justify-content:space-between;font-size:13px;padding:6px 0}
    .ps-rrow .k{color:#94a3b8;font-weight:600}
    .ps-rrow .v{color:#0f172a;font-weight:700}
    .ps-link{display:block;text-align:center;color:#64748b;font-weight:700;font-size:13px;margin-top:12px;text-decoration:none}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'ps-overlay';
  overlay.innerHTML = `<div class="ps-sheet" id="ps-sheet"></div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);
  const sheet = overlay.querySelector('#ps-sheet');

  let ctx = null;      // {name, handle, img, note}
  let amountStr = '0';
  let pin = '';
  let mode = 'pay';    // 'pay' | 'request'

  function open(target) { mode = 'pay'; start(target); }
  function request(target) { mode = 'request'; start(target); }

  function start(target) {
    ctx = Object.assign({ name: 'Recipient', handle: '', img: '', note: '' }, target || {});
    amountStr = '0'; pin = '';
    overlay.classList.add('open');
    renderAmount();
  }
  function close() { overlay.classList.remove('open'); }

  function avatar() { return NovaPay.avatarFor(ctx.img ? ctx : ctx.name); }
  function amountCents() { return NovaPay.parseCents(amountStr); }
  function amountDisplay() {
    const n = parseFloat(amountStr) || 0;
    return n.toLocaleString('en-US', { minimumFractionDigits: amountStr.includes('.') ? (amountStr.split('.')[1]||'').length : 0, maximumFractionDigits: 2 });
  }

  // ---------- STEP 1: amount ----------
  function renderAmount() {
    const avail = NovaPay.fmt(NovaPay.balanceCents);
    const verb = mode === 'request' ? 'Request from' : 'Pay';
    sheet.innerHTML = `
      <div class="ps-grab"></div>
      <div class="ps-who">
        <img class="ps-av" src="${avatar()}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(ctx.name)}'">
        <div><div class="ps-name">${verb} ${ctx.name}</div><div class="ps-handle">${ctx.handle||''}</div></div>
      </div>
      <div class="ps-amount"><span class="cur">$</span><span id="ps-amt">${amountDisplay()}</span></div>
      <div class="ps-avail">${mode==='request'?'They will get a request':'Available balance '+avail}</div>
      <input class="ps-note-in" id="ps-note" placeholder="Add a note (optional)" value="${ctx.note||''}">
      <div class="ps-err" id="ps-err"></div>
      <div class="ps-pad">
        ${[1,2,3,4,5,6,7,8,9].map(n=>`<button class="ps-key" data-k="${n}">${n}</button>`).join('')}
        <button class="ps-key" data-k=".">.</button>
        <button class="ps-key" data-k="0">0</button>
        <button class="ps-key" data-k="del"><i class="fa-solid fa-delete-left"></i></button>
      </div>
      <button class="ps-cta" id="ps-next">${mode==='request'?'Send Request':'Continue'}</button>
      <a class="ps-link" id="ps-cancel">Cancel</a>
    `;
    sheet.querySelectorAll('.ps-key').forEach(b => b.onclick = () => key(b.dataset.k));
    sheet.querySelector('#ps-next').onclick = next;
    sheet.querySelector('#ps-cancel').onclick = close;
    sheet.querySelector('#ps-note').oninput = e => ctx.note = e.target.value;
  }

  function key(k) {
    if (k === 'del') amountStr = amountStr.length > 1 ? amountStr.slice(0, -1) : '0';
    else if (k === '.') { if (!amountStr.includes('.')) amountStr += '.'; }
    else {
      if (amountStr === '0') amountStr = k;
      else if (amountStr.includes('.') && amountStr.split('.')[1].length >= 2) return;
      else amountStr += k;
    }
    document.getElementById('ps-amt').textContent = amountDisplay();
  }

  function next() {
    const c = amountCents();
    const err = document.getElementById('ps-err');
    if (c <= 0) { err.textContent = 'Enter an amount'; return; }
    if (mode === 'pay') {
      if (NovaPay.state.card.frozen) { err.textContent = 'Card is frozen — unfreeze in Cards'; return; }
      if (c > NovaPay.balanceCents) { err.textContent = 'Insufficient balance'; return; }
      pin = ''; renderPin();
    } else {
      // request: just log a notification + fake pending, no balance change
      NovaPay.notify('Request sent', `You requested ${NovaPay.fmt(c)} from ${ctx.name}`, 'fa-hand-holding-dollar');
      renderSuccess(c, null, true);
    }
  }

  // ---------- STEP 2: PIN ----------
  function renderPin() {
    sheet.innerHTML = `
      <div class="ps-grab"></div>
      <div class="ps-title">Enter PIN</div>
      <div class="ps-sub">Authorize ${NovaPay.fmt(amountCents())} to ${ctx.name}</div>
      <div class="ps-dots">${[0,1,2,3].map(i=>`<div class="ps-dot" data-d="${i}"></div>`).join('')}</div>
      <div class="ps-err" id="ps-err"></div>
      <div class="ps-pad">
        ${[1,2,3,4,5,6,7,8,9].map(n=>`<button class="ps-key" data-k="${n}">${n}</button>`).join('')}
        <button class="ps-key" data-k="back"><i class="fa-solid fa-arrow-left"></i></button>
        <button class="ps-key" data-k="0">0</button>
        <button class="ps-key" data-k="del"><i class="fa-solid fa-delete-left"></i></button>
      </div>
      <a class="ps-link" id="ps-cancel">Cancel</a>
    `;
    sheet.querySelectorAll('.ps-key').forEach(b => b.onclick = () => pinKey(b.dataset.k));
    sheet.querySelector('#ps-cancel').onclick = close;
    paintDots();
  }
  function paintDots() {
    sheet.querySelectorAll('.ps-dot').forEach((d, i) => d.classList.toggle('on', i < pin.length));
  }
  function pinKey(k) {
    const err = document.getElementById('ps-err');
    if (k === 'back') { renderAmount(); return; }
    if (k === 'del') { pin = pin.slice(0, -1); paintDots(); return; }
    if (pin.length >= 4) return;
    pin += k; paintDots();
    if (pin.length === 4) {
      setTimeout(() => {
        if (!NovaPay.checkPayPin(pin)) {
          err.textContent = 'Wrong PIN. Try again.';
          pin = ''; paintDots();
          if (navigator.vibrate) navigator.vibrate(120);
        } else {
          doPay();
        }
      }, 140);
    }
  }

  function doPay() {
    const c = amountCents();
    const res = NovaPay.pay({ name: ctx.name, note: ctx.note || 'Sent', amountCents: c, icon: 'fa-paper-plane', color: 'blue' });
    if (!res.ok) { renderPin(); document.getElementById('ps-err').textContent = res.error; return; }
    // remember contact for quick pay
    if (ctx.name) NovaPay.upsertContact({ id: ctx.id, name: ctx.name, handle: ctx.handle, img: ctx.img && ctx.img.startsWith('data:') ? ctx.img : (ctx.img||'') });
    renderSuccess(c, res.tx);
    fireConfetti();
  }

  function fireConfetti() {
    if (window.confetti) confetti({ particleCount: 90, spread: 65, origin: { y: 0.7 }, colors: ['#0052FF','#22c55e','#60a5fa'] });
  }

  // ---------- STEP 3: receipt ----------
  function renderSuccess(c, tx, isRequest) {
    const when = new Date(tx ? tx.ts : Date.now()).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const ref = (tx ? tx.id : 'REQ_' + c).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-10);
    sheet.innerHTML = `
      <div class="ps-grab"></div>
      <div class="ps-check"><i class="fa-solid fa-${isRequest?'paper-plane':'check'}"></i></div>
      <div class="ps-title">${isRequest?'Request Sent':'Payment Successful'}</div>
      <div class="ps-sub">${isRequest?'We notified '+ctx.name : NovaPay.fmt(c)+' sent to '+ctx.name}</div>
      <div class="ps-receipt">
        <div class="ps-rrow"><span class="k">${isRequest?'Requested':'Amount'}</span><span class="v">${NovaPay.fmt(c)}</span></div>
        <div class="ps-rrow"><span class="k">To</span><span class="v">${ctx.name}</span></div>
        ${ctx.note?`<div class="ps-rrow"><span class="k">Note</span><span class="v">${ctx.note}</span></div>`:''}
        <div class="ps-rrow"><span class="k">Date</span><span class="v">${when}</span></div>
        <div class="ps-rrow"><span class="k">Ref</span><span class="v">#${ref}</span></div>
        ${!isRequest?`<div class="ps-rrow"><span class="k">New balance</span><span class="v">${NovaPay.fmt(NovaPay.balanceCents)}</span></div>`:''}
      </div>
      <button class="ps-cta gray" id="ps-done">Done</button>
      <a class="ps-link" href="transactions.html">View in history</a>
    `;
    sheet.querySelector('#ps-done').onclick = () => { close(); };
  }

  window.PaySheet = { open, request, close };
})();
