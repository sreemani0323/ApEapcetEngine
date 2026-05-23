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
