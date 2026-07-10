// =============================================================
// PLIXORA.BO — Analytics Module
// Uses Chart.js to render sales analytics
// =============================================================

(function () {
    'use strict';

    // State
    let charts = [];
    let currentMonthStr = ''; // Format "YYYY-MM"

    // Colors
    const colors = {
        orange: '#FE5B29',
        blue: '#3b82f6',
        green: '#10b981',
        purple: '#8b5cf6',
        red: '#ef4444',
        yellow: '#f59e0b',
        pink: '#ec4899',
        teal: '#14b8a6',
        bgCard: 'rgba(255, 255, 255, 1)',
        textMain: '#1a1a2e',
        textMuted: '#7a7a9d',
        gridLines: 'rgba(26,26,46,0.08)'
    };

    // Helper: update colors based on theme
    function updateColorsForTheme() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            colors.bgCard = '#0a0a0a';
            colors.textMain = '#f5f5f5';
            colors.textMuted = '#a3a3a3';
            colors.gridLines = 'rgba(255,255,255,0.08)';
            Chart.defaults.color = colors.textMuted;
            Chart.defaults.scale.grid.color = colors.gridLines;
        } else {
            colors.bgCard = '#ffffff';
            colors.textMain = '#1a1a2e';
            colors.textMuted = '#7a7a9d';
            colors.gridLines = 'rgba(26,26,46,0.08)';
            Chart.defaults.color = colors.textMuted;
            Chart.defaults.scale.grid.color = colors.gridLines;
        }
    }

    // Chart.js global defaults
    if (typeof Chart !== 'undefined') {
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.responsive = true;
        Chart.defaults.maintainAspectRatio = false;
        Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(17, 24, 39, 0.9)';
        Chart.defaults.plugins.tooltip.titleColor = '#fff';
        Chart.defaults.plugins.tooltip.bodyColor = '#fff';
        Chart.defaults.plugins.tooltip.padding = 10;
        Chart.defaults.plugins.tooltip.cornerRadius = 8;
        Chart.defaults.plugins.legend.labels.usePointStyle = true;
    }

    // Export global render function
    window.renderAnalytics = renderAll;

    // Initialize module
    function init() {
        setupMonthSelector();
    }

    function setupMonthSelector() {
        const select = document.getElementById('an-month-select');
        if (!select) return;

        // Populate select with months that have sales
        const months = new Set();
        const allSales = (typeof sales !== 'undefined' ? sales : []);
        allSales.forEach(s => {
            if (s.date) {
                const date = new Date(s.date);
                if (!isNaN(date)) {
                    months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
                }
            }
        });

        // Add current month if not present
        const now = new Date();
        const currentM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        months.add(currentM);

        // Sort descending
        const sortedMonths = Array.from(months).sort().reverse();
        
        // Only update DOM if the options changed to avoid losing focus/flicker
        const newOptionsStr = sortedMonths.join(',');
        if (select.dataset.loadedMonths === newOptionsStr) {
            return;
        }
        select.dataset.loadedMonths = newOptionsStr;
        
        select.innerHTML = '';
        sortedMonths.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            
            // Format for display (e.g., "Junio 2026")
            const [yyyy, mm] = m.split('-');
            const dateObj = new Date(parseInt(yyyy), parseInt(mm) - 1, 1);
            opt.textContent = dateObj.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            // Capitalize first letter
            opt.textContent = opt.textContent.charAt(0).toUpperCase() + opt.textContent.slice(1);
            
            select.appendChild(opt);
        });

        // Set initial value
        if (!currentMonthStr || !sortedMonths.includes(currentMonthStr)) {
            currentMonthStr = sortedMonths[0];
        }
        select.value = currentMonthStr;

        // Remove old listener to avoid duplicates
        const newSelect = select.cloneNode(true);
        select.parentNode.replaceChild(newSelect, select);
        newSelect.addEventListener('change', (e) => {
            currentMonthStr = e.target.value;
            renderAll();
        });
    }

    // Main render function
    function renderAll() {
        if (typeof Chart === 'undefined') {
            setTimeout(renderAll, 100); // Wait for Chart.js to load
            return;
        }

        setupMonthSelector();

        updateColorsForTheme();
        destroyCharts();

        const allSales = typeof sales !== 'undefined' ? sales : [];
        
        // Filter sales for selected month
        const [targetYear, targetMonth] = currentMonthStr.split('-').map(Number);
        
        const monthSales = allSales.filter(s => {
            if (!s.date) return false;
            const d = new Date(s.date);
            return d.getFullYear() === targetYear && (d.getMonth() + 1) === targetMonth;
        });

        renderSummary(monthSales);
        renderDailySales(monthSales, targetYear, targetMonth);
        renderTopProducts(monthSales);
        renderWeeklyRevenue(monthSales, targetYear, targetMonth);
        renderTrend(allSales);
        renderTopClients(monthSales);
        renderBestDay(monthSales);
    }

    function destroyCharts() {
        charts.forEach(c => c.destroy());
        charts = [];
    }

    // ── 1. SUMMARY CARDS ──────────────────────────────────────────
    function renderSummary(sales) {
        const totalSales = sales.length;
        const totalRevenue = sales.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
        const totalProfit = sales.reduce((sum, s) => sum + (parseFloat(s.profit) || 0), 0);
        const avgSale = totalSales > 0 ? (totalRevenue / totalSales) : 0;

        document.getElementById('an-total-sales').textContent = totalSales;
        document.getElementById('an-total-revenue').textContent = totalRevenue.toFixed(2);
        document.getElementById('an-total-profit').textContent = totalProfit.toFixed(2);
        document.getElementById('an-avg-sale').textContent = avgSale.toFixed(2) + ' Bs';
    }

    // ── 2. DAILY SALES CHART ──────────────────────────────────────
    function renderDailySales(sales, year, month) {
        const canvas = document.getElementById('chart-daily');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Get days in month
        const daysInMonth = new Date(year, month, 0).getDate();
        
        // Initialize counts
        const dailyCounts = Array(daysInMonth).fill(0);
        
        sales.forEach(s => {
            const d = new Date(s.date);
            const day = d.getDate();
            if (day >= 1 && day <= daysInMonth) {
                dailyCounts[day - 1]++;
            }
        });

        const labels = Array.from({length: daysInMonth}, (_, i) => i + 1);

        // Gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(254, 91, 41, 0.4)');
        gradient.addColorStop(1, 'rgba(254, 91, 41, 0.0)');

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ventas',
                    data: dailyCounts,
                    borderColor: colors.orange,
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointBackgroundColor: colors.orange,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4 // Smooth curve
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
        charts.push(chart);
    }

    // ── 3. TOP PRODUCTS DOUGHNUT ──────────────────────────────────
    function renderTopProducts(sales) {
        const canvas = document.getElementById('chart-products');
        if (!canvas) return;

        const productCounts = {};
        sales.forEach(s => {
            const name = s.productName || 'Desconocido';
            productCounts[name] = (productCounts[name] || 0) + 1;
        });

        // Sort and get top 5
        const sortedProducts = Object.entries(productCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const labels = sortedProducts.map(p => p[0]);
        const data = sortedProducts.map(p => p[1]);

        // If no data
        if (data.length === 0) {
            labels.push('Sin ventas');
            data.push(1);
        }

        const chart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [colors.orange, colors.blue, colors.purple, colors.teal, colors.yellow],
                    borderWidth: 2,
                    borderColor: colors.bgCard,
                    hoverOffset: 4
                }]
            },
            options: {
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 20 }
                    }
                }
            }
        });
        charts.push(chart);
    }

    // ── 4. WEEKLY REVENUE BAR ─────────────────────────────────────
    function renderWeeklyRevenue(sales, year, month) {
        const canvas = document.getElementById('chart-weekly');
        if (!canvas) return;

        const weeks = [0, 0, 0, 0, 0]; // Assume max 5 weeks
        
        sales.forEach(s => {
            const d = new Date(s.date);
            const date = d.getDate();
            const weekIdx = Math.floor((date - 1) / 7);
            if (weekIdx < 5) {
                weeks[weekIdx] += (parseFloat(s.price) || 0);
            }
        });

        const labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5'];

        const chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ingresos (Bs)',
                    data: weeks,
                    backgroundColor: colors.blue,
                    borderRadius: 6,
                    barPercentage: 0.6
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true }
                }
            }
        });
        charts.push(chart);
    }

    // ── 5. MONTHLY TREND (LAST 6 MONTHS) ──────────────────────────
    function renderTrend(allSales) {
        const canvas = document.getElementById('chart-trend');
        if (!canvas) return;

        const now = new Date();
        const labels = [];
        const data = [];

        // Generate last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = d.toLocaleDateString('es-ES', { month: 'short' });
            labels.push(monthName.charAt(0).toUpperCase() + monthName.slice(1));

            // Count sales for this month
            const count = allSales.filter(s => {
                if (!s.date) return false;
                const sd = new Date(s.date);
                return sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth();
            }).length;
            
            data.push(count);
        }

        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.4)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

        const chart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Ventas',
                    data: data,
                    borderColor: colors.purple,
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointBackgroundColor: colors.purple,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
        charts.push(chart);
    }

    // ── 6. TOP CLIENTS ────────────────────────────────────────────
    function renderTopClients(sales) {
        const container = document.getElementById('an-top-clients');
        if (!container) return;

        const clients = {};
        sales.forEach(s => {
            const num = s.customer || 'Desconocido';
            const name = s.customerName || num;
            if (!clients[num]) {
                clients[num] = { name: name, count: 0, spent: 0 };
            }
            clients[num].count++;
            clients[num].spent += (parseFloat(s.price) || 0);
        });

        const sortedClients = Object.values(clients)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        if (sortedClients.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;text-align:center;padding:1rem;">No hay clientes este mes</p>';
            return;
        }

        let html = '<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:0.75rem;">';
        sortedClients.forEach((c, idx) => {
            const badgeColor = idx === 0 ? '#FE5B29' : idx === 1 ? '#f59e0b' : idx === 2 ? '#3b82f6' : '#9ca3af';
            html += `
                <li style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem;background:var(--bg-main);border-radius:12px;">
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                        <span style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${badgeColor};color:#fff;font-size:0.7rem;font-weight:bold;">${idx + 1}</span>
                        <div style="display:flex;flex-direction:column;">
                            <span style="font-weight:600;font-size:0.9rem;color:var(--text-main);">${c.name}</span>
                            <span style="font-size:0.75rem;color:var(--text-muted);">${c.count} compras</span>
                        </div>
                    </div>
                    <span style="font-weight:700;color:var(--text-main);font-size:0.9rem;">${c.spent.toFixed(2)} Bs</span>
                </li>
            `;
        });
        html += '</ul>';
        container.innerHTML = html;
    }

    // ── 7. BEST DAY ───────────────────────────────────────────────
    function renderBestDay(sales) {
        const container = document.getElementById('an-best-day');
        if (!container) return;

        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const dayCounts = [0, 0, 0, 0, 0, 0, 0];

        sales.forEach(s => {
            if (!s.date) return;
            const d = new Date(s.date);
            dayCounts[d.getDay()]++;
        });

        let bestIdx = 0;
        let maxVal = 0;
        dayCounts.forEach((count, idx) => {
            if (count > maxVal) {
                maxVal = count;
                bestIdx = idx;
            }
        });

        if (maxVal === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;text-align:center;padding:1rem;">Aún no hay datos</p>';
            return;
        }

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:1rem;text-align:center;">
                <span style="font-size:3rem;margin-bottom:0.5rem;">🔥</span>
                <span style="font-size:1.5rem;font-weight:800;color:var(--text-main);">${days[bestIdx]}</span>
                <span style="color:var(--text-muted);font-size:0.9rem;margin-top:0.5rem;">Con un total de <strong>${maxVal}</strong> ventas este mes</span>
            </div>
        `;
    }

    // Run init when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
