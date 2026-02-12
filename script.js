/* ===========================
   Dashboard Interactivity JS
   =========================== */

(() => {
  // --- Helpers ---
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const formatMoney = (n) =>
    "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const formatPct = (n) => (n >= 0 ? "+" : "") + n.toFixed(1) + "%";

  // --- Elements ---
  const app = $("#app");
  const scrim = $("#scrim");
  const sidebarToggle = $("#sidebarToggle");
  const themeToggle = $("#themeToggle");
  const refreshBtn = $("#refreshBtn");
  const searchInput = $("#searchInput");

  const tableBody = $("#tableBody");
  const sortAmountBtn = $("#sortAmount"); // optional
  const sortDateBtn = $("#sortDate");     // optional
  const sortIndAmount = $("#sortIndAmount"); // optional
  const sortIndDate = $("#sortIndDate");     // optional

  // KPI elements (IDs you can match to your HTML)
  const kpi = {
    revValue: $("#revValue"),
    revDelta: $("#revDelta"),
    revTrend: $("#revTrend"),
    ordValue: $("#ordValue"),
    ordDelta: $("#ordDelta"),
    ordTrend: $("#ordTrend"),
    usrValue: $("#usrValue"),
    usrDelta: $("#usrDelta"),
    usrTrend: $("#usrTrend"),
    cnvValue: $("#cnvValue"),
    cnvDelta: $("#cnvDelta"),
    cnvTrend: $("#cnvTrend"),
  };

  // --- Data (example orders; replace with your own) ---
  let orders = [
    { order:"#A-1024", user:"Mina K.",   product:"Wireless Mouse",      date:"2026-02-02", amount:29.99,  status:"Paid" },
    { order:"#A-1025", user:"Jordan S.", product:"Laptop Stand",        date:"2026-02-03", amount:49.00,  status:"Paid" },
    { order:"#A-1026", user:"Somsri P.", product:"Mechanical Keyboard", date:"2026-02-04", amount:89.50,  status:"Pending" },
    { order:"#A-1027", user:"Nate R.",   product:"USB-C Hub",           date:"2026-02-05", amount:35.25,  status:"Paid" },
    { order:"#A-1028", user:"Arisa T.",  product:"Noise Cancelling HP", date:"2026-02-06", amount:199.99, status:"Failed" },
    { order:"#A-1029", user:"Ken W.",    product:"Webcam 1080p",        date:"2026-02-07", amount:59.90,  status:"Paid" },
  ];

  // --- Sidebar: collapse (desktop/tablet) + off-canvas (mobile) ---
  function isMobile() {
    return window.matchMedia("(max-width: 640px)").matches;
  }

  function openOffcanvas() {
    app?.classList.add("offcanvas-open");
    scrim?.classList.add("show,show".split(",")[0]); // safe if your CSS uses .show
    scrim?.classList.add("show");
  }

  function closeOffcanvas() {
    app?.classList.remove("offcanvas-open");
    scrim?.classList.remove("show");
  }

  function toggleSidebar() {
    if (!app) return;

    if (isMobile()) {
      // Mobile: off-canvas slide in/out
      app.classList.contains("offcanvas-open") ? closeOffcanvas() : openOffcanvas();
    } else {
      // Desktop/Tablet: collapsed sidebar
      app.classList.toggle("sidebar-collapsed");
    }
  }

  sidebarToggle?.addEventListener("click", toggleSidebar);
  scrim?.addEventListener("click", closeOffcanvas);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeOffcanvas();
  });
  window.addEventListener("resize", () => {
    if (!isMobile()) closeOffcanvas();
  });

  // --- Theme switch (persist in localStorage) ---
  const THEME_KEY = "dashboard_theme";

  function applyTheme(theme) {
    if (!app) return;
    app.setAttribute("data-theme", theme);
    // optional: update icon/text if your button includes it
    // const icon = theme === "light" ? "☀️" : "🌓";
    // themeToggle?.querySelector("span")?.textContent = icon;
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const theme = saved === "light" || saved === "dark" ? saved : "light";
    applyTheme(theme);
  }

  themeToggle?.addEventListener("click", () => {
    const current = app?.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });

  // --- Table rendering + Search filter ---
  function renderTable() {
    if (!tableBody) return;

    const q = (searchInput?.value || "").trim().toLowerCase();

    // filter by keyword across order/user/product
    const filtered = orders.filter((r) => {
      const hay = `${r.order} ${r.user} ${r.product}`.toLowerCase();
      return hay.includes(q);
    });

    tableBody.innerHTML = "";
    for (const r of filtered) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.order}</td>
        <td>${r.user}</td>
        <td>${r.product}</td>
        <td>${r.date}</td>
        <td>${formatMoney(r.amount)}</td>
        <td>${r.status}</td>
      `;
      tableBody.appendChild(tr);
    }
  }

  searchInput?.addEventListener("input", renderTable);

  // --- Sorting: Amount (number) and/or Date (YYYY-MM-DD) ---
  let sortAmountAsc = true;
  let sortDateAsc = true;

  function setIndicator(indEl, asc) {
    if (!indEl) return;
    indEl.textContent = asc ? "↑" : "↓";
  }

  sortAmountBtn?.addEventListener("click", () => {
    sortAmountAsc = !sortAmountAsc;
    orders.sort((a, b) => (sortAmountAsc ? a.amount - b.amount : b.amount - a.amount));
    setIndicator(sortIndAmount, sortAmountAsc);
    // reset the other indicator if you want:
    if (sortIndDate) sortIndDate.textContent = "↕";
    renderTable();
  });

  sortDateBtn?.addEventListener("click", () => {
    sortDateAsc = !sortDateAsc;
    orders.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sortDateAsc ? da - db : db - da;
    });
    setIndicator(sortIndDate, sortDateAsc);
    if (sortIndAmount) sortIndAmount.textContent = "↕";
    renderTable();
  });

  // --- KPI update (every 5s) + Refresh button ---
  function setTrend(deltaEl, trendEl, delta) {
    if (!deltaEl || !trendEl) return;
    deltaEl.textContent = formatPct(delta);
    const up = delta >= 0;
    trendEl.textContent = up ? "▲" : "▼";
    trendEl.classList.toggle("up", up);
    trendEl.classList.toggle("down", !up);
  }

  function generateKpis() {
    const revenue = rand(42000, 98000);
    const ordersCount = randInt(320, 820);
    const users = randInt(1800, 5200);
    const conversion = rand(1.2, 4.8);

    const revDelta = rand(-6.0, 12.0);
    const ordDelta = rand(-4.0, 10.0);
    const usrDelta = rand(-3.0, 9.0);
    const cnvDelta = rand(-2.5, 2.5);

    if (kpi.revValue) kpi.revValue.textContent = formatMoney(revenue);
    if (kpi.ordValue) kpi.ordValue.textContent = String(ordersCount);
    if (kpi.usrValue) kpi.usrValue.textContent = String(users).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (kpi.cnvValue) kpi.cnvValue.textContent = conversion.toFixed(1) + "%";

    setTrend(kpi.revDelta, kpi.revTrend, revDelta);
    setTrend(kpi.ordDelta, kpi.ordTrend, ordDelta);
    setTrend(kpi.usrDelta, kpi.usrTrend, usrDelta);
    setTrend(kpi.cnvDelta, kpi.cnvTrend, cnvDelta);
  }

  function refreshAll() {
    generateKpis();
    // If you have a chart, call drawChart() here too
    // drawChart();
  }

  refreshBtn?.addEventListener("click", refreshAll);

  // Auto-refresh KPIs every 5 seconds
  setInterval(refreshAll, 5000);

  // --- Init ---
  initTheme();
  renderTable();
  refreshAll();
})();