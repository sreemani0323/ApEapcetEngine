/**
 * nav-drawer.js — Shared mobile navigation drawer logic.
 * Include this script in every page BEFORE the page-specific JS.
 *
 * Handles:
 *  - Hamburger ↔ close icon toggle
 *  - Slide-in drawer with backdrop overlay
 *  - Body scroll lock when open
 *  - Relocating header controls (refresh + dark toggle) into drawer on mobile
 *  - Close on backdrop click, Escape key, or nav-link click
 */
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        var navToggle = document.querySelector('.nav-toggle');
        var mainNav = document.querySelector('.main-nav');
        if (!navToggle || !mainNav) return;

        // ── Create backdrop ──
        var backdrop = document.querySelector('.nav-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'nav-backdrop';
            document.body.appendChild(backdrop);
        }

        // ── Relocate header-controls into drawer on mobile ──
        (function relocateControls() {
            var headerControls = document.querySelector('.header-controls');
            if (!headerControls) return;
            var mql = window.matchMedia('(max-width: 968px)');
            var drawerControls = null;

            function moveIn() {
                if (drawerControls) return;
                drawerControls = document.createElement('div');
                drawerControls.className = 'nav-drawer-controls';

                // Clone refresh button
                var refreshBtn = headerControls.querySelector('#refreshBtn');
                if (refreshBtn) {
                    var cloned = refreshBtn.cloneNode(true);
                    cloned.id = 'refreshBtnDrawer';
                    cloned.addEventListener('click', function () { location.reload(); });
                    drawerControls.appendChild(cloned);
                }

                // Clone dark mode toggle
                var darkToggle = headerControls.querySelector('.dark-mode-toggle');
                if (darkToggle) {
                    var clonedToggle = darkToggle.cloneNode(true);
                    var origCb = darkToggle.querySelector('input');
                    var clonedCb = clonedToggle.querySelector('input');
                    if (origCb && clonedCb) {
                        clonedCb.checked = origCb.checked;
                        clonedCb.addEventListener('change', function () {
                            origCb.checked = clonedCb.checked;
                            origCb.dispatchEvent(new Event('change'));
                        });
                        origCb.addEventListener('change', function () {
                            clonedCb.checked = origCb.checked;
                        });
                    }
                    drawerControls.appendChild(clonedToggle);
                }
                mainNav.appendChild(drawerControls);
            }

            function moveOut() {
                if (drawerControls) { drawerControls.remove(); drawerControls = null; }
            }

            function handleChange(e) { e.matches ? moveIn() : moveOut(); }
            if (mql.matches) moveIn();
            mql.addEventListener('change', handleChange);
        })();

        // ── Open / Close helpers ──
        function openNav() {
            mainNav.classList.add('active');
            navToggle.classList.add('is-open');
            backdrop.classList.add('visible');
            document.body.style.overflow = 'hidden';
        }

        function closeNav() {
            mainNav.classList.remove('active');
            navToggle.classList.remove('is-open');
            backdrop.classList.remove('visible');
            document.body.style.overflow = '';
        }

        // ── Event listeners ──
        navToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            mainNav.classList.contains('active') ? closeNav() : openNav();
        });

        backdrop.addEventListener('click', closeNav);

        mainNav.querySelectorAll('.nav-link').forEach(function (link) {
            link.addEventListener('click', closeNav);
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && mainNav.classList.contains('active')) closeNav();
        });
    });
})();

// Global showSmartSpinner helper for all pages/tabs
window.showSmartSpinner = function (show, options = {}) {
    let spinner = document.getElementById('loadingSpinner') || document.getElementById('loading');
    
    if (!show) {
        if (spinner) {
            if (spinner._timeouts) {
                spinner._timeouts.forEach(clearTimeout);
                spinner._timeouts = [];
            }
            if (spinner._errorTimeout) {
                clearTimeout(spinner._errorTimeout);
                spinner._errorTimeout = null;
            }
            
            const statusText = spinner.querySelector('.loader-status-text');
            const statusBar = spinner.querySelector('.loader-status-fill');
            if (statusBar) statusBar.style.width = '100%';
            if (statusText) statusText.textContent = 'Done! \u2714';
            
            setTimeout(() => {
                spinner.style.display = 'none';
                const container = spinner.querySelector('.lottie-container') || spinner.querySelector('#lottieContainer');
                if (container) container.innerHTML = '';
            }, 300);
        }
        return;
    }

    // Create if not exists
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.id = 'loadingSpinner';
        spinner.className = 'smart-loader-overlay';
        spinner.style.cssText = 'display:none; position:fixed; inset:0; z-index:9999; background:rgba(8,8,20,0.78); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); align-items:center; justify-content:center;';
        document.body.appendChild(spinner);
    }

    // Standardize loader box HTML
    spinner.innerHTML = `
        <div class="smart-loader-box"
             style="background:var(--surface,#fff); border-radius:16px;
                    box-shadow:0 8px 40px rgba(67,97,238,0.25),0 2px 8px rgba(0,0,0,0.15);
                    padding:2rem 2.5rem 1.75rem;
                    display:flex; flex-direction:column; align-items:center;
                    gap:0.85rem; max-width:320px; width:calc(100% - 2.5rem);
                    text-align:center; border:var(--border);">

            <div class="lottie-container" id="lottieContainer" style="width:150px;height:150px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
                <!-- lottie-player will be appended here dynamically -->
            </div>

            <p class="loader-status-text"
               style="margin:0;font-weight:600;line-height:1.4;
                      font-size:0.95rem;min-height:1.3em;
                      transition:opacity 0.3s ease; color:var(--text);">Loading...</p>

            <div class="loader-status-bar"
                 style="height:4px;width:100%;border-radius:99px;
                        background:rgba(128,128,128,0.2);overflow:hidden;">
                <div class="loader-status-fill"
                     style="height:100%;width:0%;border-radius:99px;
                            background:linear-gradient(90deg,#4361ee,#818cf8);
                            transition:width 1s cubic-bezier(0.4,0,0.2,1);"></div>
            </div>
        </div>
    `;

    spinner.style.display = 'flex';

    // Append Lottie player ONLY after display is flex
    const lottieContainer = spinner.querySelector('.lottie-container');
    if (lottieContainer) {
        lottieContainer.innerHTML = `
            <lottie-player
                src="searching.json"
                background="transparent"
                speed="1"
                loop autoplay
                style="width:150px;height:150px;flex-shrink:0;">
            </lottie-player>
        `;
    }

    // Build messages based on type
    const type = options.type || 'predict';
    const rank = options.rank;
    const branchHint = options.branchHint;
    
    let msgs = [];
    if (type === 'predict') {
        const rankStr = rank ? `rank ${rank.toLocaleString('en-IN')}` : 'your profile';
        const branchStr = branchHint ? `${branchHint} colleges` : 'colleges';
        msgs = [
            { pct: 5,  text: `Scanning ${branchStr} matching ${rankStr}...` },
            { pct: 28, text: `Cross-checking branch cutoffs across AP districts...` },
            { pct: 52, text: `Pulling latest allotment data — almost sorted...` },
            { pct: 74, text: `Running predictions through the model...` },
            { pct: 90, text: `Final check on college rankings — nearly done...` },
            { pct: 96, text: `Wrapping up results just for you...` }
        ];
    } else if (type === 'analytics') {
        msgs = [
            { pct: 5,  text: `Connecting to analytics engine...` },
            { pct: 25, text: `Compiling college distribution statistics...` },
            { pct: 50, text: `Aggregating district seat cutoffs...` },
            { pct: 75, text: `Generating interactive comparison charts...` },
            { pct: 95, text: `Finalizing dashboard layout...` }
        ];
    } else if (type === 'map') {
        msgs = [
            { pct: 5,  text: `Initializing geographical maps...` },
            { pct: 25, text: `Locating colleges across AP districts...` },
            { pct: 50, text: `Plotting cutoff clusters...` },
            { pct: 75, text: `Generating heatmap overlays...` },
            { pct: 95, text: `Finalizing interactive markers...` }
        ];
    } else if (type === 'calculator') {
        msgs = [
            { pct: 5,  text: `Initializing rank calculator...` },
            { pct: 25, text: `Analyzing historical cutoff trends...` },
            { pct: 50, text: `Processing cutoff prediction algorithms...` },
            { pct: 75, text: `Mapping potential admission chances...` },
            { pct: 95, text: `Formatting rank report...` }
        ];
    } else if (type === 'branch-comparison') {
        msgs = [
            { pct: 5,  text: `Loading branch comparison matrices...` },
            { pct: 25, text: `Analyzing competitive cutoffs by branch...` },
            { pct: 50, text: `Aggregating seat trends...` },
            { pct: 75, text: `Calculating differential branch indexes...` },
            { pct: 95, text: `Formatting comparison charts...` }
        ];
    } else if (type === 'college') {
        msgs = [
            { pct: 5,  text: `Fetching college profile information...` },
            { pct: 25, text: `Analyzing historic branch intakes...` },
            { pct: 50, text: `Compiling gender and category cutoff limits...` },
            { pct: 75, text: `Generating seat occupancy trends...` },
            { pct: 95, text: `Finalizing college scorecard...` }
        ];
    }

    const statusText = spinner.querySelector('.loader-status-text');
    const statusBar = spinner.querySelector('.loader-status-fill');

    if (statusText && msgs[0]) statusText.textContent = msgs[0].text;
    if (statusBar && msgs[0]) {
        setTimeout(() => { statusBar.style.width = msgs[0].pct + '%'; }, 80);
    }

    const delays = [4000, 10000, 20000, 30000, 42000];
    const timeouts = [];
    delays.forEach((delay, i) => {
        const phaseIdx = i + 1;
        if (phaseIdx >= msgs.length) return;
        const t = setTimeout(() => {
            const m = msgs[phaseIdx];
            if (statusText) {
                statusText.style.opacity = '0';
                setTimeout(() => {
                    if (statusText) statusText.textContent = m.text;
                    statusText.style.opacity = '1';
                }, 200);
            }
            if (statusBar) statusBar.style.width = m.pct + '%';
        }, delay);
        timeouts.push(t);
    });
    spinner._timeouts = timeouts;

    // After 90s with no response — switch to 404 error animation
    spinner._errorTimeout = setTimeout(() => {
        if (lottieContainer) {
            lottieContainer.innerHTML = `
                <lottie-player
                    src="404error.json"
                    background="transparent"
                    speed="1"
                    loop autoplay
                    style="width:150px;height:150px;flex-shrink:0;">
                </lottie-player>
            `;
        }
        if (statusText) {
            statusText.style.opacity = '0';
            setTimeout(() => {
                if (statusText) {
                    statusText.textContent = 'Could not connect. Please check your network and try again.';
                    statusText.style.opacity = '1';
                    statusText.style.color = '#ef4444';
                }
                if (statusBar) statusBar.style.width = '0%';
            }, 250);
        }
        if (spinner._timeouts) {
            spinner._timeouts.forEach(clearTimeout);
            spinner._timeouts = [];
        }
    }, 90000);
};

