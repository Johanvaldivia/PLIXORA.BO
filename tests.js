// =============================================================
// PLIXORA.BO — Tests unitarios
// =============================================================

(function () {
    'use strict';

    let passed = 0;
    let failed = 0;

    function assert(condition, name) {
        if (condition) {
            passed++;
            console.log(`  ✅ ${name}`);
        } else {
            failed++;
            console.error(`  ❌ ${name}`);
        }
    }

    function assertEqual(actual, expected, name) {
        if (actual === expected) {
            passed++;
            console.log(`  ✅ ${name}`);
        } else {
            failed++;
            console.error(`  ❌ ${name} — esperado: ${JSON.stringify(expected)}, recibido: ${JSON.stringify(actual)}`);
        }
    }

    function runTests() {
        console.log('\n🧪 PLIXORA.BO — Tests\n');

        // ── BOLIVIA PHONE SANITIZER ──
        console.log('── Sanitize Bolivia Phone ──');
        if (typeof window.sanitizeBoliviaPhone === 'function') {
            const sanitize = window.sanitizeBoliviaPhone;
            assertEqual(sanitize('73651440'), '73651440', 'Número simple 8 dígitos');
            assertEqual(sanitize('+591 73651440'), '73651440', 'Con +591 y espacio');
            assertEqual(sanitize('59173651440'), '73651440', 'Con 591 sin +');
            assertEqual(sanitize('073651440'), '73651440', 'Con 0 al inicio');
            assertEqual(sanitize(''), '', 'Vacío');
        } else {
            console.log('  ⚠️  sanitizeBoliviaPhone no disponible');
        }

        // ── DATE FILTERING ──
        console.log('\n── Date Filtering ──');
        if (typeof window.filterSalesByPeriod === 'function') {
            const mockSales = [
                { date: new Date().toISOString(), price: 10 },
                { date: new Date(Date.now() - 86400000 * 5).toISOString(), price: 20 },
                { date: new Date(Date.now() - 86400000 * 20).toISOString(), price: 30 },
            ];
            const today = window.filterSalesByPeriod(mockSales, 'today');
            assert(today.length >= 1, 'Filtro "today" devuelve al menos 1 venta');
        } else {
            console.log('  ⚠️  filterSalesByPeriod no disponible');
        }

        // ── EXPIRATION DATE ──
        console.log('\n── Expiration Date ──');
        if (typeof window.calculateExpirationDate === 'function') {
            const calcExp = window.calculateExpirationDate;
            const exp1m = calcExp('1m');
            assert(exp1m instanceof Date && !isNaN(exp1m), 'calculateExpirationDate("1m") devuelve Date válido');

            const expUndefined = calcExp(undefined);
            assert(expUndefined instanceof Date && !isNaN(expUndefined), 'calculateExpirationDate(undefined) devuelve Date válido (fallback)');
        } else {
            console.log('  ⚠️  calculateExpirationDate no disponible');
        }

        // ── ORDER CODE ──
        console.log('\n── Order Code Format ──');
        if (typeof window.generateOrderCode === 'function') {
            const code = window.generateOrderCode();
            assert(typeof code === 'string' && code.length > 0, 'generateOrderCode devuelve string no vacío');
            assert(code.startsWith('PLX-'), 'generateOrderCode empieza con PLX-');
        } else {
            console.log('  ⚠️  generateOrderCode no disponible');
        }

        // ── THEME ──
        console.log('\n── Theme ──');
        if (typeof window.getSavedTheme === 'function') {
            const theme = window.getSavedTheme();
            assert(theme === 'light' || theme === 'dark', 'getSavedTheme devuelve "light" o "dark"');
        } else {
            console.log('  ⚠️  getSavedTheme no disponible');
        }

        // ── TOTAL ──
        console.log(`\n📊 Resultados: ${passed} pasaron, ${failed} fallaron, ${passed + failed} total\n`);

        const el = document.getElementById('test-results');
        if (el) {
            el.textContent = `${passed}/${passed + failed} tests pasaron`;
            el.style.color = failed === 0 ? '#10b981' : '#ef4444';
        }
    }

    // Run when DOM is ready and core scripts are loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(runTests, 1500));
    } else {
        setTimeout(runTests, 1500);
    }

    window.runPlixoraTests = runTests;
})();
