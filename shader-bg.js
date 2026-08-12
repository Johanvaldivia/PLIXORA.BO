// Floating Dots Shader — Canvas-based animated background
// Subtle floating dot grid with gentle oscillation
(function() {
    const canvas = document.getElementById('shader-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let time = 0;
    let dots = [];
    let lastW = 0;
    let lastH = 0;

    // Colors for light and dark mode
    function getColors() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            return {
                bg: '#000000',
                colors: [
                    [254, 91, 41],    // orange
                    [255, 126, 54],   // orange-light
                    [53, 92, 125],    // blue
                    [248, 177, 149],  // salmon
                    [16, 185, 129],   // green
                    [139, 92, 246],   // purple
                ]
            };
        }
        return {
            bg: '#f3f4f8',
            colors: [
                [254, 91, 41],    // orange
                [255, 126, 54],   // orange-light
                [53, 92, 125],    // blue
                [248, 177, 149],  // salmon
                [16, 185, 129],   // green
                [139, 92, 246],   // purple
            ]
        };
    }

    // Pseudo-random seeded by index for deterministic offsets
    function seededRandom(seed) {
        let x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
        return x - Math.floor(x);
    }

    // Build the dot grid based on current canvas dimensions
    function buildDots(w, h) {
        dots = [];
        const isMobile = window.innerWidth < 768;
        const spacing = isMobile ? 80 : 65;
        const cols = Math.ceil(w / spacing) + 1;
        const rows = Math.ceil(h / spacing) + 1;
        let idx = 0;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const seed = idx++;
                const r = seededRandom(seed);
                const r2 = seededRandom(seed + 1000);
                const r3 = seededRandom(seed + 2000);
                const r4 = seededRandom(seed + 3000);
                const r5 = seededRandom(seed + 4000);

                dots.push({
                    // Base grid position with random offset ±18px
                    baseX: col * spacing + (r - 0.5) * 36,
                    baseY: row * spacing + (r2 - 0.5) * 36,
                    // Oscillation parameters
                    ampX: 2 + r3 * 4,       // 2-6px horizontal drift
                    ampY: 2 + r4 * 4,       // 2-6px vertical drift
                    freqX: 0.3 + r3 * 0.5,  // varied frequencies
                    freqY: 0.3 + r4 * 0.5,
                    phase: r5 * Math.PI * 2, // random phase offset
                    // Visual properties
                    radius: 1.5 + r * 1.0,   // 1.5-2.5px
                    colorIdx: Math.floor(r2 * 6) % 6,
                    opacity: 0.04 + r5 * 0.06, // 0.04-0.10
                });
            }
        }
    }

    // Resize canvas to match container
    function resize() {
        const parent = canvas.parentElement;
        if (!parent) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = parent.clientWidth * dpr;
        canvas.height = parent.clientHeight * dpr;
        canvas.style.width = parent.clientWidth + 'px';
        canvas.style.height = parent.clientHeight + 'px';
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        const w = parent.clientWidth;
        const h = parent.clientHeight;

        // Rebuild dots only if dimensions changed meaningfully
        if (Math.abs(w - lastW) > 20 || Math.abs(h - lastH) > 20) {
            lastW = w;
            lastH = h;
            buildDots(w, h);
        }
    }

    // Draw floating dots
    function draw() {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        const { bg, colors } = getColors();

        // Clear with background
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // Si el dashboard está oculto (login activo), no dibujamos para ahorrar batería/CPU y evitar parpadeos
        const appContent = document.getElementById('app-content');
        if (appContent && appContent.style.display === 'none') {
            animId = null; // Detiene el bucle completamente
            return;
        }

        // Rebuild dots if needed (first draw or after resize)
        if (dots.length === 0) {
            buildDots(w, h);
        }

        const speed = 0.004;
        time += speed;

        // Draw each dot
        for (let i = 0; i < dots.length; i++) {
            const d = dots[i];
            const t = time + d.phase;

            // Gentle floating oscillation
            const x = d.baseX + Math.sin(t * d.freqX) * d.ampX;
            const y = d.baseY + Math.cos(t * d.freqY) * d.ampY;

            // Skip dots outside visible area (with margin)
            if (x < -10 || x > w + 10 || y < -10 || y > h + 10) continue;

            const c = colors[d.colorIdx];
            ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + d.opacity + ')';
            ctx.beginPath();
            ctx.arc(x, y, d.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Gradient overlay for smooth blending at top edge (40px to avoid dark line artifact)
        const gradTop = ctx.createLinearGradient(0, 0, 0, 40);
        gradTop.addColorStop(0, bg);
        gradTop.addColorStop(1, 'transparent');
        ctx.fillStyle = gradTop;
        ctx.fillRect(0, 0, w, 40);

        // Gradient overlay for smooth blending at bottom edge
        const gradBot = ctx.createLinearGradient(0, h - 60, 0, h);
        gradBot.addColorStop(0, 'transparent');
        gradBot.addColorStop(1, bg);
        ctx.fillStyle = gradBot;
        ctx.fillRect(0, h - 60, w, 60);

        if (window.innerWidth < 768) {
            animId = null; // En móviles no corre el bucle de animación, se dibuja estático una vez
            return;
        }

        animId = requestAnimationFrame(draw);
    }

    // Initialize
    resize();
    draw();

    // Handle resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            resize();
            const appContent = document.getElementById('app-content');
            if (window.innerWidth < 768 || (appContent && appContent.style.display === 'none')) {
                draw(); // Redibuja estático
            }
        }, 100);
    });

    // Watch for theme changes to update colors
    const observer = new MutationObserver(() => {
        const appContent = document.getElementById('app-content');
        if (window.innerWidth < 768 || (appContent && appContent.style.display === 'none') || !animId) {
            draw(); // Redibuja estático si no hay bucle activo
        }
    });
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });

    // Watch for app-content visibility to start the loop
    const appContent = document.getElementById('app-content');
    if (appContent) {
        const visibilityObserver = new MutationObserver(() => {
            if (appContent.style.display !== 'none' && !animId && window.innerWidth >= 768) {
                draw(); // Inicia el bucle de animación al iniciar sesión en desktop
            }
        });
        visibilityObserver.observe(appContent, {
            attributes: true,
            attributeFilter: ['style']
        });
    }
})();
