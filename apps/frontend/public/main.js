/**
 * Main JavaScript file for the College Predictor frontend application.
 * Contains the core functionality for the college prediction interface,
 * including form handling, API communication, result rendering, and UI interactions.
 * 
 * This file handles:
 * - DOM initialization and event binding
 * - Form submission and validation
 * - API communication with the backend
 * - Result processing and display
 * - Multiselect dropdown functionality
 * - Theme management (light/dark mode)
 * - Comparison features
 * - Sorting and filtering of results
 */

document.addEventListener("DOMContentLoaded", function () {

    /**
     * Toggles the mobile navigation menu visibility.
     */
    const navToggle = document.querySelector('.nav-toggle');
    const mainNav = document.querySelector('.main-nav');
    
    if (navToggle && mainNav) {
        navToggle.addEventListener('click', function() {
            mainNav.classList.toggle('active');
        });

        document.addEventListener('click', function(event) {
            if (!mainNav.contains(event.target) && !navToggle.contains(event.target)) {
                mainNav.classList.remove('active');
            }
        });
    }

    // ═══════════════════════════════════════════════════
    // SPLASH INTRO — Letter-by-letter reveal, auto-dismiss
    // ═══════════════════════════════════════════════════
    (function initSplash() {
        const splashOverlay = document.getElementById('splashOverlay');
        const splashTitle = document.getElementById('splashTitle');
        if (!splashOverlay || !splashTitle) return;

        // Only show splash once per session
        if (sessionStorage.getItem('splashShown')) {
            splashOverlay.classList.add('splash-hidden');
            return;
        }

        const text = 'ApEapcetEngine';
        text.split('').forEach((char, i) => {
            const span = document.createElement('span');
            span.textContent = char;
            span.style.animationDelay = `${0.3 + i * 0.06}s`;
            splashTitle.appendChild(span);
        });

        setTimeout(() => {
            splashOverlay.classList.add('splash-hidden');
            sessionStorage.setItem('splashShown', '1');
        }, 3000);
    })();

    // ═══════════════════════════════════════════════════
    // INTERSECTION OBSERVER — Scroll-triggered reveals
    // ═══════════════════════════════════════════════════
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    function observeRevealElements() {
        document.querySelectorAll('.reveal:not(.revealed)').forEach(el => revealObserver.observe(el));
    }

    // ═══════════════════════════════════════════════════
    // ANIMATED NUMBER COUNTER — Count from 0 to target
    // ═══════════════════════════════════════════════════
    function animateCounter(element, target, duration = 800, suffix = '') {
        if (!element || target == null) return;
        const start = 0;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(start + (target - start) * eased);
            element.textContent = current.toLocaleString() + suffix;
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }

    // ═══════════════════════════════════════════════════
    // SPARKLINE SVG — Tiny trend chart for 2 data points
    // ═══════════════════════════════════════════════════
    function createTrendComparison(value2022, value2024) {
        if (value2022 == null || value2024 == null) return '';

        const change = ((value2024 - value2022) / value2022 * 100).toFixed(1);
        const changeNum = parseFloat(change);
        // Lower rank number = harder to get in. If 2024 < 2022, it got harder.
        const isHarder = changeNum < 0;
        const isStable = Math.abs(changeNum) < 3;

        let arrow, colorClass;
        if (isStable) {
            arrow = '—';
            colorClass = 'trend-stable';
        } else if (isHarder) {
            arrow = '▼';
            colorClass = 'trend-harder';
        } else {
            arrow = '▲';
            colorClass = 'trend-easier';
        }

        return `<div class="trend-comparison ${colorClass}">
            <span class="trend-values">
                <span class="trend-year">'22</span> <span class="trend-rank">${value2022.toLocaleString()}</span>
                <span class="trend-arrow">${arrow}</span>
                <span class="trend-year">'24</span> <span class="trend-rank">${value2024.toLocaleString()}</span>
            </span>
            <span class="trend-pct">${changeNum > 0 ? '+' : ''}${change}%</span>
        </div>`;
    }

    // ═══════════════════════════════════════════════════
    // BENTO SUMMARY — Dashboard tiles after prediction
    // ═══════════════════════════════════════════════════
    function renderBentoSummary(data, userRank) {
        const bentoDiv = document.getElementById('bentoSummary');
        if (!bentoDiv || !data || data.length === 0) {
            if (bentoDiv) bentoDiv.style.display = 'none';
            return;
        }

        const safeCount = data.filter(c => c.probability >= 75).length;
        const moderateCount = data.filter(c => c.probability >= 30 && c.probability < 75).length;
        const reachCount = data.filter(c => c.probability < 30).length;

        // Top branches
        const branchCounts = {};
        data.forEach(c => { branchCounts[c.branch] = (branchCounts[c.branch] || 0) + 1; });
        const topBranches = Object.entries(branchCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

        // District counts
        const distCounts = {};
        data.forEach(c => {
            const name = optionData.districts.find(d => d.value === c.district)?.text || c.district || 'Unknown';
            distCounts[name] = (distCounts[name] || 0) + 1;
        });
        const topDistricts = Object.entries(distCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

        bentoDiv.innerHTML = `
            <div class="bento-tile bento-tile-primary reveal">
                <div class="bento-tile-label">Your Rank</div>
                <div class="bento-tile-number" data-count="${userRank}">${userRank.toLocaleString()}</div>
                <div class="bento-tile-label" style="margin-top:0.5rem; color: var(--text-secondary);">${data.length} results found</div>
            </div>
            <div class="bento-tile bento-tile-safe reveal">
                <div class="bento-tile-label"><i class="fa-solid fa-shield-halved"></i> Safe</div>
                <div class="bento-tile-number" data-count="${safeCount}">0</div>
                <div class="bento-tile-label">colleges</div>
            </div>
            <div class="bento-tile bento-tile-moderate reveal">
                <div class="bento-tile-label"><i class="fa-solid fa-gauge-high"></i> Moderate</div>
                <div class="bento-tile-number" data-count="${moderateCount}">0</div>
                <div class="bento-tile-label">colleges</div>
            </div>
            <div class="bento-tile bento-tile-reach reveal">
                <div class="bento-tile-label"><i class="fa-solid fa-mountain"></i> Reach</div>
                <div class="bento-tile-number" data-count="${reachCount}">0</div>
                <div class="bento-tile-label">colleges</div>
            </div>
            <div class="bento-tile bento-tile-lg reveal" style="padding:1rem;">
                <div class="bento-tile-label" style="margin-bottom:0.5rem;"><i class="fa-solid fa-code-branch"></i> Top Branches in Results</div>
                ${topBranches.map(([name, count]) => `<div style="display:flex;justify-content:space-between;padding:0.35rem 0;border-bottom:1px dashed rgba(26,26,46,0.08);font-size:0.85rem;font-weight:600;"><span>${name}</span><span style="color:var(--primary);font-weight:800;">${count}</span></div>`).join('')}
            </div>
            <div class="bento-tile bento-tile-lg reveal" style="padding:1rem;">
                <div class="bento-tile-label" style="margin-bottom:0.5rem;"><i class="fa-solid fa-map-pin"></i> Top Districts</div>
                ${topDistricts.map(([name, count]) => `<div style="display:flex;justify-content:space-between;padding:0.35rem 0;border-bottom:1px dashed rgba(26,26,46,0.08);font-size:0.85rem;font-weight:600;"><span>${name}</span><span style="color:var(--primary);font-weight:800;">${count}</span></div>`).join('')}
            </div>
        `;

        bentoDiv.style.display = 'grid';

        // Animate the counter tiles
        setTimeout(() => {
            observeRevealElements();
            bentoDiv.querySelectorAll('[data-count]').forEach(el => {
                animateCounter(el, parseInt(el.dataset.count), 700);
            });
        }, 100);
    }

    // ═══════════════════════════════════════════════════
    // HERO STAT COUNTERS — Animate on page load
    // ═══════════════════════════════════════════════════
    setTimeout(() => {
        animateCounter(document.getElementById('heroCollegeCount'), 239, 1200);
        animateCounter(document.getElementById('heroBranchCount'), 55, 1000);
        animateCounter(document.getElementById('heroCutoffCount'), 43596, 1500);
    }, 500);


    /**
     * Configuration data for various form options and selections.
     * Contains predefined lists for branches, quotas, genders, districts, regions, and placement qualities.
     */
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

    if (firebaseConfig) {
        // Firebase initialization would go here if needed
    }

    const BRANCH_CODE_TO_NAME = {
        "AGR": "Agricultural Engineering",
        "AI": "Artificial Intelligence",
        "AID": "Artificial Intelligence & Data Science",
        "AIM": "Artificial Intelligence & Machine Learning",
        "ASE": "Aerospace Engineering",
        "AUT": "Automobile Engineering",
        "BDT": "Dairy Technology",
        "BIO": "Biotechnology",
        "CAD": "CSE (Artificial Intelligence & Data Science)",
        "CAI": "Computer Science and Engineering (Artificial Intelligence)",
        "CBA": "Computer Science and Engineering (Big Data Analytics)",
        "CCC": "CSE with Specialization in Cloud Computing",
        "CHE": "Chemical Engineering",
        "CIC": "CSE (IoT & Cyber Security with Block Chain Tech)",
        "CIT": "Computer Science and Information Technology",
        "CIV": "Civil Engineering",
        "CN": "Computer Networking",
        "CS": "Cyber Security",
        "CSB": "Computer Science and Business Systems",
        "CSBS": "CSE (Business Systems)",
        "CSC": "CSE (Cyber Security)",
        "CSD": "CSE (Data Science)",
        "CSE": "Computer Science & Engineering",
        "CSEB": "Computer Science and Engineering & Business Systems",
        "CSER": "CSE (Regional Course - Telugu)",
        "CSG": "Computer Science and Design",
        "CSM": "CSE (AI & ML Specialization)",
        "CSO": "Computer Science and Engineering (IoT)",
        "CSS": "Computer Science and Systems Engineering",
        "CST": "Computer Science and Technology",
        "CSW": "Computer Engineering (Software Engineering)",
        "DS": "Data Science",
        "EBM": "Electronics and Communication Engineering (Bio-Medical Engineering)",
        "ECE": "Electronics & Communication Engineering",
        "ECM": "Electronics and Computer Engineering",
        "ECT": "Electronics and Communication Technology",
        "EEE": "Electrical & Electronics Engineering",
        "EIE": "Electronics & Instrumentation Engineering",
        "EII": "Electronics and Communication Engineering (Industry Integrated)",
        "FDE": "Food Engineering",
        "FDT": "Food Technology",
        "GIN": "Geo-Informatics",
        "INF": "Information Technology",
        "IOT": "Internet of Things",
        "IST": "Instrumentation Engineering and Technology",
        "MEC": "Mechanical Engineering",
        "MET": "Metallurgical Engineering",
        "MIN": "Mining Engineering",
        "MRB": "Mechanical Engineering (Robotics)",
        "NAM": "Naval Architecture and Marine Engineering",
        "PEE": "Petroleum Engineering",
        "PHD": "Doctor of Pharmacy (Pharm.D)",
        "PHM": "B.Pharm",
        "RBT": "Robotics and Automation",
        "SWE": "Software Engineering"
    };

    /**
     * Static data for form options and selections.
     */
    const COLLEGE_TYPE_LABELS = {
        'PVT': 'Private', 'UNIV': 'University', 'SF': 'Govt-Aided', 'PU': 'Pharmacy Univ', 'SS': 'State-Sponsored'
    };

    const optionData = {
        branches: Object.values(BRANCH_CODE_TO_NAME).map(name => ({ value: name, text: name })).sort((a, b) => a.text.localeCompare(b.text)),
        quotas: [
            { value: "OC", text: "OC" },
            { value: "OC_EWS", text: "OC EWS" },
            { value: "BCA", text: "BC-A" },
            { value: "BCB", text: "BC-B" },
            { value: "BCC", text: "BC-C" },
            { value: "BCD", text: "BC-D" },
            { value: "BCE", text: "BC-E" },
            { value: "SC", text: "SC" },
            { value: "ST", text: "ST" }
        ],
        genders: [
            { value: "BOYS", text: "Boys" },
            { value: "GIRLS", text: "Girls" }
        ],
        coedOptions: [
            { value: "COED", text: "Co-Ed" },
            { value: "GIRLS", text: "Girls Only" }
        ],
        districts: [
            { value: "Alluri Sitharama Raju", text: "Alluri Sitharama Raju" },
            { value: "Anakapalli", text: "Anakapalli" },
            { value: "Anantapuramu", text: "Anantapuramu" },
            { value: "Annamayya", text: "Annamayya" },
            { value: "Bapatla", text: "Bapatla" },
            { value: "Chittoor", text: "Chittoor" },
            { value: "East Godavari", text: "East Godavari" },
            { value: "Eluru", text: "Eluru" },
            { value: "Guntur", text: "Guntur" },
            { value: "Kakinada", text: "Kakinada" },
            { value: "Konaseema", text: "Konaseema" },
            { value: "Krishna", text: "Krishna" },
            { value: "Kurnool", text: "Kurnool" },
            { value: "NTR", text: "NTR" },
            { value: "Nandyal", text: "Nandyal" },
            { value: "Palnadu", text: "Palnadu" },
            { value: "Prakasam", text: "Prakasam" },
            { value: "SPSR Nellore", text: "SPSR Nellore" },
            { value: "Sri Sathya Sai", text: "Sri Sathya Sai" },
            { value: "Srikakulam", text: "Srikakulam" },
            { value: "Tirupati", text: "Tirupati" },
            { value: "Visakhapatnam", text: "Visakhapatnam" },
            { value: "Vizianagaram", text: "Vizianagaram" },
            { value: "West Godavari", text: "West Godavari" },
            { value: "YSR Kadapa", text: "YSR Kadapa" }
        ]
    };

    /**
     * Mapping of regions to their corresponding districts.
     * Used to filter district options based on selected regions.
     */
    const regionDistrictMap = {
        "AU": ["Visakhapatnam", "Vizianagaram", "Srikakulam", "East Godavari", "West Godavari", "Eluru", "Bapatla", "Alluri Sitharama Raju", "Anakapalli", "Kakinada", "Konaseema"], 
        "SVU": ["Chittoor", "SPSR Nellore", "Annamayya", "Tirupati", "YSR Kadapa", "Kadapa", "Nellore"],
        "SW": ["Anantapuramu", "Anantapur", "Kurnool", "Guntur", "Krishna", "Prakasam", "Nandyal", "NTR", "Palnadu", "Sri Sathya Sai"]
    };

    /**
     * Translation strings for UI elements.
     * Used to support potential internationalization.
     */
    const translations = {
        btnPredict: "Predict Now", btnClear: "Clear All Filters", disclaimerStrong: "Disclaimer:",
        disclaimerText: "Prediction is based on previous years' cutoff data and trends. Actual cutoffs may vary due to factors such as applicants and seat availability.",
        sortLabel: "Sort By:", selectAll: "Select All", sortProbabilityDesc: "Probability (High to Low)", sortProbabilityAsc: "Probability (Low to High)",
        sortCutoffAsc: "Cutoff Rank (Low to High)", sortCutoffDesc: "Cutoff Rank (High to Low)",


        btnSavePdf: "Save as PDF", btnSaveCsv: "Save as CSV",
        noDataText: "No colleges found matching your criteria.", noInputText: "Please enter a valid positive rank or select at least one filter.",
        fetchError: "Could not fetch predictions. Please try again later.", itemsSelected: "items selected",
        downloadNoData: "Please predict colleges first to download results.",
        labelBranch: "Branch Preference", selectBranch: "Select Branch",
        labelQuota: "Reservation Quota", selectQuota: "Select Quota",
        labelGender: "Gender", selectGender: "Select Gender",
        labelCoed: "College Type", selectCoed: "Co-Ed / Girls Only",
        labelDistrict: "District", selectDistrict: "Select District",
        labelAffl: "Affiliation", selectAffl: "Select Affiliation",
        compareCheck: "Compare", compareCount: " Colleges Selected for Comparison",
        compareNow: "Compare Now", clearCompare: "Clear Comparison",
        tableFeature: "Feature", tableName: "College Name", tableBranch: "Branch", tableCutoff: "Cutoff Rank", tableProb: "Predicted Chance",
        mapCollegeDetails: "College Details",
        limitWarningTitle: "Comparison Limit Reached",
        limitWarningText: "You can only select up to 4 colleges for side-by-side comparison. Please deselect a college to add a new one.",
        inputWarningTitle: "Input Required",
        inputWarningText: "To get predictions, please enter your EAMCET rank or select at least one filter option."
    };
    
    /**
     * Configuration for sorting options.
     * Maps UI sort options to their corresponding data properties and ordering logic.
     */
    const SortMap = {
        'probability': { prop: 'probability' }, 'cutoff': { prop: 'cutoff' },
        'estd': { prop: 'estd' }
    };

    // DOM element references
    const body = document.body;
    const darkModeSwitch = document.getElementById("darkModeSwitch");
    const rankInput = document.getElementById("rank");
    const predictButton = document.getElementById("predictButton");
    const clearButton = document.getElementById("clearButton");
    const predictForm = document.getElementById("predictForm");
    const collegeListDiv = document.getElementById("collegeList");
    const resultsHeader = document.getElementById("resultsHeader");
    const sortBySelect = document.getElementById("sortBy");
    const loadingSpinner = document.getElementById("loadingSpinner");
    const filtersHeader = document.getElementById('filtersHeader');
    const filtersContainer = document.getElementById('filtersContainer');
    const multiselectContainers = document.querySelectorAll('.multiselect-dropdown');

    const downloadBtn = document.getElementById("downloadBtn");
    const downloadMenu = document.getElementById("downloadMenu");
    const downloadPdfBtn = document.getElementById("downloadPdfBtn");
    const downloadCsvBtn = document.getElementById("downloadCsvBtn");
    const scrollButtons = document.getElementById("scrollButtons");
    const scrollTopBtn = document.getElementById("scrollTopBtn");
    const scrollBottomBtn = document.getElementById("scrollBottomBtn");

    const comparisonTray = document.getElementById('comparison-tray');
    const compareCountSpan = document.getElementById('compare-count');
    const compareNowBtn = document.getElementById('compare-now-btn');
    const clearCompareBtn = document.getElementById('clear-compare-btn');
    const comparisonModal = document.getElementById('comparison-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const comparisonTableContainer = document.getElementById('comparison-table-container');

    const warningModal = document.getElementById('custom-warning-modal');
    const warningModalTitle = document.getElementById('warning-modal-title');
    const warningModalText = document.getElementById('warning-modal-text');
    const warningModalCloseBtn = document.getElementById('warning-modal-close-btn');

    const predictButtonBottom = document.getElementById('predictButtonBottom');

    // Application state variables
    let rawData = [];
    let sortedData = [];
    let selectedColleges = []; 
    let allCollegesCache = []; // Cache for all colleges data

    // BRANCH_CODE_TO_NAME defined above

    const BRANCH_NAME_TO_CODE = {};
    Object.entries(BRANCH_CODE_TO_NAME).forEach(([code, name]) => {
        BRANCH_NAME_TO_CODE[name] = code;
    });
    function getRegionForDistrict(district) {
        if (!district) return "Other";
        for (const [region, districts] of Object.entries(regionDistrictMap)) {
            if (districts.some(d => d.toLowerCase() === district.toLowerCase() || district.toLowerCase().includes(d.toLowerCase()))) {
                return region;
            }
        }
        return "Other";
    }







    function mapBackendCollegeToFrontend(c, categoryVal) {
        const regionVal = getRegionForDistrict(c.district);

        const branchName = BRANCH_CODE_TO_NAME[c.branch_code] || c.branch_code;

        return {
            institution_name: c.college_name || c.name,
            name: c.college_name || c.name,
            instcode: c.instcode,
            district: c.district,
            place: c.place,
            branch: branchName,
            branchCode: c.branch_code,
            category: categoryVal || c.category || 'OC_BOYS',
            cutoff: c.cutoff_rank_2024 || c.cutoff,
            cutoff2022: c.cutoff_rank_2022 || null,
            probability: c.probability_percent !== undefined ? c.probability_percent : null,
            region: regionVal,

            affl: c.affl,
            collegeType: c.college_type || null,
            estd: c.estd || null,
            coed: c.coed || null
        };
    }

    function applyClientFilters(data) {
        console.log('applyClientFilters called with data length:', data.length);
        
        const selectedBranches = (document.getElementById('desiredBranch').value || '').split(',').filter(Boolean);
        const selectedDistricts = (document.getElementById('district').value || '').split(',').filter(Boolean);
        
        console.log('Active filters for client-side filtering:', {
            branches: selectedBranches,
            districts: selectedDistricts
        });

        const coedInput = document.getElementById('coed');
        const selectedCoed = coedInput ? (coedInput.value || '').split(',').filter(Boolean) : [];

        return data.filter(college => {
            if (selectedBranches.length > 0) {
                const branchMatch = selectedBranches.some(selBranch => {
                    const selCode = BRANCH_NAME_TO_CODE[selBranch] || selBranch;
                    return college.branch === selBranch || college.branchCode === selCode || college.branch === selCode;
                });
                if (!branchMatch) return false;
            }

            if (selectedDistricts.length > 0) {
                if (!selectedDistricts.includes(college.district)) return false;
            }

            if (selectedCoed.length > 0) {
                if (!selectedCoed.includes(college.coed)) return false;
            }

            return true;
        });
    }

    /**
     * Initializes the page by setting up theme, multiselects, and event listeners.
     */
    initializePage();

    let isPageActive = true;
    let navigationFlag = false;
    let isRefresh = false;

    const pageState = sessionStorage.getItem('mainPageState');
    if (pageState === 'loaded') {
        isRefresh = true;
    }
    sessionStorage.setItem('mainPageState', 'loaded');

    window.addEventListener('beforeunload', function() {
        if (!isRefresh) {
            sessionStorage.setItem('mainPageNavigation', 'true');
        }
    });

    document.addEventListener('DOMContentLoaded', function() {
        const navFlag = sessionStorage.getItem('mainPageNavigation');
        if (navFlag) {
            navigationFlag = true;
            sessionStorage.removeItem('mainPageNavigation');
        }
    });

    document.addEventListener('visibilitychange', function() {
        // Visibility change handling would go here if needed
    });

    window.addEventListener('blur', function() {
        // Blur handling would go here if needed
    });

    window.addEventListener('focus', function() {
        // Focus handling would go here if needed
    });

    /**
     * Initializes the page by setting up theme, multiselects, and event listeners.
     */
    function initializePage() {
        console.log('initializePage called');
        setTheme(localStorage.getItem("theme") || 'light');
        multiselectContainers.forEach(initializeMultiselect);
        setupEventListeners();

        if (rankInput) {
            rankInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    console.log('Enter key pressed in rank input, triggering prediction');
                    handlePrediction();
                }
            });

            rankInput.addEventListener('input', function(e) {
                const value = e.target.value;

                if (value && !/^[0-9]*$/.test(value)) {
                    e.target.value = value.replace(/[^0-9]/g, '');
                    return;
                }

                const numValue = parseInt(value) || 0;

                if (numValue > 350000) {
                    console.log('Rank value exceeds 350000:', numValue);

                    if (typeof showValidationModal === 'function') {
                        console.log('Showing validation modal');
                        showValidationModal(
                            'Invalid Rank',
                            'Please enter a rank between 1 and 350000.',
                            'error'
                        );
                    } else {
                        console.log('Showing alert');
                        alert('Please enter a rank between 1 and 350000.');
                    }

                    e.target.value = '';
                }
            });

            rankInput.addEventListener('blur', function(e) {
                const value = e.target.value;
                if (value) {
                    const numValue = parseInt(value) || 0;
                    if (numValue > 350000) {
                        console.log('Rank value exceeds 350000 on blur:', numValue);

                        if (typeof showValidationModal === 'function') {
                            console.log('Showing validation modal on blur');
                            showValidationModal(
                                'Invalid Rank',
                                'Please enter a rank between 1 and 350000.',
                                'error'
                            );
                        } else {
                            console.log('Showing alert on blur');
                            alert('Please enter a rank between 1 and 350000.');
                        }

                        e.target.value = '';
                    } else if (numValue < 1 && numValue !== 0) {
                        e.target.value = '';
                    }
                }
            });

            rankInput.addEventListener('paste', function(e) {
                setTimeout(() => {
                    const value = e.target.value;
                    if (value && !/^[0-9]*$/.test(value)) {
                        e.target.value = value.replace(/[^0-9]/g, '');
                        return;
                    }
                    
                    const numValue = parseInt(value) || 0;
                    if (numValue > 350000) {
                        console.log('Rank value exceeds 350000 on paste:', numValue);
                        if (typeof showValidationModal === 'function') {
                            console.log('Showing validation modal on paste');
                            showValidationModal(
                                'Invalid Rank',
                                'Please enter a rank between 1 and 350000.',
                                'error'
                            );
                        } else {
                            console.log('Showing alert on paste');
                            alert('Please enter a rank between 1 and 350000.');
                        }
                        e.target.value = '';
                    }
                }, 10);
            });
        }

        checkUrlParameters();
        
        if (rawData.length === 0) {
            renderEmptyState();
        }
        translateUI();

        console.log('Initializing comparison tray in initializePage');
        initializeMainComparisonTray();

        setTimeout(() => {
            sessionStorage.setItem('mainPageState', 'initialized');
        }, 1000);
    }

    /**
     * Clears cached data on page refresh.
     */
    function clearCacheOnRefresh() {
        localStorage.removeItem('collegeResults');
        localStorage.removeItem('sortedResults');
        localStorage.removeItem('collegeFormState');
    }
    
    /**
     * Checks URL parameters for direct college access.
     */
    function checkUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const instcode = urlParams.get('instcode');
        const view = urlParams.get('view');
        
        if (instcode && view === 'details') {
            setTimeout(() => {
                console.log('Calling showSpinner with true for instcode search');
                showSpinner(true);
                fetch(`/api/colleges/${instcode}/detail?category=OC_BOYS&_=${new Date().getTime()}`)
                .then(res => {
                    if (!res.ok) throw new Error("Failed to fetch college detail");
                    return res.json();
                })
                .then(detail => {
                    const mappedColleges = (detail.branches || []).map(b => {
                        const regionVal = detail.region || getRegionForDistrict(detail.district);

                        const branchName = BRANCH_CODE_TO_NAME[b.branch_code] || b.branch_code;

                        return {
                            institution_name: detail.name,
                            name: detail.name,
                            instcode: detail.instcode,
                            district: detail.district,
                            place: detail.place,
                            branch: branchName,
                            branchCode: b.branch_code,
                            category: detail.category || 'OC_BOYS',
                            cutoff: b.cutoff_2024 || b.cutoff_2022,
                            probability: null, // no probability since it's detail view without user rank
                            region: regionVal,

                        };
                    });
                    rawData = mappedColleges;
                    renderBentoSummary(rawData, parseInt(rankInput.value));
                    filterAndRenderColleges();
                    showSpinner(false);

                    window.history.replaceState({}, document.title, window.location.pathname);
                })
                .catch(err => {
                    console.error("Failed to load college details:", err);
                    showSpinner(false);
                });
            }, 100);
        }
    }
    
    /**
     * Loads all colleges data into cache for faster access in other views.
     */
    function loadAllCollegesCache() {
        fetch(`/api/colleges/explore?_=${new Date().getTime()}`)
        .then(res => res.json())
        .then(data => {
            allCollegesCache = data;
            console.log(`Loaded ${allCollegesCache.length} colleges`);
        })
        .catch(err => console.error("Failed to load colleges:", err));
    }

    /**
     * Sets the application theme (light or dark mode).
     * 
     * @param {string} theme - The theme to set ('light' or 'dark')
     */
    function setTheme(theme) {
        body.classList.toggle("dark-mode", theme === "dark");
        darkModeSwitch.checked = theme === "dark";
        localStorage.setItem("theme", theme);
    }

    /**
     * Shows or hides the loading spinner.
     * 
     * @param {boolean} show - Whether to show or hide the spinner
     */
    function showSpinner(show) {
        console.log('Setting spinner display to:', show ? "flex" : "none");
        loadingSpinner.style.display = show ? "flex" : "none";
    }

    /**
     * Shows a warning modal with the specified title and text.
     * 
     * @param {string} title - The title for the modal
     * @param {string} text - The text content for the modal
     */
    function showWarningModal(title, text) {
        if (!warningModal) return;
        warningModalTitle.textContent = title;
        warningModalText.textContent = text;
        warningModal.style.display = 'flex';
    }

    /**
     * Creates a Google Maps URL for a college location.
     * 
     * @param {string} collegeName - The name of the college
     * @param {string} districtCode - The district code
     * @returns {string} The Google Maps URL
     */
    function createLocationUrl(collegeName, districtCode) {
        const fullDistrict = districtCode || '';
        const query = encodeURIComponent(`${collegeName}, ${fullDistrict}`);
        return `https://www.google.com/maps/search/?api=1&query=${query}`;
    }

    /**
     * Sorts data based on the specified criteria.
     * 
     * @param {Array} data - The data to sort
     * @param {string} criteria - The sorting criteria (e.g., 'cutoff-asc', 'probability-desc')
     * @returns {Array} The sorted data
     */
    function multiSort(data, criteria) {
        console.log('multiSort called with data length:', data.length, 'and criteria:', criteria);
        const [key, direction] = criteria.split("-");
        const sortConfig = SortMap[key];
        if (!sortConfig) {
            console.log('No sortConfig found for key:', key);
            return data;
        }
        const directionNum = direction === "desc" ? -1 : 1;
        const prop = sortConfig.prop;
        console.log('Sorting by prop:', prop, 'directionNum:', directionNum);
        try {
            const result = [...data].sort((a, b) => {
                let valA = a[prop], valB = b[prop];
                if (sortConfig.order) {
                    valA = sortConfig.order[valA] || 0;
                    valB = sortConfig.order[valB] || 0;
                }
                if (valA == null) return 1; if (valB == null) return -1;
                if (valA < valB) return -1 * directionNum;
                if (valA > valB) return 1 * directionNum;
                return 0;
            });
            console.log('multiSort completed, result length:', result.length);
            return result;
        } catch (error) {
            console.error('Error in multiSort:', error);
            return data;
        }
    }

    /**
     * Translates UI elements based on the translations object.
     */
    function translateUI() {
        document.querySelectorAll("[data-lang-key]").forEach(el => {
            const key = el.getAttribute("data-lang-key");
            const text = translations[key];
            if (text) {
                if (el.tagName === 'SPAN' && el.parentElement.classList.contains('select-all-label')) {
                    el.textContent = text;
                } else {
                    const icon = el.querySelector('i');
                    el.innerHTML = icon ? `${icon.outerHTML} ${text}` : text;
                }
            }
        });
        rankInput.placeholder = "Enter your rank here (e.g., 15000)";
        multiselectContainers.forEach(dropdown => {
            const hiddenInput = document.getElementById(dropdown.getAttribute('data-id'));
            const selectedValues = (hiddenInput?.value || "").split(',').filter(Boolean);
            updateSelectedItemsDisplay(dropdown, selectedValues);
        });
        updateComparisonTray(); 
    }

    /**
     * Updates the display of selected items in a multiselect dropdown.
     * 
     * @param {Element} dropdown - The multiselect dropdown element
     * @param {Array} selectedValues - Array of selected values
     */
    function updateSelectedItemsDisplay(dropdown, selectedValues) {
        const selectedItemsSpan = dropdown.querySelector(".selected-items");
        let placeholderText = selectedItemsSpan.dataset.originalText;
        if (!placeholderText) {
            selectedItemsSpan.dataset.originalText = selectedItemsSpan.textContent;
            placeholderText = selectedItemsSpan.textContent;
        }
        const placeholderKey = dropdown.getAttribute('data-placeholder-key');
        if (placeholderKey && translations[placeholderKey]) {
            placeholderText = translations[placeholderKey];
        }

        if (selectedValues.length === 0 || !selectedValues[0]) {
            selectedItemsSpan.textContent = placeholderText;
            return;
        }
        
        const dataSourceKey = dropdown.querySelector('.options-list').getAttribute('data-source');
        const dataSource = optionData[dataSourceKey];
        if (!dataSource) return;

        const selectedTexts = selectedValues.map(val => dataSource.find(opt => opt.value === val)?.text || val);
        selectedItemsSpan.textContent = selectedTexts.length === 1 ? selectedTexts[0] : `${selectedTexts.length} ${translations.itemsSelected}`;
    }

    /**
     * Toggles the visibility of a multiselect dropdown.
     * 
     * @param {Element} dropdown - The dropdown to toggle
     */
    function toggleDropdown(dropdown) {
        document.querySelectorAll('.multiselect-dropdown.open').forEach(openDropdown => {
            if (openDropdown !== dropdown) openDropdown.classList.remove('open');
        });
        dropdown.classList.toggle('open');
    }

    /**
     * Initializes a multiselect dropdown with options and event listeners.
     * 
     * @param {Element} dropdown - The dropdown element to initialize
     */
    function initializeMultiselect(dropdown) {
        const id = dropdown.getAttribute('data-id');
        const hiddenInput = document.getElementById(id);
        console.log(`Initializing multiselect ${id}, hidden input:`, hiddenInput);
        const optionsList = dropdown.querySelector('.options-list');
        const dataSourceKey = optionsList.getAttribute('data-source');
        const data = optionData[dataSourceKey];
        if (!data) return;
        
        const isListStyle = dropdown.getAttribute('data-style') === 'list';

        optionsList.innerHTML = data.map(item => `<label><input type="checkbox" data-text="${item.text}" value="${item.value}" /><span>${item.text}</span></label>`).join('');
        
        dropdown.querySelector('.multiselect-input').addEventListener('click', () => toggleDropdown(dropdown));
        
        const optionElements = optionsList.querySelectorAll('label');
            optionElements.forEach(label => {
            const checkbox = label.querySelector('input[type="checkbox"]');
            
            label.addEventListener('click', (e) => {
                if (isListStyle) {
                    e.preventDefault();
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            checkbox.addEventListener('change', () => {
                if (dropdown.dataset.singleSelect === 'true' && checkbox.checked) {
                    optionElements.forEach(l => {
                        const cb = l.querySelector('input[type="checkbox"]');
                        if (cb !== checkbox) cb.checked = false;
                    });
                    toggleDropdown(dropdown);
                }
                const selectedValues = Array.from(optionElements).map(l => l.querySelector('input[type="checkbox"]')).filter(cb => cb.checked).map(cb => cb.value);
                hiddenInput.value = selectedValues.join(',');

                console.log(`Multiselect ${id} hidden input updated:`, hiddenInput.value);
                console.log(`Multiselect ${id} selected values:`, selectedValues);
                console.log(`Multiselect ${id} hidden input element:`, hiddenInput);
                
                updateSelectedItemsDisplay(dropdown, selectedValues);
            });
        });

        const selectAllCheckbox = dropdown.querySelector('.select-all-checkbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', () => {
                optionElements.forEach(l => {
                    const cb = l.querySelector('input[type="checkbox"]');
                    if (!cb.disabled) cb.checked = selectAllCheckbox.checked;
                });
                optionElements[0]?.querySelector('input[type="checkbox"]')?.dispatchEvent(new Event('change', { bubbles: true }));
            });
        }
    }
    
    /**
     * Updates dependent options based on selected values.
     * 
     * @param {string} controlId - The ID of the control element
     * @param {string} hiddenInputId - The ID of the hidden input
     * @param {Set} allowedValues - Set of allowed values
     */
    function updateDependentOptions(controlId, hiddenInputId, allowedValues) {
        const dropdown = document.querySelector(`.multiselect-dropdown[data-id="${controlId}"]`);
        const checkboxes = dropdown.querySelectorAll('.options-list input[type="checkbox"]');
        const hiddenInput = document.getElementById(hiddenInputId);
        let stillSelectedValues = [];
        checkboxes.forEach(checkbox => {
            const isAllowed = allowedValues.has(checkbox.value);
            checkbox.disabled = !isAllowed;
            checkbox.closest('label').classList.toggle('disabled', !isAllowed);
            if (!isAllowed) checkbox.checked = false;
            if (checkbox.checked) stillSelectedValues.push(checkbox.value);
        });
        hiddenInput.value = stillSelectedValues.join(',');
        updateSelectedItemsDisplay(dropdown, stillSelectedValues);
    }


    /**
     * Resets the results display and clears data.
     */
    function resetResults() {
        rawData = [];
        sortedData = [];
        collegeListDiv.innerHTML = '';
        resultsHeader.style.display = 'none';
        const bentoSummary = document.getElementById('bentoSummary');
        if (bentoSummary) bentoSummary.style.display = 'none';
        const distSummary = document.getElementById('districtSummary');
        if (distSummary) distSummary.style.display = 'none';
        selectedColleges = [];
        updateComparisonTray();
        sortBySelect.value = 'cutoff-asc';
    }

    /**
     * Filters and renders colleges based on current sort settings.
     */
    function filterAndRenderColleges() {
        console.log('filterAndRenderColleges called with rawData length:', rawData.length);
        const currentSelectedIds = selectedColleges.map(c => c.uniqueId);
        console.log('filterAndRenderColleges called, preserving selected colleges:', currentSelectedIds);
        
        const filteredData = applyClientFilters(rawData);
        sortedData = multiSort(filteredData, sortBySelect.value);

        const newSelectedColleges = [];
        sortedData.forEach(college => {
            const uniqueId = `${college.instcode}-${college.branch}-${college.category}-${college.cutoff}`;
            if (currentSelectedIds.includes(uniqueId)) {
                college.uniqueId = uniqueId;
                newSelectedColleges.push(college);
            }
        });
        selectedColleges = newSelectedColleges;
        console.log('Restored selected colleges:', selectedColleges.map(c => c.uniqueId));
        
        renderColleges();
        updateComparisonTray();
    }

    /**
     * Renders college cards based on sorted data.
     */
    function renderColleges() {
        console.log('renderColleges called with sortedData length:', sortedData.length);
        if (!sortedData || sortedData.length === 0) {
            console.log('No data to render, calling renderEmptyState');
            renderEmptyState(translations.noDataText);
            return;
        }
        console.log('Showing results header');
        resultsHeader.style.display = 'flex';
        console.log('Clearing college list div');
        collegeListDiv.innerHTML = '';


        console.log('Creating college cards for', sortedData.length, 'colleges');
        sortedData.forEach((college, index) => {
            const card = document.createElement("div");

            const uniqueId = `${college.instcode}-${college.branch}-${college.category}-${college.cutoff}`; 
            card.className = `college-card reveal reveal-delay-${(index % 5) + 1}`;
            card.dataset.id = uniqueId; 
            
            const isSelected = selectedColleges.some(c => c.uniqueId === uniqueId);

            const collegeName = college.institution_name || college.name || "Unnamed College";
            const locationUrl = createLocationUrl(collegeName, college.district);
            const probClass = college.probability >= 75 ? 'prob-high' : college.probability >= 30 ? 'prob-medium' : 'prob-low';

            const collegeDataString = JSON.stringify(college).replace(/'/g, "&#39;"); 

            const comparisonCheckbox = `
                <div class="compare-checkbox-wrapper">
                    <label for="compare-${uniqueId}" title="${translations.compareCheck}">
                        <input type="checkbox" id="compare-${uniqueId}" class="compare-checkbox" data-college='${collegeDataString}' data-unique-id="${uniqueId}" ${isSelected ? 'checked' : ''} onchange="handleCompareCheckbox(event)" />
                        <span>${translations.compareCheck}</span>
                    </label>
                </div>
            `;
            
            const cutoffDisplay = college.cutoff ? college.cutoff.toLocaleString() : 'N/A';
            const probabilityDisplay = college.probability != null ? college.probability.toFixed(0) + '%' : 'N/A';
            const districtText = optionData.districts.find(d => d.value === college.district)?.text || college.district || 'N/A';

            // ─── Feature 1: Safe / Moderate / Reach badge ───
            let admissionBadge = '';
            if (college.probability != null) {
                if (college.probability >= 75) {
                    admissionBadge = '<span class="admission-badge badge-safe"><i class="fa-solid fa-shield-halved"></i> Safe</span>';
                } else if (college.probability >= 30) {
                    admissionBadge = '<span class="admission-badge badge-moderate"><i class="fa-solid fa-gauge-high"></i> Moderate</span>';
                } else {
                    admissionBadge = '<span class="admission-badge badge-reach"><i class="fa-solid fa-mountain"></i> Reach</span>';
                }
            }

            // ─── Feature 2: Cutoff Trend badge ───
            let trendBadge = '';
            if (college.cutoff != null && college.cutoff2022 != null) {
                const change = college.cutoff - college.cutoff2022;
                const pctChange = Math.abs(change) / college.cutoff2022 * 100;
                if (pctChange < 5) {
                    trendBadge = '<span class="trend-badge trend-stable"><i class="fa-solid fa-minus"></i> Stable</span>';
                } else if (change < 0) {
                    trendBadge = '<span class="trend-badge trend-harder"><i class="fa-solid fa-arrow-trend-down"></i> Getting Competitive</span>';
                } else {
                    trendBadge = '<span class="trend-badge trend-easier"><i class="fa-solid fa-arrow-trend-up"></i> Getting Easier</span>';
                }
            }

            // ─── Feature 3: College Type + Estd + Coed meta tags ───
            let metaTags = '';
            const typeLabel = college.collegeType ? (COLLEGE_TYPE_LABELS[college.collegeType] || college.collegeType) : null;
            if (typeLabel || college.estd || college.coed === 'GIRLS') {
                metaTags = '<div class="card-meta-tags">';
                if (typeLabel) metaTags += `<span class="meta-tag tag-type">${typeLabel}</span>`;
                if (college.estd) metaTags += `<span class="meta-tag tag-estd">Est. ${college.estd}</span>`;
                if (college.coed === 'GIRLS') metaTags += `<span class="meta-tag tag-girls"><i class="fa-solid fa-venus"></i> Women\'s College</span>`;
                metaTags += '</div>';
            }

            const formattedCategory = (function(cat) {
                if (!cat) return 'N/A';
                const parts = cat.split('_');
                if (parts.length >= 2) {
                    const genderPart = parts[parts.length - 1];
                    const quotaParts = parts.slice(0, parts.length - 1);
                    const quotaCode = quotaParts.join(' ');
                    const genderText = genderPart === 'BOYS' ? 'Boys' : genderPart === 'GIRLS' ? 'Girls' : genderPart;
                    return `${quotaCode} ${genderText}`;
                }
                return cat;
            })(college.category);

            // ─── Feature 2 (cont): Cutoff 2022 display ───
            const cutoff2022Display = college.cutoff2022 ? college.cutoff2022.toLocaleString() : 'N/A';

            card.innerHTML = `
                ${comparisonCheckbox}
                <a href="${locationUrl}" target="_blank" class="card-location-link" title="View on Map">
                    <i class="fa-solid fa-location-dot"></i> <span>Location</span>
                </a>
                <div class="card-content-wrapper">
                    <h3 class="card-title">${collegeName}</h3>
                    ${metaTags}
                    <p class="card-branch-info">${college.branch || 'N/A'} <span>(${formattedCategory})</span></p>
                    <div class="card-badges-row">
                        ${admissionBadge}
                        ${trendBadge}
                        ${college.cutoff2022 ? createTrendComparison(college.cutoff2022, college.cutoff) : ''}
                    </div>
                    <div class="card-details-grid">
                        <div class="card-details-item"><strong>Cutoff 2024 (${formattedCategory})</strong><p>${cutoffDisplay}</p></div>
                        <div class="card-details-item"><strong>Cutoff 2022</strong><p>${cutoff2022Display}</p></div>
                        <div class="card-details-item"><strong>Predicted Chance</strong><p class="${probClass}">${probabilityDisplay}</p></div>
                    </div>
                    <div class="card-footer">
                        <span><strong>Inst. Code:</strong> ${college.instcode || 'N/A'}</span>
                        <span><strong>Location:</strong> ${districtText} (${college.region || 'N/A'})</span>
                        <span><strong>Affiliation:</strong> ${college.affl || 'N/A'}</span>
                    </div>
                </div>
            `;
            collegeListDiv.appendChild(card);
        });
        console.log('Finished creating college cards, collegeListDiv now has', collegeListDiv.children.length, 'children');
        
        console.log('Finished rendering colleges, calling initializeMainComparisonTray');
        initializeMainComparisonTray();
        observeRevealElements();
        console.log('initializeMainComparisonTray completed');
    }

    /**
     * Renders an empty state message when no data is available.
     * 
     * @param {string} message - The message to display
     */
    function renderEmptyState(message) {
        resultsHeader.style.display = 'none';
        collegeListDiv.innerHTML = `<div class="empty-state"><i class="fas fa-search-location"></i><h2>Your Results Will Appear Here</h2><p>${message || "Enter your rank to see college predictions."}</p></div>`;

        if (message && message !== "Enter your rank to see college predictions." && 
            typeof showValidationModal === 'function' && 
            typeof ValidationMessages !== 'undefined' && 
            ValidationMessages.noResults) {
            showValidationModal(
                ValidationMessages.noResults.title,
                ValidationMessages.noResults.message,
                ValidationMessages.noResults.type
            );
        }

        initializeMainComparisonTray();
    }

    /**
     * Handles the compare checkbox change event.
     * 
     * @param {Event} event - The checkbox change event
     */
    window.handleCompareCheckbox = (event) => {
        const checkbox = event.target;
        const uniqueId = checkbox.dataset.uniqueId;
        
        console.log('handleCompareCheckbox called for', uniqueId, 'checked:', checkbox.checked);
        console.log('Selected colleges before:', selectedColleges.length);
        
        let collegeData;
        try {
            const dataString = checkbox.getAttribute('data-college').replace(/"/g, '"');
            collegeData = JSON.parse(dataString);
            console.log('Parsed college data:', collegeData);
        } catch (e) {
            console.error("Error parsing college data, preventing selection:", e);
            checkbox.checked = false; 
            return;
        }

        collegeData.uniqueId = uniqueId;

        if (checkbox.checked) {
            if (selectedColleges.length < 6) { 
                if (!selectedColleges.some(c => c.uniqueId === uniqueId)) {
                    selectedColleges.push(collegeData);
                    console.log('Added college to selection, total:', selectedColleges.length);
                }
            } else {
                checkbox.checked = false;
                showValidationModal(
                    ValidationMessages.comparisonLimit.title,
                    ValidationMessages.comparisonLimit.message,
                    ValidationMessages.comparisonLimit.type
                );
                return;
            }
        } else {
            selectedColleges = selectedColleges.filter(c => c.uniqueId !== uniqueId);
            console.log('Removed college from selection, total:', selectedColleges.length);
        }
        updateComparisonTray();
    };

    /**
     * Removes a college from the comparison selection.
     * 
     * @param {string} uniqueId - The unique ID of the college to remove
     */
    window.removeCollegeFromComparison = (uniqueId) => {
        selectedColleges = selectedColleges.filter(c => c.uniqueId !== uniqueId);
        
        const checkbox = document.getElementById(`compare-${uniqueId}`);
        if (checkbox) checkbox.checked = false;

        if (comparisonModal.style.display === 'flex') {
            if (selectedColleges.length >= 2) {
                openComparisonModal(false); 
            } else {
                comparisonModal.style.display = 'none';
            }
        }
        updateComparisonTray();
    };

    /**
     * Updates the comparison tray display based on selected colleges.
     */
    function updateComparisonTray() {
        const count = selectedColleges.length;
        const countText = translations.compareCount;
        
        console.log('Updating comparison tray, count:', count);
        console.log('comparisonTray element in updateComparisonTray:', comparisonTray);
        
        if (comparisonTray) {
            console.log('Comparison tray element found:', comparisonTray);
            console.log('Current classes:', comparisonTray.className);
        } else {
            console.log('Comparison tray element NOT found!');
        }
        
        if (comparisonTray && comparisonTray.querySelector('p')) {
            comparisonTray.querySelector('p').innerHTML = `<span id="compare-count" style="color: var(--color-accent); margin-right: 0.25rem;">${count}</span> ${countText}`;
        }

        if (count > 0) {
            if (comparisonTray) {
                comparisonTray.classList.add('visible');
                comparisonTray.classList.remove('hidden');
                console.log('Showing comparison tray, new classes:', comparisonTray.className);
            }
        } else {
            if (comparisonTray) {
                comparisonTray.classList.remove('visible');
                comparisonTray.classList.add('hidden');
                console.log('Hiding comparison tray, new classes:', comparisonTray.className);
            }
        }
        
        if (compareNowBtn) {
            compareNowBtn.disabled = count < 2;
        }
        if (compareNowBtn) {
            compareNowBtn.textContent = translations.compareNow;
        }
        
        console.log('Comparison tray updated with count:', count);
    }
    
    /**
     * Opens the comparison modal to display selected colleges side-by-side.
     * 
     * @param {boolean} isFirstOpen - Whether this is the first time opening the modal
     */
    function openComparisonModal(isFirstOpen = true) {
        if (selectedColleges.length < 2) return;
        
        if (isFirstOpen) comparisonModal.style.display = 'flex';

        const features = [
            { key: 'name', label: translations.tableName, isName: true },
            { key: 'branch', label: translations.tableBranch },
            { key: 'category', label: translations.labelQuota },
            { key: 'cutoff', label: 'Cutoff 2024' },
            { key: 'cutoff2022', label: 'Cutoff 2022' },
            { key: 'probability', label: translations.tableProb, percent: true, color: true },

            { key: 'collegeType', label: 'College Type' },
            { key: 'estd', label: 'Established' },
            { key: 'affl', label: 'Affiliation' },
            { key: 'district', label: translations.labelDistrict, districtCode: true },
        ];

        let tableHTML = `<table class="comparison-table"><thead><tr>`;

        tableHTML += `<th class="sticky-feature">${translations.tableFeature}</th>`; 

        selectedColleges.forEach(college => {
            const safeCollegeName = (college.name || 'N/A').replace(/'/g, "'"); 

            tableHTML += `
                <th class="text-center">
                    <span class="college-name-row">${safeCollegeName}</span>
                    <button class="remove-col-btn mt-2" onclick="removeCollegeFromComparison('${college.uniqueId}')" title="Remove College">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </th>
            `;
        });

        tableHTML += `</tr></thead><tbody>`;

        features.forEach(feature => {
            let row = `<tr><th class="sticky-feature">${feature.label}</th>`;
            
            selectedColleges.forEach(college => {
                let displayValue;
                let className = '';

                let value = college[feature.key] ?? 'N/A';

                if (feature.districtCode) {
                    displayValue = optionData.districts.find(d => d.value === value)?.text || value;
                } else if (feature.currency && typeof value === 'number') {
                    displayValue = value > 0 ? `₹${value.toFixed(2)} LPA` : 'N/A';
                } else if (feature.percent && typeof value === 'number') {
                    displayValue = `${value.toFixed(0)}%`;
                    className = value >= 75 ? 'prob-high' : value >= 30 ? 'prob-medium' : 'prob-low';
                } else if (feature.key === 'category') {
                    const parts = value.split('_');
                    if (parts.length >= 2) {
                        const genderPart = parts[parts.length - 1];
                        const quotaParts = parts.slice(0, parts.length - 1);
                        const quotaCode = quotaParts.join('_');
                        const quotaOption = optionData.quotas.find(q => q.value.toUpperCase() === quotaCode.toUpperCase());
                        const quotaText = quotaOption ? quotaOption.text : quotaCode;
                        const genderText = genderPart === 'BOYS' ? 'Boys' : genderPart === 'GIRLS' ? 'Girls' : genderPart;
                        displayValue = `${quotaText} ${genderText}`;
                    } else {
                        displayValue = value;
                    }
                } else if (feature.key === 'cutoff') {
                    displayValue = college.cutoff ? college.cutoff.toLocaleString() : 'N/A';
                } else if (feature.key === 'cutoff2022') {
                    displayValue = college.cutoff2022 ? college.cutoff2022.toLocaleString() : 'N/A';
                } else if (feature.key === 'collegeType') {
                    displayValue = value ? (COLLEGE_TYPE_LABELS[value] || value) : 'N/A';
                } else {
                    displayValue = value;
                }
                
                row += `<td class="${className}">${displayValue}</td>`;
            });
            row += `</tr>`;
            tableHTML += row;
        });

        tableHTML += `</tbody></table>`;
        comparisonTableContainer.innerHTML = tableHTML;
    }

    /**
     * Sets up event listeners for various UI elements.
     */
    function setupEventListeners() {
        console.log('setupEventListeners called');

        console.log('comparisonTray:', comparisonTray);
        console.log('compareNowBtn:', compareNowBtn);
        console.log('clearCompareBtn:', clearCompareBtn);

        const advancedFiltersHeader = document.getElementById("advancedFiltersHeader");
        const advancedFiltersContainer = document.getElementById("advancedFiltersContainer");
        
        if (advancedFiltersHeader && advancedFiltersContainer) {
            advancedFiltersHeader.addEventListener("click", () => {
                advancedFiltersContainer.classList.toggle("is-open");
                const arrow = advancedFiltersHeader.querySelector(".toggle-arrow");
                if (advancedFiltersContainer.classList.contains("is-open")) {
                    arrow.style.transform = "rotate(180deg)";
                } else {
                    arrow.style.transform = "rotate(0deg)";
                }
            });
        }
        
        darkModeSwitch.addEventListener("change", () => setTheme(darkModeSwitch.checked ? "dark" : "light"));

        if (predictButton) {
            console.log('Attaching event listener to predictButton');
            predictButton.addEventListener("click", function(e) {
                console.log('Predict button clicked directly');
                handlePrediction();
            });
        } else {
            console.error('predictButton not found');
        }
        
        if (predictButtonBottom) {
            console.log('Attaching event listener to predictButtonBottom');
            predictButtonBottom.addEventListener("click", function(e) {
                console.log('Predict button bottom clicked directly');
                handlePrediction();
            });
        } else {
            console.log('predictButtonBottom not found');
        }

        sortBySelect.addEventListener("change", filterAndRenderColleges);

        if (compareNowBtn) {
            compareNowBtn.addEventListener('click', () => openComparisonModal(true));
        }

        document.addEventListener('click', function(e) {
            if (e.target.id === 'compare-now-btn' || (e.target.closest && e.target.closest('#compare-now-btn'))) {
                openComparisonModal(true);
            }
        });
        
        if (clearCompareBtn) {
            clearCompareBtn.addEventListener('click', () => {
                selectedColleges.forEach(c => {
                    const checkbox = document.getElementById(`compare-${c.uniqueId}`);
                    if (checkbox) checkbox.checked = false;
                });
                selectedColleges = [];
                updateComparisonTray();
            });
        }
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => comparisonModal.style.display = 'none');
        }
        if (comparisonModal) {
            comparisonModal.addEventListener('click', (e) => {
                if (e.target === comparisonModal) {
                    comparisonModal.style.display = 'none';
                }
            });
        }

        if (warningModal) {
            warningModalCloseBtn.addEventListener('click', () => warningModal.style.display = 'none');
            warningModal.addEventListener('click', (e) => {
                if (e.target === warningModal) {
                    warningModal.style.display = 'none';
                }
            });
        }
        
        clearButton.addEventListener("click", () => {
            console.log('Clear button clicked - clearing all form values');
            predictForm.reset();
            rankInput.value = '';

            document.querySelectorAll('#predictForm input[type="hidden"]').forEach(input => {
                console.log('Clearing hidden input:', input.id, 'value before:', input.value);
                input.value = '';
                console.log('Hidden input cleared:', input.id, 'value after:', input.value);
            });
            multiselectContainers.forEach(dropdown => {
                dropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; });
                updateSelectedItemsDisplay(dropdown, []);
            });
            renderEmptyState();
            rawData = [];
            sortedData = [];

            selectedColleges = [];
            updateComparisonTray();
        });

        downloadBtn.addEventListener('click', () => {
            if (sortedData.length === 0) {
                console.warn(translations.downloadNoData);
                return;
            }
            downloadMenu.style.display = downloadMenu.style.display === 'block' ? 'none' : 'block';
        });

        downloadPdfBtn.addEventListener('click', () => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const headers = [["College", "Branch", "Category", "Cutoff 2024", "Cutoff 2022", "Chance (%)", "Type", "Estd", "Affiliation"]];
            const body = sortedData.map(c => [
                c.institution_name || c.name, c.branch, c.category, c.cutoff, c.cutoff2022, c.probability, COLLEGE_TYPE_LABELS[c.collegeType] || c.collegeType || 'N/A', c.estd || 'N/A', c.affl || 'N/A'
            ]);
            doc.autoTable({ head: headers, body: body, startY: 10 });
            doc.save('EAMCET_Predictions.pdf');
            downloadMenu.style.display = 'none';
        });

        downloadCsvBtn.addEventListener('click', () => {
            const headers = ["College Name", "Branch", "Category", "Cutoff 2024", "Cutoff 2022", "Chance (%)", "Type", "Estd", "Affiliation", "Inst. Code", "District"];
            const rows = sortedData.map(c => [ c.institution_name || c.name, c.branch, c.category, c.cutoff, c.cutoff2022, c.probability, COLLEGE_TYPE_LABELS[c.collegeType] || c.collegeType || '', c.estd || '', c.affl || '', c.instcode, `${optionData.districts.find(d=>d.value === c.district)?.text || c.district}` ]);
            let csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.map(f => `"${String(f || '').replace(/"/g, '""')}"`).join(","))].join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "EAMCET_Predictions.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            downloadMenu.style.display = 'none';
        });

        window.addEventListener('scroll', () => {
            scrollButtons.classList.toggle('visible', window.scrollY > 200);
        });
        scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0 }));
        scrollBottomBtn.addEventListener('click', () => window.scrollTo({ top: document.body.scrollHeight }));

        document.addEventListener('click', (e) => {
            multiselectContainers.forEach(dropdown => { if (!dropdown.contains(e.target)) dropdown.classList.remove('open'); });
            if (downloadBtn && !downloadBtn.contains(e.target) && !downloadMenu.contains(e.target)) downloadMenu.style.display = 'none';
        });
    }

    /**
     * Handles the prediction process by collecting form data and calling the API.
     */
    function handlePrediction() {
        console.log('Predict button clicked - triggering form submission');
        console.log('Form element:', predictForm);
        console.log('Rank input value:', rankInput.value);

        const rank = parseInt(rankInput.value) || 0;
        const rankValue = rankInput.value.trim();
        
        console.log('Rank value:', rankValue);
        console.log('Parsed rank:', rank);

        if (rankValue !== '') {
            if (rank <= 0) {
                console.log('Invalid rank detected, showing validation modal');
                if (typeof showValidationModal === 'function' && ValidationMessages && ValidationMessages.invalidRank) {
                    showValidationModal(
                        ValidationMessages.invalidRank.title,
                        ValidationMessages.invalidRank.message,
                        ValidationMessages.invalidRank.type
                    );
                } else {
                    console.error('showValidationModal function or ValidationMessages.invalidRank not available');
                }
                return;
            }

            if (rank > 350000) {
                console.log('Rank out of range, showing validation modal');
                if (typeof showValidationModal === 'function') {
                    showValidationModal(
                        'Invalid Rank',
                        'Please enter a rank between 1 and 350000.',
                        'error'
                    );
                } else {
                    alert('Please enter a rank between 1 and 350000.');
                }
                return;
            }
        }

        const filters = {};
        const filterInputs = [
            { id: 'desiredBranch', paramName: 'branch' },
            { id: 'quota', paramName: 'quota' },
            { id: 'gender', paramName: 'gender' },
            { id: 'district', paramName: 'district' }
        ];
        
        filterInputs.forEach(filter => {
            const inputElement = document.getElementById(filter.id);
            if (inputElement && inputElement.value) {
                filters[filter.paramName] = inputElement.value;
                console.log(`Added ${filter.paramName} to filters:`, inputElement.value);
            }
        });

        const hasRank = rankValue !== '';
        const hasFilters = Object.keys(filters).some(key => filters[key]);
        
        console.log('Has rank:', hasRank);
        console.log('Has filters:', hasFilters);

        if (!hasRank && !hasFilters) {
            console.log('No input provided, showing validation modal');
            if (typeof showValidationModal === 'function' && ValidationMessages && ValidationMessages.noInput) {
                showValidationModal(
                    ValidationMessages.noInput.title,
                    ValidationMessages.noInput.message,
                    ValidationMessages.noInput.type
                );
            } else {
                console.error('showValidationModal function or ValidationMessages.noInput not available');
            }
            return;
        }

        const selectedQuota = (filters['quota'] || '').trim().toUpperCase();
        const selectedGender = (filters['gender'] || '').trim().toUpperCase();

        const ALL_CATEGORIES = [
            "BCA_BOYS", "BCA_GIRLS", "BCB_BOYS", "BCB_GIRLS", "BCC_BOYS", "BCC_GIRLS",
            "BCD_BOYS", "BCD_GIRLS", "BCE_BOYS", "BCE_GIRLS", "OC_BOYS", "OC_GIRLS",
            "OC_EWS_BOYS", "OC_EWS_GIRLS", "SC_BOYS", "SC_GIRLS", "ST_BOYS", "ST_GIRLS"
        ];

        function getMappedCategories(quota, gender) {
            if (!quota && !gender) {
                return ["OC_BOYS"];
            }
            if (!quota && gender) {
                return ALL_CATEGORIES.filter(c => c.endsWith("_" + gender));
            }
            if (quota && !gender) {
                return ALL_CATEGORIES.filter(c => c.startsWith(quota + "_"));
            }
            const specificCategory = `${quota}_${gender}`;
            if (ALL_CATEGORIES.includes(specificCategory)) {
                return [specificCategory];
            }
            return ["OC_BOYS"];
        }

        const mappedCategories = getMappedCategories(selectedQuota, selectedGender);
        const finalCategory = mappedCategories.join(',');

        let requestData = {
            rank: hasRank ? rank : null,
            category: finalCategory
        };

        // If a filter is single-select, we can pass it to the backend.
        // If it is multi-select (length > 1), we leave it null so backend fetches all,
        // and we filter it client-side in filterAndRenderColleges.
        const selectedBranches = (filters['branch'] || '').split(',').filter(Boolean);
        if (selectedBranches.length === 1) {
            requestData.branchCode = BRANCH_NAME_TO_CODE[selectedBranches[0]] || selectedBranches[0];
        }

        const selectedDistricts = (filters['district'] || '').split(',').filter(Boolean);
        if (selectedDistricts.length === 1) {
            requestData.district = selectedDistricts[0];
        }

        console.log('Final request data being sent:', requestData);

        console.log('Resetting results and showing spinner');
        resetResults();
        console.log('Calling showSpinner with true');
        showSpinner(true);

        console.log('Making API call with requestData:', requestData);
        const url = `/api/search-colleges`;
        console.log('API URL:', url);
        fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData)
        })
        .then(response => { 
            console.log('API response status:', response.status);
            console.log('API response ok:', response.ok);
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            } 
            return response.json(); 
        })
        .then(data => { 
            console.log('API response data received:', data);
            if (!data || !Array.isArray(data)) {
                throw new Error('Invalid data format received from API');
            }
            console.log('Mapping backend cards to frontend structure');
            rawData = data.map(item => mapBackendCollegeToFrontend(item)); 
            filterAndRenderColleges(); 
        })
        .catch(error => { 
            console.error("Fetch Error:", error); 
            if (typeof renderEmptyState === 'function' && translations && translations.fetchError) {
                renderEmptyState(translations.fetchError + " " + error.message); 
            } else {
                console.error('renderEmptyState function or translations.fetchError not available');
            }
        })
        .finally(() => {
            console.log('Fetch completed');
            console.log('Hiding spinner');
            showSpinner(false);
        });
    }

    setTimeout(function() {
        const compareNowBtn = document.getElementById('compare-now-btn');
        if (compareNowBtn) {
            compareNowBtn.addEventListener('click', function() {
                openComparisonModal(true);
            });
        }

        initializeMainComparisonTray();
    }, 1000);

    /**
     * Initializes the main comparison tray on page load.
     */
    function initializeMainComparisonTray() {
        const count = selectedColleges.length;
        
        console.log('initializeMainComparisonTray called, count:', count);
        console.log('comparisonTray element:', comparisonTray);
        
        if (comparisonTray) {
            console.log('Comparison tray found in initializeMainComparisonTray');

            console.log('Updating comparison tray visibility, count:', count);
            if (count > 0) {
                console.log('Adding visible class and removing hidden class');
                comparisonTray.classList.add('visible');
                comparisonTray.classList.remove('hidden');
                console.log('Set tray to visible');
            } else {
                console.log('Removing visible class and adding hidden class');
                comparisonTray.classList.remove('visible');
                comparisonTray.classList.add('hidden');
                console.log('Set tray to hidden');
            }

            if (compareNowBtn) {
                console.log('Setting compare button disabled state, count < 2:', count < 2);
                compareNowBtn.disabled = count < 2;
                console.log('Set compare button disabled:', count < 2);
            }
        } else {
            console.log('Comparison tray NOT found in initializeMainComparisonTray');
        }
    }
});