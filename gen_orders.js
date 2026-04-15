// Generates orders.html with embedded data
const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('orders_src.xlsx');

function xlDate(s) {
  if (!s || isNaN(s)) return '';
  var d = new Date(Math.round((s - 25569) * 864e5));
  return String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + d.getFullYear();
}

function deType(n) {
  n = (n||'').toLowerCase();
  if (n.includes('кнт') || n.includes('конт')) return 'cnt';
  if (n.includes('само')) return 'self';
  return 'trk';
}

var monthMap = [
  ['январь 2026','Янв'], ['февраль 2026','Фев'],
  ['март 2026','Мар'],   ['апрель 2026','Апр']
];

var all = [];
monthMap.forEach(function(m) {
  var ws = wb.Sheets[m[0]];
  var data = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
  data.slice(4).forEach(function(r) {
    if (!r[2] || !r[2].toString().trim()) return;
    var tot = +r[19] || 0;
    if (!tot && +r[18] && +r[5]) tot = Math.round(+r[18] * +r[5] / 1000);
    all.push([
      m[1],
      (r[0]+'').trim(),
      (r[1]+'').trim(),
      (r[2]+'').trim(),
      (r[3]+'').trim(),
      +r[5] || 0,
      +r[6] || 0,
      (r[7]+'').trim(),
      (r[8]+'').trim(),
      xlDate(r[9]),
      (r[10]+'').trim(),
      (r[12]+'').trim(),
      (r[13]+'').trim(),
      (r[17]+'').trim(),
      +r[18] || 0,
      tot,
      deType(r[0])
    ]);
  });
});

var odJson = JSON.stringify(all);

var html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Заказы 2026 — Клото</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #080c14; --bg2: #0d1320;
      --surface: rgba(255,255,255,.04); --surface2: rgba(255,255,255,.07);
      --border: rgba(255,255,255,.08); --border2: rgba(255,255,255,.14);
      --accent: #7c5cfc; --accent2: #b07dff;
      --cyan: #3de8c7; --gold: #f5c842; --red: #ff5e7d;
      --green: #48bb78; --blue: #63b3ed; --orange: #f6ad55;
      --text: #e8eaf0; --muted: #6b7491; --radius: 16px;
    }
    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; min-height: 100vh; overflow-x: hidden; }

    /* bg */
    .bg-grid { position: fixed; inset: 0; z-index: 0;
      background-image: linear-gradient(rgba(124,92,252,.04) 1px,transparent 1px), linear-gradient(90deg,rgba(124,92,252,.04) 1px,transparent 1px);
      background-size: 48px 48px; pointer-events: none; }
    .bg-orb { position: fixed; border-radius: 50%; filter: blur(120px); pointer-events: none; z-index: 0; }
    .bg-orb-1 { width:700px;height:700px; background:radial-gradient(circle,rgba(245,200,66,.10) 0%,transparent 70%); top:-250px;right:-100px; animation:o1 20s ease-in-out infinite; }
    .bg-orb-2 { width:500px;height:500px; background:radial-gradient(circle,rgba(124,92,252,.14) 0%,transparent 70%); bottom:-100px;left:-100px; animation:o2 16s ease-in-out infinite; }
    .bg-orb-3 { width:350px;height:350px; background:radial-gradient(circle,rgba(61,232,199,.09) 0%,transparent 70%); top:45%;left:40%; animation:o3 12s ease-in-out infinite; }
    @keyframes o1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-60px,80px)} }
    @keyframes o2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(80px,-50px)} }
    @keyframes o3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-40px,40px)} }

    /* layout */
    .layout { display: flex; min-height: 100vh; position: relative; z-index: 1; }

    /* sidebar */
    .sidebar { width:250px; min-height:100vh; background:rgba(13,19,32,.9); backdrop-filter:blur(24px);
      border-right:1px solid var(--border); display:flex; flex-direction:column; padding:28px 0;
      position:sticky; top:0; height:100vh; flex-shrink:0; overflow-y:auto; }
    .logo { display:flex; align-items:center; gap:12px; padding:0 22px 28px; border-bottom:1px solid var(--border); }
    .logo-back { width:32px;height:32px;border-radius:8px; background:var(--surface2);border:1px solid var(--border2);
      display:flex;align-items:center;justify-content:center; color:var(--muted);font-size:14px;cursor:pointer;
      transition:all .2s;text-decoration:none;flex-shrink:0; }
    .logo-back:hover { background:rgba(124,92,252,.2);color:var(--accent2);border-color:rgba(124,92,252,.3); }
    .logo-text { font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:15px;
      background:linear-gradient(135deg,var(--gold),#f6ad55); -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; }
    .logo-sub { font-size:10px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;margin-top:1px; }
    .nav { padding:16px 10px;flex:1;display:flex;flex-direction:column;gap:2px; }
    .nav-section-label { font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);padding:10px 12px 5px; }
    .nav-item { display:flex;align-items:center;gap:10px;padding:9px 13px;border-radius:10px;
      color:var(--muted);font-size:13.5px;font-weight:500;cursor:pointer;transition:all .2s;text-decoration:none;position:relative; }
    .nav-item:hover { background:var(--surface2);color:var(--text); }
    .nav-item.active { background:rgba(245,200,66,.12);color:var(--gold);border:1px solid rgba(245,200,66,.2); }
    .nav-item.active::before { content:'';position:absolute;left:0;top:25%;bottom:25%;width:3px;border-radius:0 3px 3px 0;background:var(--gold); }
    .nav-icon { width:18px;text-align:center;font-size:15px;flex-shrink:0; }
    .nav-badge { margin-left:auto;font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;min-width:20px;text-align:center; }
    .nb-gold { background:rgba(245,200,66,.2);color:var(--gold); }
    .nb-red  { background:rgba(255,94,125,.2);color:var(--red); }
    .nb-cyan { background:rgba(61,232,199,.2);color:var(--cyan); }
    .nb-blue { background:rgba(99,179,237,.2);color:var(--blue); }
    .sidebar-user { margin:0 10px 4px;padding:13px;border-radius:12px;background:var(--surface);border:1px solid var(--border);
      display:flex;align-items:center;gap:10px; }
    .avatar { width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--cyan));
      display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:#fff;flex-shrink:0; }
    .user-name { font-size:12.5px;font-weight:600; }
    .user-role { font-size:11px;color:var(--muted); }

    /* main */
    .main { flex:1;padding:32px 36px;overflow-y:auto;display:flex;flex-direction:column;gap:24px;min-width:0; }

    /* topbar */
    .topbar { display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap; }
    .page-title { font-family:'Space Grotesk',sans-serif;font-size:28px;font-weight:700;
      background:linear-gradient(135deg,#fff 30%,var(--gold)); -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; }
    .page-sub { color:var(--muted);font-size:13.5px;margin-top:3px; }
    .topbar-actions { display:flex;align-items:center;gap:10px; }
    .search-box { display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border);
      border-radius:10px;padding:8px 14px;width:260px;transition:all .2s; }
    .search-box:focus-within { border-color:var(--gold);box-shadow:0 0 0 3px rgba(245,200,66,.1); }
    .search-box input { background:none;border:none;outline:none;color:var(--text);font-size:13px;width:100%; }
    .search-box input::placeholder { color:var(--muted); }
    .btn-icon { width:38px;height:38px;border-radius:10px;background:var(--surface);border:1px solid var(--border);
      display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;color:var(--muted);font-size:16px; }
    .btn-icon:hover { background:var(--surface2);color:var(--text); }

    /* KPI */
    .kpi-row { display:grid;grid-template-columns:repeat(4,1fr);gap:16px; }
    .kpi-card { background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px 22px;
      position:relative;overflow:hidden;transition:transform .2s,border-color .2s,box-shadow .2s; }
    .kpi-card:hover { transform:translateY(-2px);border-color:var(--border2);box-shadow:0 8px 32px rgba(0,0,0,.4); }
    .kpi-card::after { content:'';position:absolute;top:0;left:0;right:0;height:2px;border-radius:var(--radius) var(--radius) 0 0; }
    .kc-green::after { background:linear-gradient(90deg,var(--green),transparent); }
    .kc-gold::after  { background:linear-gradient(90deg,var(--gold),transparent); }
    .kc-blue::after  { background:linear-gradient(90deg,var(--blue),transparent); }
    .kc-cyan::after  { background:linear-gradient(90deg,var(--cyan),transparent); }
    .kpi-icon { font-size:28px;margin-bottom:10px; }
    .kpi-label { font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);font-weight:600; }
    .kpi-val { font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:800;margin:6px 0 4px; }
    .kpi-sub { font-size:11.5px;color:var(--muted); }
    .kpi-trend { display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;margin-top:8px; }
    .trend-up { background:rgba(72,187,120,.15);color:var(--green); }

    /* Analytics row */
    .analytics-row { display:grid;grid-template-columns:2fr 1.5fr 1fr;gap:16px; }
    .chart-card { background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:22px 24px; }
    .card-title { font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-bottom:16px; }

    /* Month chart */
    .month-bars { display:flex;align-items:flex-end;gap:8px;height:110px; }
    .month-bar-wrap { flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer; }
    .month-bar { width:100%;border-radius:6px 6px 0 0;transition:opacity .2s;min-height:4px; background:linear-gradient(180deg,rgba(245,200,66,.9),rgba(245,200,66,.4)); }
    .month-bar-wrap:hover .month-bar { opacity:.8; }
    .month-bar-label { font-size:10px;color:var(--muted);font-weight:600; }
    .month-bar-val { font-size:10px;color:var(--gold);font-weight:700;white-space:nowrap; }

    /* Top clients */
    .client-row { display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border); }
    .client-row:last-child { border:none; }
    .client-rank { font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:700;color:var(--muted);min-width:18px; }
    .client-name { font-size:13px;font-weight:600;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
    .client-bar-wrap { width:80px;height:6px;background:var(--surface2);border-radius:3px;overflow:hidden; }
    .client-bar { height:100%;border-radius:3px;background:linear-gradient(90deg,var(--cyan),transparent); }
    .client-val { font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:700;color:var(--cyan);min-width:70px;text-align:right; }

    /* Delivery mix */
    .mix-row { display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border); }
    .mix-row:last-child { border:none; }
    .mix-icon { font-size:20px;width:28px;text-align:center; }
    .mix-label { flex:1;font-size:13px;font-weight:600; }
    .mix-count { font-size:12px;color:var(--muted); }
    .mix-pct { font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:800; }

    /* Filters */
    .filter-bar { display:flex;align-items:center;gap:12px;flex-wrap:wrap; }
    .month-tabs { display:flex;gap:6px;flex-wrap:wrap; }
    .tab { padding:7px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;
      background:var(--surface);border:1px solid var(--border);color:var(--muted);transition:all .2s; }
    .tab:hover { border-color:var(--border2);color:var(--text); }
    .tab.active { background:rgba(245,200,66,.15);border-color:rgba(245,200,66,.35);color:var(--gold); }
    .filter-select { background:var(--surface);border:1px solid var(--border);border-radius:8px;
      padding:7px 12px;font-size:12.5px;color:var(--text);outline:none;cursor:pointer; }
    .filter-select:focus { border-color:var(--gold); }
    .filter-count { font-size:13px;color:var(--muted);padding:6px 12px;background:var(--surface);
      border:1px solid var(--border);border-radius:8px;font-weight:600; }

    /* Table */
    .table-card { background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden; }
    .table-header { display:flex;align-items:center;justify-content:space-between;padding:16px 20px;
      border-bottom:1px solid var(--border); }
    .table-title { font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted); }
    .btn-export { display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;
      background:rgba(245,200,66,.12);border:1px solid rgba(245,200,66,.25);color:var(--gold);
      font-size:12px;font-weight:700;cursor:pointer;transition:all .2s; }
    .btn-export:hover { background:rgba(245,200,66,.22); }
    .table-wrap { overflow-x:auto; }
    table { width:100%;border-collapse:collapse;font-size:13px; }
    thead tr { background:rgba(255,255,255,.03);border-bottom:1px solid var(--border); }
    th { padding:11px 14px;text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;
      color:var(--muted);font-weight:700;white-space:nowrap;cursor:pointer;user-select:none; }
    th:hover { color:var(--text); }
    th.sorted { color:var(--gold); }
    td { padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.035);vertical-align:middle; }
    tbody tr { transition:background .15s;cursor:pointer; }
    tbody tr:hover { background:rgba(255,255,255,.04); }
    tbody tr:last-child td { border:none; }

    .badge { display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700; }
    .badge-green { background:rgba(72,187,120,.15);color:var(--green); }
    .badge-gold  { background:rgba(245,200,66,.15);color:var(--gold); }
    .badge-red   { background:rgba(255,94,125,.15);color:var(--red); }
    .badge-blue  { background:rgba(99,179,237,.15);color:var(--blue); }
    .badge-cyan  { background:rgba(61,232,199,.15);color:var(--cyan); }
    .badge-muted { background:rgba(255,255,255,.06);color:var(--muted); }

    .type-icon { font-size:15px; }

    .td-num { font-family:'Space Grotesk',sans-serif;font-weight:700; }
    .td-muted { color:var(--muted);font-size:12px; }
    .td-client { font-weight:600; }
    .td-product { color:var(--blue);font-size:12px;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
    .td-sum { font-family:'Space Grotesk',sans-serif;font-weight:700;color:var(--gold);white-space:nowrap; }

    /* Pagination */
    .pagination { display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-top:1px solid var(--border); }
    .pag-info { font-size:12.5px;color:var(--muted); }
    .pag-btns { display:flex;gap:6px; }
    .pag-btn { padding:5px 12px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;
      background:var(--surface);border:1px solid var(--border);color:var(--muted);transition:all .2s; }
    .pag-btn:hover { border-color:var(--border2);color:var(--text); }
    .pag-btn.active { background:rgba(245,200,66,.15);border-color:rgba(245,200,66,.35);color:var(--gold); }
    .pag-btn:disabled { opacity:.35;cursor:default; }

    /* Detail drawer */
    .detail-overlay { position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100;opacity:0;pointer-events:none;transition:opacity .3s; }
    .detail-overlay.open { opacity:1;pointer-events:all; }
    .detail-drawer { position:fixed;top:0;right:-480px;width:460px;height:100vh;background:var(--bg2);
      border-left:1px solid var(--border2);z-index:101;overflow-y:auto;padding:28px 26px;
      transition:right .3s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;gap:20px; }
    .detail-drawer.open { right:0; }
    .detail-header { display:flex;align-items:flex-start;justify-content:space-between;gap:12px; }
    .detail-close { width:34px;height:34px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);
      display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--muted);font-size:18px;flex-shrink:0; }
    .detail-close:hover { color:var(--text); }
    .detail-title { font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:800; }
    .detail-sub { font-size:12px;color:var(--muted);margin-top:3px; }
    .detail-section { background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 18px; }
    .detail-section-title { font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:12px; }
    .detail-row { display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04); }
    .detail-row:last-child { border:none; }
    .detail-key { font-size:12.5px;color:var(--muted); }
    .detail-val { font-size:13px;font-weight:600;text-align:right;max-width:240px;word-break:break-word; }
    .detail-sum { font-family:'Space Grotesk',sans-serif;font-size:28px;font-weight:800;color:var(--gold);margin:4px 0; }

    /* toast */
    .toast { position:fixed;bottom:24px;right:24px;z-index:200;background:#1a2235;border:1px solid var(--border2);
      border-radius:12px;padding:12px 20px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;
      box-shadow:0 8px 32px rgba(0,0,0,.5);opacity:0;transform:translateY(10px);transition:all .3s; }
    .toast.show { opacity:1;transform:translateY(0); }

    /* empty */
    .empty-state { text-align:center;padding:48px 20px;color:var(--muted); }
    .empty-icon { font-size:40px;margin-bottom:12px; }
    .empty-text { font-size:15px;font-weight:600;margin-bottom:6px;color:var(--text); }

    /* responsive */
    @media(max-width:1200px) { .analytics-row { grid-template-columns:1fr 1fr; } }
    @media(max-width:960px)  { .kpi-row { grid-template-columns:repeat(2,1fr); } .sidebar { display:none; } }
  </style>
</head>
<body>
<div class="bg-grid"></div>
<div class="bg-orb bg-orb-1"></div>
<div class="bg-orb bg-orb-2"></div>
<div class="bg-orb bg-orb-3"></div>

<div class="layout">

  <!-- SIDEBAR -->
  <aside class="sidebar">
    <div class="logo">
      <a class="logo-back" href="commercial.html" title="Коммерческий отдел">←</a>
      <div class="logo-info">
        <div class="logo-text">Заказы 2026</div>
        <div class="logo-sub">коммерческий · Клото</div>
      </div>
    </div>
    <nav class="nav">
      <div class="nav-section-label">Навигация</div>
      <a class="nav-item active" href="#">
        <span class="nav-icon">📋</span> Все заказы
        <span class="nav-badge nb-gold" id="nav-total">240</span>
      </a>
      <a class="nav-item" onclick="setMonth('Янв')" href="#">
        <span class="nav-icon">❄️</span> Январь
        <span class="nav-badge nb-blue" id="nav-jan">—</span>
      </a>
      <a class="nav-item" onclick="setMonth('Фев')" href="#">
        <span class="nav-icon">🌧</span> Февраль
        <span class="nav-badge nb-blue" id="nav-feb">—</span>
      </a>
      <a class="nav-item" onclick="setMonth('Мар')" href="#">
        <span class="nav-icon">🌱</span> Март
        <span class="nav-badge nb-blue" id="nav-mar">—</span>
      </a>
      <a class="nav-item" onclick="setMonth('Апр')" href="#">
        <span class="nav-icon">☀️</span> Апрель
        <span class="nav-badge nb-gold" id="nav-apr">—</span>
      </a>

      <div class="nav-section-label" style="margin-top:12px">Другие модули</div>
      <a class="nav-item" href="products.html"><span class="nav-icon">📦</span> Продукты</a>
      <a class="nav-item" href="logistic.html"><span class="nav-icon">🚚</span> Логистика</a>
      <a class="nav-item" href="sebescost.html"><span class="nav-icon">🧮</span> Себестоимость</a>
      <a class="nav-item" href="commercial.html"><span class="nav-icon">⊞</span> Дашборд</a>
    </nav>
    <div class="sidebar-user">
      <div class="avatar">АК</div>
      <div>
        <div class="user-name">Андрей К.</div>
        <div class="user-role">Руководитель</div>
      </div>
    </div>
  </aside>

  <!-- MAIN -->
  <main class="main">

    <!-- TOPBAR -->
    <div class="topbar">
      <div>
        <div class="page-title">📋 Отгрузки продукции</div>
        <div class="page-sub" id="page-sub">Загрузка данных...</div>
      </div>
      <div class="topbar-actions">
        <div class="search-box">
          <span style="color:var(--muted);font-size:14px">🔍</span>
          <input type="text" id="search-inp" placeholder="Клиент, продукт, заказ..." oninput="applyFilters()">
        </div>
        <button class="btn-icon" onclick="exportCSV()" title="Скачать CSV">📥</button>
      </div>
    </div>

    <!-- KPI ROW -->
    <div class="kpi-row">
      <div class="kpi-card kc-green">
        <div class="kpi-icon">📋</div>
        <div class="kpi-label">Заказов всего</div>
        <div class="kpi-val td-num" id="kpi-orders">—</div>
        <div class="kpi-sub">в выбранном периоде</div>
      </div>
      <div class="kpi-card kc-gold">
        <div class="kpi-icon">💰</div>
        <div class="kpi-label">Выручка</div>
        <div class="kpi-val td-num" id="kpi-rev">—</div>
        <div class="kpi-sub" id="kpi-rev-sub">сумма по заказам</div>
      </div>
      <div class="kpi-card kc-blue">
        <div class="kpi-icon">⚖️</div>
        <div class="kpi-label">Объём, тонн</div>
        <div class="kpi-val td-num" id="kpi-vol">—</div>
        <div class="kpi-sub" id="kpi-vol-sub">физический вес</div>
      </div>
      <div class="kpi-card kc-cyan">
        <div class="kpi-icon">🏢</div>
        <div class="kpi-label">Клиентов</div>
        <div class="kpi-val td-num" id="kpi-clients">—</div>
        <div class="kpi-sub">уникальных компаний</div>
      </div>
    </div>

    <!-- ANALYTICS -->
    <div class="analytics-row">
      <!-- Monthly chart -->
      <div class="chart-card">
        <div class="card-title">📈 Выручка по месяцам</div>
        <div id="month-chart"></div>
      </div>
      <!-- Top clients -->
      <div class="chart-card">
        <div class="card-title">🏆 Топ клиентов по выручке</div>
        <div id="top-clients"></div>
      </div>
      <!-- Delivery mix -->
      <div class="chart-card">
        <div class="card-title">🚛 Виды доставки</div>
        <div id="delivery-mix"></div>
      </div>
    </div>

    <!-- FILTERS -->
    <div class="filter-bar">
      <div class="month-tabs" id="month-tabs">
        <button class="tab active" onclick="setMonth('')" data-m="">Все</button>
        <button class="tab" onclick="setMonth('Янв')" data-m="Янв">Январь</button>
        <button class="tab" onclick="setMonth('Фев')" data-m="Фев">Февраль</button>
        <button class="tab" onclick="setMonth('Мар')" data-m="Мар">Март</button>
        <button class="tab" onclick="setMonth('Апр')" data-m="Апр">Апрель</button>
      </div>
      <select class="filter-select" id="status-filter" onchange="applyFilters()">
        <option value="">Все статусы</option>
        <option value="отгружен">Отгружено</option>
      </select>
      <select class="filter-select" id="type-filter" onchange="applyFilters()">
        <option value="">Все виды доставки</option>
        <option value="trk">Автодоставка</option>
        <option value="cnt">Контейнер</option>
        <option value="self">Самовывоз</option>
      </select>
      <div class="filter-count" id="filter-count">240 записей</div>
    </div>

    <!-- TABLE -->
    <div class="table-card">
      <div class="table-header">
        <span class="table-title" id="table-title">Все отгрузки</span>
        <button class="btn-export" onclick="exportCSV()">📥 Скачать CSV</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th onclick="sortBy(0)">Дата <span id="sh-0"></span></th>
              <th onclick="sortBy(1)">№ Заказа <span id="sh-1"></span></th>
              <th onclick="sortBy(2)">Клиент <span id="sh-2"></span></th>
              <th onclick="sortBy(3)">Продукт <span id="sh-3"></span></th>
              <th onclick="sortBy(4)" class="r" style="text-align:right">Кг <span id="sh-4"></span></th>
              <th onclick="sortBy(5)" class="r" style="text-align:right">Тонн <span id="sh-5"></span></th>
              <th onclick="sortBy(6)">Назначение <span id="sh-6"></span></th>
              <th onclick="sortBy(7)">Статус <span id="sh-7"></span></th>
              <th>Доставка</th>
              <th onclick="sortBy(8)" class="r" style="text-align:right">Сумма ₽ <span id="sh-8"></span></th>
            </tr>
          </thead>
          <tbody id="orders-tbody"></tbody>
        </table>
      </div>
      <div class="pagination" id="pagination"></div>
    </div>

  </main>
</div>

<!-- DETAIL DRAWER -->
<div class="detail-overlay" id="detail-overlay" onclick="closeDetail()"></div>
<div class="detail-drawer" id="detail-drawer">
  <div class="detail-header">
    <div>
      <div class="detail-title" id="dd-title">—</div>
      <div class="detail-sub" id="dd-sub">—</div>
    </div>
    <div class="detail-close" onclick="closeDetail()">✕</div>
  </div>
  <div id="dd-body"></div>
</div>

<!-- TOAST -->
<div class="toast" id="toast"></div>

<script>
// ============================================================
//  DATA  (OD columns: 0=month 1=notes 2=orderNum 3=client
//   4=product 5=qtyKg 6=qtyUnits 7=dest 8=status 9=date
//   10=truck 11=driver 12=container 13=acts 14=pricePerTon
//   15=total 16=type)
// ============================================================
var OD = ${odJson};

// ============ State ============
var curMonth = '';
var curSearch = '';
var curStatus = '';
var curType = '';
var sortCol = 9; // date col index in display
var sortDir = -1;
var page = 1;
var pageSize = 25;
var filtered = [];

// ============ Helpers ============
function fmtRub(n) {
  if (!n) return '—';
  n = Math.round(n);
  if (n >= 1e6) return (n/1e6).toFixed(1).replace('.0','') + ' млн';
  if (n >= 1e3) return (n/1e3).toFixed(0) + ' тыс';
  return n.toLocaleString('ru');
}
function fmtRubFull(n) {
  return n ? Math.round(n).toLocaleString('ru') + ' ₽' : '—';
}
function fmtNum(n) { return n ? (+n).toLocaleString('ru') : '—'; }
function fmtTon(kg) { return kg ? (kg/1000).toFixed(2) + ' тн' : '—'; }
function typeIcon(t) {
  if (t === 'cnt')  return '<span title="Контейнер">🚢</span>';
  if (t === 'self') return '<span title="Самовывоз">🏭</span>';
  return '<span title="Автодоставка">🚛</span>';
}
function typeLabel(t) {
  if (t === 'cnt')  return 'Контейнер';
  if (t === 'self') return 'Самовывоз';
  return 'Авто';
}
function statusBadge(s) {
  if (!s || s === '') return '<span class="badge badge-muted">—</span>';
  var sl = s.toLowerCase();
  if (sl.includes('отгруж')) return '<span class="badge badge-green">✓ Отгружено</span>';
  if (sl.includes('работ')) return '<span class="badge badge-gold">⏳ В работе</span>';
  if (sl.includes('отмен')) return '<span class="badge badge-red">✕ Отменён</span>';
  return '<span class="badge badge-muted">' + s + '</span>';
}
function getFiltered() {
  return OD.filter(function(r) {
    if (curMonth && r[0] !== curMonth) return false;
    if (curStatus && !r[8].toLowerCase().includes(curStatus)) return false;
    if (curType && r[16] !== curType) return false;
    if (curSearch) {
      var q = curSearch.toLowerCase();
      if (!r[3].toLowerCase().includes(q) &&
          !r[4].toLowerCase().includes(q) &&
          !r[2].toLowerCase().includes(q) &&
          !r[7].toLowerCase().includes(q) &&
          !r[11].toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

// ============ Sort ============
var sortMap = [9, 2, 3, 4, 5, 5, 7, 8, 15]; // display col → OD col
var sortOdCol = 9;
function sortBy(displayCol) {
  var odCol = [9, 2, 3, 4, 5, 5, 7, 8, 15][displayCol];
  if (sortOdCol === odCol) sortDir *= -1;
  else { sortOdCol = odCol; sortDir = -1; }
  sortCol = displayCol;
  page = 1;
  render();
}

// ============ KPI + Analytics ============
function renderAnalytics(data) {
  var totalRev = 0, totalKg = 0, clients = {};
  data.forEach(function(r) { totalRev += r[15]; totalKg += r[5]; clients[r[3]] = 1; });
  document.getElementById('kpi-orders').textContent  = fmtNum(data.length);
  document.getElementById('kpi-rev').textContent     = fmtRub(totalRev) + ' ₽';
  document.getElementById('kpi-vol').textContent     = (totalKg/1000).toFixed(1) + ' тн';
  document.getElementById('kpi-clients').textContent = Object.keys(clients).length;
  document.getElementById('page-sub').textContent    =
    data.length + ' заказов · ' + fmtRubFull(totalRev) + ' · ' + (totalKg/1000).toFixed(1) + ' тн';

  renderMonthChart(data);
  renderTopClients(data);
  renderDeliveryMix(data);
}

function renderMonthChart(data) {
  var months = ['Янв','Фев','Мар','Апр'];
  var mNames = {Янв:'Январь', Фев:'Февраль', Мар:'Март', Апр:'Апрель'};
  var sums = {Янв:0, Фев:0, Мар:0, Апр:0};
  data.forEach(function(r) { if (sums[r[0]] !== undefined) sums[r[0]] += r[15]; });
  var max = Math.max.apply(null, months.map(function(m){return sums[m];})) || 1;
  var html = '<div class="month-bars">';
  months.forEach(function(m) {
    var h = Math.round(sums[m]/max*100);
    var v = sums[m] >= 1e6 ? (sums[m]/1e6).toFixed(1)+'м' : sums[m] >= 1e3 ? (sums[m]/1e3).toFixed(0)+'к' : sums[m];
    html += '<div class="month-bar-wrap" onclick="setMonth(\\'' + m + '\\')" title="' + mNames[m] + '">' +
      '<div class="month-bar-val">' + v + '</div>' +
      '<div class="month-bar" style="height:' + Math.max(h,4) + 'px;' + (curMonth===m?'background:var(--gold)':'') + '"></div>' +
      '<div class="month-bar-label">' + m + '</div>' +
    '</div>';
  });
  html += '</div>';
  document.getElementById('month-chart').innerHTML = html;
}

function renderTopClients(data) {
  var clients = {};
  data.forEach(function(r) { clients[r[3]] = (clients[r[3]]||0) + r[15]; });
  var arr = Object.keys(clients).map(function(k){return {n:k,v:clients[k]};})
    .sort(function(a,b){return b.v-a.v;}).slice(0,6);
  var max = arr[0] ? arr[0].v : 1;
  var html = arr.map(function(c,i) {
    var pct = Math.round(c.v/max*100);
    return '<div class="client-row"><span class="client-rank">#'+(i+1)+'</span>' +
      '<span class="client-name" title="'+c.n+'">'+c.n+'</span>' +
      '<div class="client-bar-wrap"><div class="client-bar" style="width:'+pct+'%"></div></div>' +
      '<span class="client-val">'+fmtRub(c.v)+'</span></div>';
  }).join('');
  document.getElementById('top-clients').innerHTML = html || '<div class="td-muted">Нет данных</div>';
}

function renderDeliveryMix(data) {
  var mix = {trk:0, cnt:0, self:0};
  data.forEach(function(r) { mix[r[16]] = (mix[r[16]]||0) + 1; });
  var total = data.length || 1;
  var items = [
    {key:'trk', icon:'🚛', label:'Автодоставка', color:'var(--blue)'},
    {key:'cnt', icon:'🚢', label:'Контейнер',    color:'var(--cyan)'},
    {key:'self',icon:'🏭', label:'Самовывоз',    color:'var(--orange)'}
  ];
  var html = items.map(function(it) {
    var cnt = mix[it.key]||0;
    var pct = Math.round(cnt/total*100);
    return '<div class="mix-row"><span class="mix-icon">'+it.icon+'</span>' +
      '<span class="mix-label">'+it.label+'</span>' +
      '<span class="mix-count">'+cnt+' шт</span>' +
      '<span class="mix-pct" style="color:'+it.color+'">'+pct+'%</span></div>';
  }).join('');
  document.getElementById('delivery-mix').innerHTML = html;
}

// ============ TABLE ============
function render() {
  filtered = getFiltered();
  filtered.sort(function(a,b) {
    var av = a[sortOdCol], bv = b[sortOdCol];
    if (typeof av === 'string') return av.localeCompare(bv, 'ru') * sortDir;
    return (av - bv) * sortDir;
  });

  document.getElementById('filter-count').textContent = filtered.length + ' записей';
  document.getElementById('table-title').textContent = curMonth
    ? ({Янв:'Январь',Фев:'Февраль',Мар:'Март',Апр:'Апрель'}[curMonth] || curMonth)
    : 'Все отгрузки';

  renderAnalytics(filtered);
  renderTable();
  renderPagination();
  updateSortHeaders();
}

function renderTable() {
  var start = (page-1)*pageSize;
  var rows = filtered.slice(start, start+pageSize);
  var html = '';
  if (!rows.length) {
    html = '<tr><td colspan="10" style="padding:40px;text-align:center"><div class="empty-icon">📭</div>' +
      '<div class="empty-text">Ничего не найдено</div><div class="td-muted" style="margin-top:6px">Измените фильтры или поисковый запрос</div></td></tr>';
  } else {
    rows.forEach(function(r, idx) {
      var globalIdx = start + idx;
      html += '<tr onclick="openDetail('+globalIdx+')">' +
        '<td class="td-muted">' + (r[9]||'—') + '</td>' +
        '<td class="td-num" style="font-size:12px;color:var(--accent2)">' + (r[2]||'—') + '</td>' +
        '<td class="td-client">' + (r[3]||'—') + '</td>' +
        '<td class="td-product" title="' + (r[4]||'') + '">' + (r[4]||'—') + '</td>' +
        '<td style="text-align:right" class="td-muted">' + fmtNum(r[5]) + '</td>' +
        '<td style="text-align:right" class="td-num" style="font-size:12px">' + ((r[5]/1000).toFixed(2)) + '</td>' +
        '<td class="td-muted">' + (r[7]||'—') + '</td>' +
        '<td>' + statusBadge(r[8]) + '</td>' +
        '<td>' + typeIcon(r[16]) + '</td>' +
        '<td style="text-align:right" class="td-sum">' + fmtRub(r[15]) + '</td>' +
      '</tr>';
    });
  }
  document.getElementById('orders-tbody').innerHTML = html;
}

function renderPagination() {
  var total = filtered.length;
  var totalPages = Math.ceil(total/pageSize) || 1;
  var start = (page-1)*pageSize+1;
  var end = Math.min(page*pageSize, total);
  var html = '<span class="pag-info">Показано ' + start + '–' + end + ' из ' + total + '</span>';
  html += '<div class="pag-btns">';
  html += '<button class="pag-btn" onclick="goPage('+Math.max(1,page-1)+')" '+(page<=1?'disabled':'')+'>‹ Назад</button>';
  var fp = Math.max(1, page-2), lp = Math.min(totalPages, fp+4);
  for (var p = fp; p <= lp; p++) {
    html += '<button class="pag-btn'+(p===page?' active':'')+'" onclick="goPage('+p+')">'+p+'</button>';
  }
  html += '<button class="pag-btn" onclick="goPage('+Math.min(totalPages,page+1)+')" '+(page>=totalPages?'disabled':'')+'>Вперёд ›</button>';
  html += '</div>';
  document.getElementById('pagination').innerHTML = html;
}

function updateSortHeaders() {
  for (var i = 0; i <= 8; i++) {
    var el = document.getElementById('sh-'+i);
    if (el) el.textContent = (i===sortCol) ? (sortDir>0?' ↑':' ↓') : '';
    var th = el ? el.parentNode : null;
    if (th) th.classList.toggle('sorted', i===sortCol);
  }
}

function goPage(p) { page = p; renderTable(); renderPagination(); window.scrollTo(0,0); }

// ============ Filters ============
function setMonth(m) {
  curMonth = m;
  document.querySelectorAll('.tab').forEach(function(t) {
    t.classList.toggle('active', t.getAttribute('data-m') === m);
  });
  page = 1;
  render();
}

function applyFilters() {
  curSearch = document.getElementById('search-inp').value.trim();
  curStatus = document.getElementById('status-filter').value;
  curType   = document.getElementById('type-filter').value;
  page = 1;
  render();
}

// ============ Detail Drawer ============
function openDetail(idx) {
  var r = filtered[idx];
  if (!r) return;
  document.getElementById('dd-title').textContent = r[3] || '—';
  document.getElementById('dd-sub').textContent   = r[2] + ' · ' + (r[9]||'нет даты');
  var html = '';

  // Summary
  html += '<div class="detail-section">' +
    '<div class="detail-section-title">💰 Финансы</div>' +
    '<div class="detail-sum">' + fmtRubFull(r[15]) + '</div>' +
    '<div style="font-size:12px;color:var(--muted)">Цена: ' + (r[14] ? fmtNum(r[14]) + ' ₽/тн' : '—') + '</div>' +
    dRow('Кол-во, кг', fmtNum(r[5])) +
    dRow('Объём, тн', fmtTon(r[5])) +
    dRow('Ед. / мешков', fmtNum(r[6])) +
  '</div>';

  // Order info
  html += '<div class="detail-section">' +
    '<div class="detail-section-title">📋 Реквизиты заказа</div>' +
    dRow('Месяц', r[0]) +
    dRow('№ Заказа', r[2] || '—') +
    dRow('Партия/лот', r[13]||'—') +
    dRow('Акты', r[13] && r[13] !== '' ? (r[13] === '+' ? '✅ Подписаны' : r[13]) : '—') +
    dRow('Статус', r[8]||'—') +
    dRow('Пункт назначения', r[7]||'—') +
  '</div>';

  // Delivery
  html += '<div class="detail-section">' +
    '<div class="detail-section-title">🚛 Доставка</div>' +
    dRow('Вид доставки', typeIcon(r[16]) + ' ' + typeLabel(r[16])) +
    dRow('Транспорт', r[10]||'—') +
    dRow('Водитель', r[11]||'—') +
    dRow('Примечания', r[1]||'—') +
  '</div>';

  document.getElementById('dd-body').innerHTML = html;
  document.getElementById('detail-overlay').classList.add('open');
  document.getElementById('detail-drawer').classList.add('open');
}

function dRow(k, v) {
  return '<div class="detail-row"><span class="detail-key">'+k+'</span><span class="detail-val">'+v+'</span></div>';
}

function closeDetail() {
  document.getElementById('detail-overlay').classList.remove('open');
  document.getElementById('detail-drawer').classList.remove('open');
}

// ============ Export CSV ============
function exportCSV() {
  var headers = ['Месяц','Заказ №','Клиент','Продукт','Кг','Тонн','Ед.','Назначение','Статус','Дата','Транспорт','Водитель','Цена/тн','Сумма ₽','Вид'];
  var rows = [headers.join(';')];
  filtered.forEach(function(r) {
    rows.push([
      r[0], r[2], r[3], r[4], r[5], (r[5]/1000).toFixed(3), r[6],
      r[7], r[8], r[9], r[10], r[11], r[14], r[15], typeLabel(r[16])
    ].map(function(v){return '"'+(v+'').replace(/"/g,'""')+'"';}).join(';'));
  });
  var blob = new Blob(['\\uFEFF'+rows.join('\\n')], {type:'text/csv;charset=utf-8'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'orders_2026_' + (curMonth||'all') + '.csv';
  a.click();
  showToast('✅ CSV скачан · ' + filtered.length + ' строк');
}

// ============ Toast ============
function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 3000);
}

// ============ Sidebar badges ============
function updateNavBadges() {
  var counts = {Янв:0, Фев:0, Мар:0, Апр:0};
  OD.forEach(function(r){ counts[r[0]] = (counts[r[0]]||0)+1; });
  document.getElementById('nav-total').textContent = OD.length;
  document.getElementById('nav-jan').textContent = counts['Янв']||0;
  document.getElementById('nav-feb').textContent = counts['Фев']||0;
  document.getElementById('nav-mar').textContent = counts['Мар']||0;
  document.getElementById('nav-apr').textContent = counts['Апр']||0;
}

// ============ INIT ============
updateNavBadges();
render();
</script>
</body>
</html>`;

fs.writeFileSync('orders.html', html, {encoding:'utf8'});
console.log('orders.html written, size:', fs.statSync('orders.html').size, 'bytes');
