/* ============================================================
   NovaPay — shared client state layer (localStorage-backed)
   Load on every page:  <script src="app.js"></script>
   All money stored in CENTS (integer) to avoid float drift.
   ============================================================ */
(function () {
  'use strict';

  const KEY = 'novapay_state_v1';
  const ADMIN_PIN = '9999';     // dev/admin panel PIN (4 digits, see admin.html)
  const PAY_PIN   = '9999';     // payment authorization PIN

  // ---------- gift seed ----------
  // Ages in days, newest first. Timestamps derive from these at load time.
  // Span is deliberate: the history starts a year back, so the newest gift reads
  // "1y ago" and the oldest ~1y7mo. Predates the Dec-2025 photos by design.
  const DIVYANSHI_IMG = 'IMG_20251221_172718.jpg';
  const MIKE_IMG      = 'imgs/Screenshot_2025-12-23-11-56-49-824_com.miui.mediaviewer.jpg';
  const RAJ_IMG       = 'IMG_20251223_010626.jpg';

  const GIFT_SEED = [
    { id: 'g1',  from: 'Divyanshi', img: DIVYANSHI_IMG, note: 'Candlelit Dinner 🕯️', ageDays: 367   },
    { id: 'g2',  from: 'Mike',      img: MIKE_IMG,      note: 'Amazon Card 🎁',      ageDays: 369   },
    { id: 'g3',  from: 'Divyanshi', img: DIVYANSHI_IMG, note: 'Movie Night 🎟️',      ageDays: 372   },
    { id: 'g4',  from: 'Raj',       img: RAJ_IMG,       note: 'Lunch 🥗',            ageDays: 375  },
    { id: 'g5',  from: 'Divyanshi', img: DIVYANSHI_IMG, note: 'Red Roses 🌹',        ageDays: 378  },
    { id: 'g6',  from: 'Sarah',     img: '',            note: 'Uber Credit 🚗',      ageDays: 382  },
    { id: 'g7',  from: 'Divyanshi', img: DIVYANSHI_IMG, note: 'Coffee Date ☕',       ageDays: 386  },
    { id: 'g8',  from: 'Mike',      img: MIKE_IMG,      note: 'Lunch 🥗',            ageDays: 390  },
    { id: 'g9',  from: 'Divyanshi', img: DIVYANSHI_IMG, note: 'Candlelit Dinner 🕯️', ageDays: 394  },
    { id: 'g10', from: 'Raj',       img: RAJ_IMG,       note: 'Amazon Card 🎁',      ageDays: 399  },
    { id: 'g11', from: 'Divyanshi', img: DIVYANSHI_IMG, note: 'Movie Night 🎟️',      ageDays: 404  },
    { id: 'g12', from: 'Sarah',     img: '',            note: 'Coffee Date ☕',       ageDays: 409  },
    { id: 'g13', from: 'Divyanshi', img: DIVYANSHI_IMG, note: 'Red Roses 🌹',        ageDays: 415  },
    { id: 'g14', from: 'Mike',      img: MIKE_IMG,      note: 'Uber Credit 🚗',      ageDays: 421  },
    { id: 'g15', from: 'Divyanshi', img: DIVYANSHI_IMG, note: 'Coffee Date ☕',       ageDays: 427  },
    { id: 'g16', from: 'Raj',       img: RAJ_IMG,       note: 'Lunch 🥗',            ageDays: 433  },
    { id: 'g17', from: 'Divyanshi', img: DIVYANSHI_IMG, note: 'Candlelit Dinner 🕯️', ageDays: 440  },
    { id: 'g18', from: 'Sarah',     img: '',            note: 'Amazon Card 🎁',      ageDays: 447  },
    { id: 'g19', from: 'Divyanshi', img: DIVYANSHI_IMG, note: 'Movie Night 🎟️',      ageDays: 454  },
    { id: 'g20', from: 'Mike',      img: MIKE_IMG,      note: 'Coffee Date ☕',       ageDays: 461  },
    { id: 'g21', from: 'Divyanshi', img: DIVYANSHI_IMG, note: 'Red Roses 🌹',        ageDays: 469 },
    { id: 'g22', from: 'Raj',       img: RAJ_IMG,       note: 'Uber Credit 🚗',      ageDays: 477 },
    { id: 'g23', from: 'Divyanshi', img: DIVYANSHI_IMG, note: 'Coffee Date ☕',       ageDays: 485 },
    { id: 'g24', from: 'Sarah',     img: '',            note: 'Lunch 🥗',            ageDays: 493 },
    { id: 'g25', from: 'Divyanshi', img: DIVYANSHI_IMG, note: 'Candlelit Dinner 🕯️', ageDays: 502 },
    { id: 'g26', from: 'Mike',      img: MIKE_IMG,      note: 'Amazon Card 🎁',      ageDays: 511 },
    { id: 'g27', from: 'Divyanshi', img: DIVYANSHI_IMG, note: 'Movie Night 🎟️',      ageDays: 520 },
    { id: 'g28', from: 'Raj',       img: RAJ_IMG,       note: 'Lunch 🥗',            ageDays: 529 },
    { id: 'g29', from: 'Divyanshi', img: DIVYANSHI_IMG, note: 'Red Roses 🌹',        ageDays: 539 },
    { id: 'g30', from: 'Sarah',     img: '',            note: 'Uber Credit 🚗',      ageDays: 549 },
    { id: 'g31', from: 'Divyanshi', img: DIVYANSHI_IMG, note: 'Coffee Date ☕',       ageDays: 559 },
    { id: 'g32', from: 'Mike',      img: MIKE_IMG,      note: 'Lunch 🥗',            ageDays: 570 },
  ];

  // Re-derive gift timestamps from today. Runs on every load so ages never drift,
  // and repairs saved state seeded by an older build (fixed ts, no ageDays).
  function hydrateGifts(gifts) {
    if (!gifts || !gifts.length) return GIFT_SEED.map(g => ({ ...g, ts: daysAgo(g.ageDays) }));
    return gifts.map(g => {
      if (g.ageDays == null) {
        const seeded = GIFT_SEED.find(s => s.id === g.id);
        if (!seeded) return g;                       // user-generated gift: leave its ts alone
        return { ...g, ageDays: seeded.ageDays, ts: daysAgo(seeded.ageDays) };
      }
      return { ...g, ts: daysAgo(g.ageDays) };
    });
  }

  // ---------- seed ----------
  function seed() {
    return {
      version: 1,
      schemaVersion: 4,
      profile: {
        name: 'Pranav D.',
        handle: 'pranav_d_18',
        avatar: '',          // base64 data-uri; '' => fallback image
        cardBg: '',          // base64 data-uri for card background
        rank: 7807,
        circle: 12,
      },
      // legacy single-card mirror (kept in sync with cards[activeCard])
      card: {
        last4: '8144',
        holder: 'PRANAV D.',
        frozen: false,
      },
      activeCard: 'visa',
      cards: [
        // cvv: Visa/MC print 3 digits in the back signature strip; Amex prints a
        // 4-digit CID on the FRONT, above the card number.
        { id: 'visa', network: 'visa', name: 'Visa Infinite',  last4: '8144', holder: 'PRANAV D.', exp: '08/28', cvv: '772',  frozen: false, limitCents: 5000000, spentCents: 30000 },
        { id: 'amex', network: 'amex', name: 'Amex Platinum',   last4: '1007', holder: 'PRANAV D.', exp: '11/27', cvv: '4051', frozen: false, limitCents: 10000000, spentCents: 145000 },
      ],
      rewards: {
        pointsBalance: 24680,
        cashbackCents: 4215,     // $42.15 accrued cashback
        tier: 'Platinum',
      },
      // scheduled / recurring payments
      scheduled: [
        { id: 'sc_1', name: 'Spotify Premium', amountCents: 1099, cadence: 'monthly', nextTs: daysFromNow(3),  icon: 'fa-music',  color: 'green',  autopay: true },
        { id: 'sc_2', name: 'Rent',            amountCents: 185000, cadence: 'monthly', nextTs: daysFromNow(9), icon: 'fa-house',  color: 'blue',   autopay: true },
        { id: 'sc_3', name: 'Gym',             amountCents: 4999, cadence: 'monthly', nextTs: daysFromNow(14), icon: 'fa-dumbbell', color: 'orange', autopay: false },
      ],
      settings: {
        theme: 'light',      // 'auto' | 'light' | 'dark' (light is default)
        hideBalance: false,
        notifications: true,
      },
      balanceCents: 42948793,   // $429,487.93
      contacts: [
        { id: 'mike',      name: 'Mike',      handle: '@mike_w',    img: 'imgs/Screenshot_2025-12-23-11-56-49-824_com.miui.mediaviewer.jpg' },
        { id: 'divyanshi', name: 'Divyanshi', handle: '@diivii',    img: 'IMG_20251221_172718.jpg' },
        { id: 'raj',       name: 'Raj',       handle: '@raj_p',     img: 'IMG_20251223_010626.jpg' },
        { id: 'sarah',     name: 'Sarah',     handle: '@sarah_k',   img: '' },
      ],
      // Gifts friends sent you — an experience/treat, never a money value.
      // `ageDays` (not `ts`) is what's stored: gift timestamps are re-derived from
      // Date.now() on every load, so "2d ago" stays 2d ago however long the saved
      // state sits in localStorage. See hydrateGifts().
      gifts: GIFT_SEED.map(g => ({ ...g, ts: daysAgo(g.ageDays) })),
      // transactions: newest first. amountCents signed (+in / -out). ts = epoch ms.
      transactions: [
        { id: 'tx_seed_1', name: 'Mike',        note: 'Wire Transfer',  amountCents:  2850000, ts: daysAgo(1),  category: 'income',  mcc: 'Income',        icon: 'fa-arrow-down',  color: 'green'  },
        { id: 'tx_seed_2', name: 'Divyanshi',   note: 'Sent',           amountCents: -120000,  ts: daysAgo(2),  category: 'expense', mcc: 'Transfers',     icon: 'fa-user',        color: 'slate'  },
        { id: 'tx_seed_3', name: 'user-93216',  note: 'Visa Direct',    amountCents:  6969,    ts: daysAgo(3),  category: 'income',  mcc: 'Income',        icon: 'fa-qrcode',      color: 'purple' },
        { id: 'tx_seed_4', name: 'Netflix UHD', note: 'Subscription',   amountCents: -1549,    ts: daysAgo(4),  category: 'expense', mcc: 'Entertainment', icon: 'fa-n',           color: 'red'    },
        { id: 'tx_seed_5', name: 'Starbucks',   note: 'Card • 8144',    amountCents: -715,     ts: daysAgo(6),  category: 'expense', mcc: 'Food & Drink',  icon: 'fa-mug-hot',     color: 'green'  },
        { id: 'tx_seed_6', name: 'Raj',         note: 'Split Bill',     amountCents: -450000,  ts: daysAgo(9),  category: 'expense', mcc: 'Transfers',     icon: 'fa-user',        color: 'slate'  },
        { id: 'tx_seed_7', name: 'Uber',        note: 'Ride',           amountCents: -2340,    ts: daysAgo(5),  category: 'expense', mcc: 'Transport',     icon: 'fa-car',         color: 'slate'  },
        { id: 'tx_seed_8', name: 'Whole Foods', note: 'Groceries',      amountCents: -8790,    ts: daysAgo(7),  category: 'expense', mcc: 'Groceries',     icon: 'fa-basket-shopping', color: 'green' },
        { id: 'tx_seed_9', name: 'Amazon',      note: 'Shopping',       amountCents: -12999,   ts: daysAgo(8),  category: 'expense', mcc: 'Shopping',      icon: 'fa-bag-shopping', color: 'orange' },
      ],
      tournaments: [
        { id: 'tour_1', name: 'Friday Face-Off',  entryFeeCents: 2500,  date: 'Jul 18', time: '7:00 PM',  prize: '$5,000' },
        { id: 'tour_2', name: 'Weekend Warriors',  entryFeeCents: 5000,  date: 'Jul 20', time: '2:00 PM',  prize: '$12,000' },
        { id: 'tour_3', name: 'Midweek Mayhem',    entryFeeCents: 1000,  date: 'Jul 16', time: '8:30 PM',  prize: '$2,000' },
        { id: 'tour_4', name: 'Squad Showdown',    entryFeeCents: 7500,  date: 'Jul 12', time: '6:00 PM',  prize: '$20,000' },
        { id: 'tour_5', name: 'Neon Nights Cup',   entryFeeCents: 2000,  date: 'Jul 22', time: '9:00 PM',  prize: '$4,000' },
        { id: 'tour_6', name: 'Pro Series #42',    entryFeeCents: 10000, date: 'Jul 25', time: '5:00 PM',  prize: '$25,000' },
      ],
      notifications: [
        { id: 'n_1',  title: 'Tournament won!',       body: 'You placed 1st in Friday Face-Off · +250 pts',         ts: daysAgo(1),    read: false, icon: 'fa-trophy' },
        { id: 'n_2',  title: 'Cashback earned',         body: 'You earned $12.40 cashback on Whole Foods',          ts: daysAgo(2),    read: false, icon: 'fa-gift' },
        { id: 'n_3',  title: 'Netflix UHD',             body: 'Subscription of $15.49 was auto-paid',               ts: daysAgo(4),    read: true,  icon: 'fa-n' },
        { id: 'n_4',  title: 'New login detected',      body: 'iPhone 15 Pro · Mumbai, IN · was this you?',         ts: daysAgo(6),    read: true,  icon: 'fa-mobile-screen' },
        { id: 'n_5',  title: 'Card limit updated',      body: 'Your Amex Platinum limit is now $100,000',           ts: daysAgo(11),   read: true,  icon: 'fa-credit-card' },
        { id: 'n_6',  title: 'Statement ready',         body: 'Your June statement is available to view',           ts: daysAgo(21),   read: true,  icon: 'fa-file-invoice' },
        { id: 'n_7',  title: 'Rewards milestone 🎉',    body: 'You crossed 20,000 points · Platinum tier unlocked', ts: daysAgo(48),   read: true,  icon: 'fa-crown' },
        { id: 'n_8',  title: 'Split bill settled',      body: 'Raj paid their $45.00 share of Dinner',              ts: daysAgo(73),   read: true,  icon: 'fa-receipt' },
        { id: 'n_9',  title: 'Travel notice',           body: 'International spend enabled for your trip to Dubai',  ts: daysAgo(140),  read: true,  icon: 'fa-plane' },
        { id: 'n_10', title: 'Security check passed',   body: 'Annual identity verification completed',             ts: daysAgo(255),  read: true,  icon: 'fa-shield-halved' },
        { id: 'n_11', title: 'Card upgraded',           body: 'You were upgraded to Visa Infinite',                 ts: daysAgo(430),  read: true,  icon: 'fa-arrow-up' },
        { id: 'n_12', title: 'Interest credited',       body: '$214.80 savings interest added to your balance',     ts: daysAgo(620),  read: true,  icon: 'fa-piggy-bank' },
        { id: 'n_13', title: '2-year anniversary 🎂',   body: 'Thanks for 2 years with NovaPay!',                   ts: daysAgo(1090), read: true,  icon: 'fa-cake-candles' },
        { id: 'n_14', title: 'Account opened',          body: 'Welcome to NovaPay. Your journey begins!',           ts: daysAgo(1580), read: true,  icon: 'fa-bolt' },
      ],
    };
  }

  function daysAgo(n) {
    // NOTE: uses Date at call-time; fine in browser runtime.
    return Date.now() - n * 86400000;
  }
  function daysFromNow(n) { return Date.now() + n * 86400000; }

  // ---------- load / save ----------
  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) { const s = seed(); localStorage.setItem(KEY, JSON.stringify(s)); return s; }
      return migrate(JSON.parse(raw));
    } catch (e) {
      const s = seed(); localStorage.setItem(KEY, JSON.stringify(s)); return s;
    }
  }

  // backfill fields added after a user's state was first saved (so old cached
  // state gets Amex card, rewards, scheduled, theme, etc. without a manual reset)
  function migrate(st) {
    const s = seed();
    if (!st.cards || !st.cards.length) st.cards = s.cards;
    if (!st.cards.some(c => c.id === 'amex')) st.cards.push(s.cards.find(c => c.id === 'amex'));
    if (!st.activeCard) st.activeCard = 'visa';
    if (!st.rewards) st.rewards = s.rewards;
    if (!st.scheduled) st.scheduled = s.scheduled;
    if (!st.settings) st.settings = s.settings;
    if (!st.settings.theme) st.settings.theme = 'light';
    // notifications: force the full history whenever the saved set is the old stub
    // (schemaVersion < 2), while preserving any real ones the user generated.
    if ((st.schemaVersion || 1) < 2 || !st.notifications || st.notifications.length < 3) {
      const userGen = (st.notifications || []).filter(n => n.id && n.id.startsWith('n_') === false && n.id.startsWith('id_'));
      st.notifications = s.notifications.concat(userGen);
      st.schemaVersion = 2;
    }
    if (st.profile == null) st.profile = s.profile;
    // cards saved before cvv existed would render an empty security code
    (st.cards || []).forEach(c => {
      if (!c.cvv) { const seeded = s.cards.find(x => x.id === c.id); if (seeded) c.cvv = seeded.cvv; }
    });
    // gifts: saved state below schemaVersion 4 holds a superseded seed — the old
    // 4-gift money stub (v<3), or the pre-shift ages (v3). Force the current seed,
    // keeping user-generated gifts.
    if ((st.schemaVersion || 1) < 4) {
      const userGen = (st.gifts || []).filter(g => g.id && g.id.startsWith('id_'));
      st.gifts = GIFT_SEED.map(g => ({ ...g })).concat(userGen);
      st.schemaVersion = 4;
    }
    // gift ages are always relative to now — recompute even for already-saved state
    st.gifts = hydrateGifts(st.gifts);
    localStorage.setItem(KEY, JSON.stringify(st));
    return st;
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
    // let any listening page re-render
    window.dispatchEvent(new CustomEvent('novapay:change'));
  }

  // ---------- formatting ----------
  function fmt(cents, opts) {
    opts = opts || {};
    const neg = cents < 0;
    const abs = Math.abs(cents) / 100;
    const s = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (opts.signed) return (neg ? '-' : '+') + '$' + s;
    return (neg ? '-$' : '$') + s;
  }

  function relDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function uid(prefix) {
    return (prefix || 'id') + '_' + Math.abs(hash(JSON.stringify(state.transactions.length) + ts() + Math.floor(perf())));
  }
  function ts() { return Date.now(); }
  function perf() { return (window.performance && performance.now()) ? performance.now() : 0; }
  function hash(str) { let h = 0; for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; } return h; }

  // ---------- core actions ----------
  function addTransaction(tx) {
    const t = Object.assign({
      id: uid('tx'),
      name: 'Unknown',
      note: '',
      amountCents: 0,
      ts: ts(),
      category: tx.amountCents >= 0 ? 'income' : 'expense',
      icon: tx.amountCents >= 0 ? 'fa-arrow-down' : 'fa-arrow-up',
      color: tx.amountCents >= 0 ? 'green' : 'slate',
    }, tx);
    state.transactions.unshift(t);
    state.balanceCents += t.amountCents;
    save();
    return t;
  }

  // keep legacy state.card mirrored to active card so old pages keep working
  function syncActiveCard() {
    const c = (state.cards || []).find(x => x.id === state.activeCard) || (state.cards || [])[0];
    if (c) { state.card.last4 = c.last4; state.card.holder = c.holder; state.card.frozen = c.frozen; }
  }

  function activeCard() { return (state.cards || []).find(x => x.id === state.activeCard) || (state.cards || [])[0]; }
  function setActiveCard(id) { if ((state.cards || []).some(c => c.id === id)) { state.activeCard = id; syncActiveCard(); save(); } }
  function toggleFreeze(id) {
    const c = (state.cards || []).find(x => x.id === id); if (!c) return;
    c.frozen = !c.frozen; syncActiveCard(); save(); return c.frozen;
  }
  function setCardLimit(id, cents) { const c = (state.cards || []).find(x => x.id === id); if (c) { c.limitCents = cents; save(); } }

  // spending insights: group expenses by mcc within last `days`
  function insights(days) {
    days = days || 30;
    const cutoff = ts() - days * 86400000;
    const buckets = {};
    let total = 0;
    state.transactions.filter(t => t.amountCents < 0 && t.ts >= cutoff).forEach(t => {
      const k = t.mcc || 'Other';
      const v = Math.abs(t.amountCents);
      buckets[k] = (buckets[k] || 0) + v; total += v;
    });
    const rows = Object.keys(buckets).map(k => ({ category: k, cents: buckets[k], pct: total ? Math.round(buckets[k] / total * 100) : 0 }))
      .sort((a, b) => b.cents - a.cents);
    return { total, rows };
  }

  // rewards: 1 pt per $1 spent + 1% cashback on card spend
  function accrueRewards(spendCents) {
    state.rewards = state.rewards || { pointsBalance: 0, cashbackCents: 0, tier: 'Member' };
    state.rewards.pointsBalance += Math.floor(spendCents / 100);
    state.rewards.cashbackCents += Math.floor(spendCents / 100);
  }
  function redeemCashback() {
    const c = (state.rewards && state.rewards.cashbackCents) || 0;
    if (c <= 0) return { ok: false, error: 'No cashback to redeem' };
    state.rewards.cashbackCents = 0;
    // addTransaction already credits balanceCents — do not add twice
    addTransaction({ name: 'Cashback Redeemed', note: 'Rewards', amountCents: c, category: 'income', mcc: 'Rewards', icon: 'fa-gift', color: 'purple' });
    return { ok: true, cents: c };
  }

  // scheduled payments
  function paySchedule(id) {
    const sc = (state.scheduled || []).find(x => x.id === id); if (!sc) return { ok: false, error: 'Not found' };
    if (sc.amountCents > state.balanceCents) return { ok: false, error: 'Insufficient balance' };
    const r = pay({ name: sc.name, note: 'Scheduled payment', amountCents: sc.amountCents, icon: sc.icon, color: sc.color });
    if (r.ok) { sc.nextTs = daysFromNow(30); save(); }
    return r;
  }
  function toggleAutopay(id) { const sc = (state.scheduled || []).find(x => x.id === id); if (sc) { sc.autopay = !sc.autopay; save(); return sc.autopay; } }
  function addSchedule(sc) { state.scheduled = state.scheduled || []; state.scheduled.push(Object.assign({ id: uid('sc'), cadence: 'monthly', nextTs: daysFromNow(30), autopay: true, icon: 'fa-calendar', color: 'blue' }, sc)); save(); }

  // split a bill among contacts: charges you your share, notifies others' requests
  function splitBill({ total, name, people }) {
    if (!total || total <= 0 || !people || !people.length) return { ok: false, error: 'Invalid split' };
    const n = people.length + 1;               // include self
    const share = Math.round(total / n);
    // your share leaves your balance
    const r = pay({ name: name || 'Split bill', note: `Your share (1/${n})`, amountCents: share, icon: 'fa-receipt', color: 'orange' });
    if (!r.ok) return r;
    people.forEach(p => notify('Split request sent', `Requested ${fmt(share)} from ${p} for ${name || 'a bill'}`, 'fa-hand-holding-dollar'));
    return { ok: true, share, count: n };
  }

  function notify(title, body, icon) {
    state.notifications.unshift({ id: uid('n'), title, body, icon: icon || 'fa-bell', ts: ts(), read: false });
    save();
  }

  // send money out. returns {ok, error?, tx?}
  function pay({ name, note, amountCents, category, icon, color }) {
    if (!amountCents || amountCents <= 0) return { ok: false, error: 'Enter a valid amount' };
    if (state.card.frozen) return { ok: false, error: 'Card is frozen. Unfreeze it in Cards.' };
    if (amountCents > state.balanceCents) return { ok: false, error: 'Insufficient balance' };
    accrueRewards(Math.abs(amountCents));
    const tx = addTransaction({
      name: name || 'Payment', note: note || 'Sent', amountCents: -Math.abs(amountCents),
      category: category || 'expense', mcc: (arguments[0] && arguments[0].mcc) || 'Payments', icon: icon || 'fa-paper-plane', color: color || 'blue',
    });
    if (state.settings.notifications) notify('Payment sent', `${fmt(amountCents)} to ${name || 'recipient'}`, 'fa-paper-plane');
    return { ok: true, tx };
  }

  // add money in (top up / receive)
  function deposit({ name, note, amountCents, icon, color }) {
    if (!amountCents || amountCents <= 0) return { ok: false, error: 'Enter a valid amount' };
    const tx = addTransaction({
      name: name || 'Top Up', note: note || 'Added', amountCents: Math.abs(amountCents),
      category: 'income', icon: icon || 'fa-plus', color: color || 'green',
    });
    if (state.settings.notifications) notify('Money added', `${fmt(amountCents)} added to your balance`, 'fa-wallet');
    return { ok: true, tx };
  }

  function withdraw({ amountCents }) {
    if (!amountCents || amountCents <= 0) return { ok: false, error: 'Enter a valid amount' };
    if (amountCents > state.balanceCents) return { ok: false, error: 'Insufficient balance' };
    const tx = addTransaction({ name: 'Withdrawal', note: 'To bank', amountCents: -Math.abs(amountCents), category: 'expense', icon: 'fa-building-columns', color: 'slate' });
    return { ok: true, tx };
  }

  function upsertContact(c) {
    const id = c.id || uid('c');
    const existing = state.contacts.find(x => x.id === id || (x.name === c.name && x.handle === c.handle));
    if (existing) { Object.assign(existing, c); }
    else state.contacts.push(Object.assign({ id }, c));
    save();
    return id;
  }

  // ---------- helpers for parsing money ----------
  function parseCents(str) {
    if (typeof str === 'number') return Math.round(str * 100);
    const n = parseFloat(String(str).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : Math.round(n * 100);
  }

  // ---------- avatar / images ----------
  function avatarFor(nameOrContact) {
    if (nameOrContact && nameOrContact.img) return nameOrContact.img;
    const name = typeof nameOrContact === 'string' ? nameOrContact : (nameOrContact && nameOrContact.name) || 'User';
    return 'https://ui-avatars.com/api/?background=random&name=' + encodeURIComponent(name);
  }

  function readFileAsDataURL(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  // ---------- theme controller (auto light/dark + manual override) ----------
  function applyTheme() {
    // app is light-only for now — always render light regardless of saved pref
    document.documentElement.removeAttribute('data-theme');
  }
  function setTheme(pref) { state.settings.theme = pref; save(); applyTheme(); }
  function effectiveTheme() {
    const pref = state.settings.theme || 'auto';
    if (pref !== 'auto') return pref;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  // apply as early as possible
  try { applyTheme(); } catch (e) {}
  if (window.matchMedia) {
    try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if ((state.settings.theme||'auto')==='auto') applyTheme(); }); } catch(e){}
  }

  // ---------- public API ----------
  window.NovaPay = {
    setTheme, applyTheme, effectiveTheme,
    // state access (read-only-ish; mutate via actions then save())
    get state() { return state; },
    save,
    reset() { state = seed(); localStorage.setItem(KEY, JSON.stringify(state)); window.dispatchEvent(new CustomEvent('novapay:change')); },
    reload() { state = load(); },

    // money
    get balanceCents() { return state.balanceCents; },
    setBalanceCents(c) { state.balanceCents = Math.round(c); save(); },
    fmt, parseCents, relDate,

    // actions
    pay, deposit, withdraw, addTransaction, notify, upsertContact,

    // cards
    cards: () => state.cards || [],
    activeCard, setActiveCard, toggleFreeze, setCardLimit,

    // rewards
    rewards: () => state.rewards || { pointsBalance: 0, cashbackCents: 0, tier: 'Member' },
    redeemCashback,

    // scheduled
    scheduled: () => state.scheduled || [],
    paySchedule, toggleAutopay, addSchedule,

    // insights + split
    insights, splitBill,

    // data
    transactions: () => state.transactions,
    contacts: () => state.contacts,
    gifts: () => state.gifts || [],
    // add a gift (id_ prefix => survives the seed migration, like user-generated gifts).
    // Gifts carry no money value — they're an experience/note, newest first.
    addGift({ from, note, img, ageDays }) {
      if (!from || !note) return { ok: false, error: 'from and note required' };
      const g = {
        id: 'id_gift_' + Math.abs(hash(from + note + ts() + Math.floor(perf()))),
        from, note,
        img: img || '',
        ageDays: ageDays == null ? 0 : ageDays,
        ts: daysAgo(ageDays == null ? 0 : ageDays),
      };
      state.gifts = [g].concat(state.gifts || []).sort((a, b) => b.ts - a.ts);
      save();
      return { ok: true, gift: g };
    },
    notifications: () => state.notifications,
    unreadCount: () => state.notifications.filter(n => !n.read).length,
    markNotificationsRead() { state.notifications.forEach(n => n.read = true); save(); },
    // push a notification to the top of the inbox (admin / programmatic use)
    addNotification({ title, body, icon }) {
      if (!title) return { ok: false, error: 'title required' };
      const n = { id: uid('n'), title, body: body || '', icon: icon || 'fa-bell', ts: ts(), read: false };
      state.notifications.unshift(n);
      save();
      return { ok: true, notification: n };
    },
    deleteNotification(id) {
      state.notifications = state.notifications.filter(n => n.id !== id);
      save();
    },
    clearNotifications() { state.notifications = []; save(); },

    // pins
    checkAdminPin: (p) => String(p) === ADMIN_PIN,
    checkPayPin: (p) => String(p) === PAY_PIN,
    ADMIN_PIN, PAY_PIN,

    // images
    avatarFor, readFileAsDataURL,

    // settings/profile mutators
    setProfile(patch) { Object.assign(state.profile, patch); save(); },
    // update a contact (name / handle / img). img may be a path or base64 data-uri.
    setContact(id, patch) {
      const c = (state.contacts || []).find(x => x.id === id);
      if (!c) return { ok: false, error: 'no such contact' };
      Object.assign(c, patch);
      save();
      return { ok: true, contact: c };
    },
    setCard(patch) { Object.assign(state.card, patch); save(); },
    setSetting(k, v) { state.settings[k] = v; save(); },

    // admin-grade direct edit
    updateTransaction(id, patch) {
      const t = state.transactions.find(x => x.id === id);
      if (!t) return false;
      const oldAmt = t.amountCents;
      Object.assign(t, patch);
      if (patch.amountCents != null && patch.amountCents !== oldAmt) {
        state.balanceCents += (patch.amountCents - oldAmt);
      }
      state.transactions.sort((a, b) => b.ts - a.ts);
      save(); return true;
    },
    deleteTransaction(id) {
      const i = state.transactions.findIndex(x => x.id === id);
      if (i < 0) return false;
      state.balanceCents -= state.transactions[i].amountCents;
      state.transactions.splice(i, 1);
      save(); return true;
    },
  };
})();
