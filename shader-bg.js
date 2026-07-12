// Lines Gradient Shader — Canvas-based animated background
// Inspired by Aceternity UI's Lines Gradient Shader
(function() {
    const canvas = document.getElementById('shader-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let time = 0;

    // Colors for light and dark mode
    function getColors() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            return {
                bg: '#000000',
                colors: [
                    'rgba(254, 91, 41, 0.15)',   // orange
                    'rgba(255, 126, 54, 0.12)',   // orange-light
                    'rgba(53, 92, 125, 0.18)',    // blue
                    'rgba(248, 177, 149, 0.10)',  // salmon
                    'rgba(16, 185, 129, 0.08)',   // green
                    'rgba(139, 92, 246, 0.10)',   // purple
                ]
            };
        }
        return {
            bg: '#f3f4f8',
            colors: [
                'rgba(254, 91, 41, 0.12)',    // orange
                'rgba(255, 126, 54, 0.10)',   // orange-light
                'rgba(53, 92, 125, 0.14)',    // blue
                'rgba(248, 177, 149, 0.10)',  // salmon
                'rgba(16, 185, 129, 0.07)',   // green
                'rgba(139, 92, 246, 0.08)',   // purple
            ]
        };
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
        ctx.scale(dpr, dpr);
    }

    // Draw flowing gradient lines
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

        const lineCount = window.innerWidth < 768 ? 12 : 18;
        const speed = 0.003;
        time += speed;

        for (let i = 0; i < lineCount; i++) {
            const colorIdx = i % colors.length;
            ctx.strokeStyle = colors[colorIdx];
            ctx.lineWidth = 1.5 + Math.sin(time + i * 0.5) * 0.8;

            ctx.beginPath();

            const baseY = (h / (lineCount + 1)) * (i + 1);
            const amplitude = 15 + Math.sin(time * 0.7 + i * 0.3) * 10;
            const frequency = 0.003 + Math.sin(time * 0.2 + i * 0.1) * 0.001;
            const phaseOffset = i * 0.8 + time * (0.5 + i * 0.05);

            for (let x = 0; x <= w; x += 6) {
                const wave1 = Math.sin(x * frequency + phaseOffset) * amplitude;
                const wave2 = Math.sin(x * frequency * 1.8 + phaseOffset * 0.7 + time) * (amplitude * 0.4);
                const wave3 = Math.cos(x * frequency * 0.5 + phaseOffset * 1.3) * (amplitude * 0.2);
                const y = baseY + wave1 + wave2 + wave3;

                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }

        // Gradient overlay for smooth blending at edges
        const gradTop = ctx.createLinearGradient(0, 0, 0, 80);
        gradTop.addColorStop(0, bg);
        gradTop.addColorStop(1, 'transparent');
        ctx.fillStyle = gradTop;
        ctx.fillRect(0, 0, w, 80);

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
            if (window.innerWidth < 768 || (appContent && appContent.style.display === 'none')) {
                draw(); // Redibuja estático
            }
        }, 100);
    });

    // Watch for theme changes to update colors
    const observer = new MutationObserver(() => {
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
