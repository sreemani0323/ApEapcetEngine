document.addEventListener('DOMContentLoaded', function () {

    // ── Dark mode ──
    const darkModeSwitch = document.getElementById('darkModeSwitch');
    const theme = localStorage.getItem('theme') || 'light';
    document.body.classList.toggle('dark-mode', theme === 'dark');
    let onThemeChange = null;
    if (darkModeSwitch) {
        darkModeSwitch.checked = theme === 'dark';
        darkModeSwitch.addEventListener('change', () => {
            const t = darkModeSwitch.checked ? 'dark' : 'light';
            document.body.classList.toggle('dark-mode', t === 'dark');
            localStorage.setItem('theme', t);
            // Re-render charts with correct theme colors
            if (lastData) renderCharts(lastData);
            // Re-render category chart with correct theme colors
            if (typeof onThemeChange === 'function') onThemeChange();
        });
    }




    // ── Get instcode from URL ──
    const params = new URLSearchParams(window.location.search);
    const instcode = params.get('instcode');

    if (!instcode) {
        if (typeof window.showSmartSpinner === 'function') {
            window.showSmartSpinner(false);
        } else {
            document.getElementById('loadingSpinner').style.display = 'none';
        }
        document.getElementById('errorState').style.display = 'block';
        return;
    }

    // ── Constants ──
    const BRANCH_CODE_TO_NAME = {
        "AGR": "Agricultural Engineering", "AI": "Artificial Intelligence",
        "AID": "AI & Data Science", "AIM": "AI & Machine Learning",
        "ASE": "Aerospace Engineering", "AUT": "Automobile Engineering",
        "BDT": "Dairy Technology", "BIO": "Biotechnology",
        "CAD": "CSE (AI & Data Science)", "CAI": "CSE (AI)",
        "CBA": "CSE (Big Data Analytics)", "CCC": "CSE (Cloud Computing)",
        "CHE": "Chemical Engineering", "CIC": "CSE (IoT & Cyber Security)",
        "CIT": "CS & IT", "CIV": "Civil Engineering",
        "CN": "Computer Networking", "CS": "Cyber Security",
        "CSB": "CS & Business Systems", "CSBS": "CSE (Business Systems)",
        "CSC": "CSE (Cyber Security)", "CSD": "CSE (Data Science)",
        "CSE": "Computer Science & Engineering", "CSEB": "CSE & Business Systems",
        "CSER": "CSE (Regional - Telugu)", "CSG": "CS & Design",
        "CSM": "CSE (AI & ML)", "CSO": "CSE (IoT)",
        "CSS": "CS & Systems Engineering", "CST": "CS & Technology",
        "CSW": "Computer Engineering (Software)", "DS": "Data Science",
        "EBM": "ECE (Bio-Medical)", "ECE": "Electronics & Communication",
        "ECM": "Electronics & Computer", "ECT": "EC Technology",
        "EEE": "Electrical & Electronics", "EIE": "Electronics & Instrumentation",
        "EII": "ECE (Industry Integrated)", "FDE": "Food Engineering",
        "FDT": "Food Technology", "GIN": "Geo-Informatics",
        "INF": "Information Technology", "IOT": "Internet of Things",
        "MEC": "Mechanical Engineering", "MET": "Metallurgical Engineering",
        "MIN": "Mining Engineering", "MMT": "Mineral & Metallurgy",
        "MTE": "Mechatronics", "PHM": "Pharmacy",
        "PHD": "Pharm.D", "PET": "Petroleum Engineering",
        "ROB": "Robotics", "TEX": "Textile Technology"
    };

    const COLLEGE_TYPE_LABELS = {
        'PVT': 'Private', 'UNIV': 'University', 'SF': 'Govt-Aided',
        'PU': 'Private University', 'SS': 'State-Sponsored', 'GOV': 'Government'
    };

    const CATEGORIES = [
        'OC_BOYS', 'OC_GIRLS', 'OC_EWS_BOYS', 'OC_EWS_GIRLS',
        'BCA_BOYS', 'BCA_GIRLS', 'BCB_BOYS', 'BCB_GIRLS',
        'BCC_BOYS', 'BCC_GIRLS', 'BCD_BOYS', 'BCD_GIRLS',
        'BCE_BOYS', 'BCE_GIRLS', 'SC_BOYS', 'SC_GIRLS',
        'ST_BOYS', 'ST_GIRLS'
    ];

    function formatCategory(cat) {
        if (!cat) return 'N/A';
        const parts = cat.split('_');
        if (parts.length >= 2) {
            const gender = parts[parts.length - 1];
            const quota = parts.slice(0, -1).join(' ');
            return `${quota} ${gender === 'BOYS' ? 'Boys' : 'Girls'}`;
        }
        return cat;
    }

    // ── Populate category dropdown ──
    const select = document.getElementById('categorySelect');
    CATEGORIES.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = formatCategory(cat);
        select.appendChild(opt);
    });

    let currentCategory = 'OC_BOYS';
    let lastData = null;
    let cutoffChartInstance = null;
    let changeChartInstance = null;

    // ── Load detail ──
    async function loadDetail(category) {
        if (typeof window.showSmartSpinner === 'function') {
            window.showSmartSpinner(true, { type: 'college' });
        } else {
            document.getElementById('loadingSpinner').style.display = 'flex';
        }
        document.getElementById('collegeInfo').style.display = 'none';
        document.getElementById('errorState').style.display = 'none';

        try {
            const res = await fetch(`/api/colleges/${instcode}/detail?category=${category}`);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            lastData = data;
            renderCollege(data);
        } catch (err) {
            console.error('Failed to load college detail:', err);
            if (typeof window.showSmartSpinner === 'function') {
                window.showSmartSpinner(false);
            } else {
                document.getElementById('loadingSpinner').style.display = 'none';
            }
            document.getElementById('errorState').style.display = 'block';
            document.getElementById('errorTitle').textContent = 'Failed to Load';
            document.getElementById('errorMsg').textContent = `Could not fetch data for institution "${instcode}". The backend may be down.`;
        }
    }

    // ── Render College ──
    function renderCollege(data) {
        if (typeof window.showSmartSpinner === 'function') {
            window.showSmartSpinner(false);
        } else {
            document.getElementById('loadingSpinner').style.display = 'none';
        }
        document.getElementById('collegeInfo').style.display = 'block';
        document.title = `${data.name} — ApEapcetEngine`;

        // Hero
        document.getElementById('collegeHeroTitle').innerHTML =
            `<i class="fa-solid fa-building-columns"></i> ${data.name}`;
        document.getElementById('collegeHeroSub').textContent =
            `${data.district || ''} · ${COLLEGE_TYPE_LABELS[data.type] || data.type || ''} · Est. ${data.estd || 'N/A'}`;

        // Info bento grid
        const grid = document.getElementById('infoGrid');
        const branchCount = data.branches ? data.branches.length : 0;
        const hasCutoffs = data.branches && data.branches.some(b => b.cutoff_2024 != null);
        const bestCutoff = hasCutoffs
            ? Math.min(...data.branches.filter(b => b.cutoff_2024 != null).map(b => b.cutoff_2024))
            : null;

        grid.innerHTML = `
            <div class="bento-tile bento-tile-primary">
                <div class="bento-tile-label">Institution Code</div>
                <div class="bento-tile-number" style="font-size:1.6rem;">${data.instcode}</div>
            </div>
            <div class="bento-tile">
                <div class="bento-tile-label">College Type</div>
                <div class="bento-tile-number" style="font-size:1.1rem;color:var(--primary);">${COLLEGE_TYPE_LABELS[data.type] || data.type || 'N/A'}</div>
            </div>
            <div class="bento-tile">
                <div class="bento-tile-label">Established</div>
                <div class="bento-tile-number">${data.estd || 'N/A'}</div>
            </div>
            <div class="bento-tile">
                <div class="bento-tile-label">Location</div>
                <div class="bento-tile-number" style="font-size:1rem;color:var(--text-secondary);">
                    ${data.place || ''} ${data.district ? '(' + data.district + ')' : ''}
                </div>
            </div>
            <div class="bento-tile">
                <div class="bento-tile-label">Affiliation</div>
                <div class="bento-tile-number" style="font-size:1.1rem;">${data.affiliation || 'N/A'}</div>
            </div>
            <div class="bento-tile">
                <div class="bento-tile-label">Admission</div>
                <div class="bento-tile-number" style="font-size:1.1rem;">${data.coed === 'GIRLS' ? "Women's Only" : 'Co-Ed'}</div>
            </div>
            <div class="bento-tile">
                <div class="bento-tile-label">Branches</div>
                <div class="bento-tile-number">${branchCount}</div>
            </div>
            <div class="bento-tile">
                <div class="bento-tile-label">Best Cutoff 2024</div>
                <div class="bento-tile-number" style="color:var(--accent-safe);">${bestCutoff ? bestCutoff.toLocaleString() : 'N/A'}</div>
            </div>
        `;

        renderCharts(data);
        renderBranchTable(data);
    }

    // ── Render Charts ──
    function renderCharts(data) {
        if (!data.branches || data.branches.length === 0) return;
        const isDark = document.body.classList.contains('dark-mode');
        const textColor = isDark ? '#E5E7EB' : '#1A1A2E';
        const gridColor = isDark ? '#3A3A5C' : '#E5E7EB';

        Chart.defaults.color = textColor;
        Chart.defaults.borderColor = gridColor;

        renderCutoffChart(data.branches, isDark, gridColor);
        renderChangeChart(data.branches, isDark, gridColor);
    }

    function renderCutoffChart(branches, isDark, gridColor) {
        const ctx = document.getElementById('cutoffChart');
        if (cutoffChartInstance) cutoffChartInstance.destroy();

        const labels = branches.map(b => b.branch_code);

        cutoffChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Cutoff 2022',
                        data: branches.map(b => b.cutoff_2022),
                        backgroundColor: '#FFB703',
                        borderColor: '#1A1A2E',
                        borderWidth: 2,
                        borderRadius: 6
                    },
                    {
                        label: 'Cutoff 2024',
                        data: branches.map(b => b.cutoff_2024),
                        backgroundColor: '#4361EE',
                        borderColor: '#1A1A2E',
                        borderWidth: 2,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { font: { family: 'Inter', size: 13, weight: '600' }, padding: 20 }
                    },
                    tooltip: {
                        callbacks: {
                            title: items => BRANCH_CODE_TO_NAME[items[0].label] || items[0].label,
                            label: item => `Rank: ${item.raw != null ? item.raw.toLocaleString() : 'N/A'}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Cutoff Rank', font: { family: 'Inter', weight: '600' } },
                        grid: { color: gridColor }
                    },
                    x: { grid: { display: false } }
                },
                animation: { duration: 1200, easing: 'easeOutQuart' }
            }
        });
    }

    function renderChangeChart(branches, isDark, gridColor) {
        const ctx = document.getElementById('changeChart');
        if (changeChartInstance) changeChartInstance.destroy();

        const filtered = branches.filter(b => b.cutoff_2022 != null && b.cutoff_2024 != null);
        if (filtered.length === 0) {
            ctx.parentElement.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">No 2022 vs 2024 data available for comparison.</p>';
            return;
        }

        const labels = filtered.map(b => b.branch_code);
        const changes = filtered.map(b =>
            parseFloat(((b.cutoff_2024 - b.cutoff_2022) / b.cutoff_2022 * 100).toFixed(1))
        );
        const colors = changes.map(c => c < 0 ? '#EF476F' : '#2DC653');

        changeChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: '% Change (2022→2024)',
                    data: changes,
                    backgroundColor: colors,
                    borderColor: '#1A1A2E',
                    borderWidth: 2,
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: items => BRANCH_CODE_TO_NAME[items[0].label] || items[0].label,
                            label: item => {
                                const v = item.raw;
                                return `${v > 0 ? '+' : ''}${v}% — ${v < 0 ? 'Getting Harder' : 'Getting Easier'}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: '% Change in Cutoff Rank', font: { family: 'Inter', weight: '600' } },
                        grid: { color: gridColor }
                    },
                    y: { grid: { display: false } }
                },
                animation: { duration: 1200, easing: 'easeOutQuart' }
            }
        });
    }

    // ── Render Branch Table ──
    function renderBranchTable(data) {
        const thead = document.getElementById('branchTableHead');
        const tbody = document.getElementById('branchTableBody');

        const thStyle = 'padding:1rem;text-align:left;background:var(--primary-light);color:var(--primary);font-family:var(--font-heading);font-weight:700;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px;border-bottom:3px solid var(--primary);';
        thead.innerHTML = `
            <th style="${thStyle}">Branch</th>
            <th style="${thStyle}">Cutoff 2022</th>
            <th style="${thStyle}">Cutoff 2024</th>
            <th style="${thStyle}">Change</th>
            <th style="${thStyle}">Trend</th>
        `;

        tbody.innerHTML = '';
        if (!data.branches || data.branches.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding:2rem;text-align:center;color:var(--text-muted);">No branch data available for this category.</td></tr>';
            return;
        }

        data.branches.forEach(b => {
            const hasChange = b.cutoff_2022 != null && b.cutoff_2024 != null;
            const change = hasChange
                ? parseFloat(((b.cutoff_2024 - b.cutoff_2022) / b.cutoff_2022 * 100).toFixed(1))
                : null;

            let trendHtml = '<span style="color:var(--text-muted);">—</span>';
            let changeHtml = '<span style="color:var(--text-muted);">N/A</span>';
            let changeColor = 'var(--text-muted)';

            if (change !== null) {
                if (change < -5) {
                    trendHtml = '<span style="background:rgba(239,71,111,0.1);color:#EF476F;padding:0.25rem 0.6rem;border-radius:4px;font-weight:700;font-size:0.8rem;border:1.5px solid #EF476F;">🔴 Harder</span>';
                    changeColor = '#EF476F';
                } else if (change > 5) {
                    trendHtml = '<span style="background:rgba(45,198,83,0.1);color:#2DC653;padding:0.25rem 0.6rem;border-radius:4px;font-weight:700;font-size:0.8rem;border:1.5px solid #2DC653;">🟢 Easier</span>';
                    changeColor = '#2DC653';
                } else {
                    trendHtml = '<span style="background:rgba(107,114,128,0.08);color:#6B7280;padding:0.25rem 0.6rem;border-radius:4px;font-weight:700;font-size:0.8rem;border:1.5px solid #9CA3AF;">⚪ Stable</span>';
                    changeColor = '#6B7280';
                }
                changeHtml = `<span style="color:${changeColor};font-weight:700;">${change > 0 ? '+' : ''}${change}%</span>`;
            }

            const branchName = BRANCH_CODE_TO_NAME[b.branch_code] || b.branch_code;
            const tdStyle = 'padding:0.85rem 1rem;border-bottom:1px solid rgba(26,26,46,0.08);';

            const row = document.createElement('tr');
            row.style.transition = 'background 0.2s ease';
            row.addEventListener('mouseenter', () => row.style.background = 'rgba(67,97,238,0.04)');
            row.addEventListener('mouseleave', () => row.style.background = '');
            row.innerHTML = `
                <td style="${tdStyle}font-weight:600;">${branchName} <span style="color:var(--text-muted);font-size:0.75rem;">(${b.branch_code})</span></td>
                <td style="${tdStyle}font-family:var(--font-heading);">${b.cutoff_2022 != null ? b.cutoff_2022.toLocaleString() : 'N/A'}</td>
                <td style="${tdStyle}font-family:var(--font-heading);font-weight:700;">${b.cutoff_2024 != null ? b.cutoff_2024.toLocaleString() : 'N/A'}</td>
                <td style="${tdStyle}">${changeHtml}</td>
                <td style="${tdStyle}">${trendHtml}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // ── Category change handler ──
    select.addEventListener('change', function () {
        currentCategory = this.value;
        loadDetail(currentCategory);
    });

    // ── Initial load ──
    loadDetail(currentCategory);

    // ══════════════════════════════════════════════════════
    // ── Category Comparison Chart (cutoffs by category) ──
    // ══════════════════════════════════════════════════════
    let categoryChartInstance = null;
    const categoryBranchSelect = document.getElementById('categoryChartBranchSelect');

    const CATEGORY_COLORS = {
        OC:  '#4361ee',
        EWS: '#00b4d8',
        BCA: '#f77f00', BCB: '#f77f00', BCC: '#f77f00', BCD: '#f77f00', BCE: '#f77f00',
        SC:  '#2ec4b6',
        ST:  '#9b5de5'
    };

    function getCategoryColor(cat) {
        if (cat.startsWith('OC_EWS')) return CATEGORY_COLORS.EWS;
        for (const prefix of Object.keys(CATEGORY_COLORS)) {
            if (cat.startsWith(prefix)) return CATEGORY_COLORS[prefix];
        }
        return '#6B7280';
    }

    // Populate branch dropdown whenever college data loads
    function populateCategoryBranchSelect(data) {
        if (!categoryBranchSelect || !data.branches) return;
        categoryBranchSelect.innerHTML = '';
        data.branches.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.branch_code;
            opt.textContent = `${BRANCH_CODE_TO_NAME[b.branch_code] || b.branch_code} (${b.branch_code})`;
            categoryBranchSelect.appendChild(opt);
        });
        // Auto-load chart for the first branch
        if (data.branches.length > 0) {
            loadCategoryChart(data.branches[0].branch_code);
        }
    }

    // Fetch cutoff for all categories for a given branch, render chart
    async function loadCategoryChart(branchCode) {
        const canvas = document.getElementById('categoryChart');
        if (!canvas) return;

        // Show a loading state on the canvas
        if (categoryChartInstance) categoryChartInstance.destroy();
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const promises = CATEGORIES.map(cat =>
            fetch(`/api/colleges/${instcode}/detail?category=${cat}`)
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (!data || !data.branches) return { category: cat, cutoff: null };
                    const branch = data.branches.find(b => b.branch_code === branchCode);
                    return { category: cat, cutoff: branch ? branch.cutoff_2024 : null };
                })
                .catch(err => {
                    console.warn(`Category ${cat} fetch failed:`, err.message);
                    return { category: cat, cutoff: null };
                })
        );

        const results = await Promise.allSettled(promises);
        const chartData = results
            .map(r => r.status === 'fulfilled' ? r.value : null)
            .filter(d => d && d.cutoff != null);

        if (chartData.length === 0) {
            canvas.parentElement.querySelector('#categoryChart')
                && (canvas.style.display = 'none');
            // Show no-data message
            let noDataMsg = canvas.parentElement.querySelector('.no-data-msg');
            if (!noDataMsg) {
                noDataMsg = document.createElement('p');
                noDataMsg.className = 'no-data-msg';
                noDataMsg.style.cssText = 'text-align:center;color:var(--text-muted);padding:2rem;';
                canvas.parentElement.appendChild(noDataMsg);
            }
            noDataMsg.textContent = `No cutoff data available across categories for ${BRANCH_CODE_TO_NAME[branchCode] || branchCode}.`;
            return;
        }

        // Remove no-data message if present, show canvas
        canvas.style.display = '';
        const noDataMsg = canvas.parentElement.querySelector('.no-data-msg');
        if (noDataMsg) noDataMsg.remove();

        const isDark = document.body.classList.contains('dark-mode');
        const textColor = isDark ? '#E5E7EB' : '#1A1A2E';
        const gridColor = isDark ? '#3A3A5C' : '#E5E7EB';

        const labels = chartData.map(d => formatCategory(d.category));
        const values = chartData.map(d => d.cutoff);
        const bgColors = chartData.map(d => getCategoryColor(d.category));
        const borderColors = bgColors.map(c => {
            // Slightly darken for border
            return isDark ? 'rgba(255,255,255,0.15)' : '#1A1A2E';
        });

        categoryChartInstance = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Cutoff Rank 2024',
                    data: values,
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                    borderWidth: 2,
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: item => `Rank: ${item.raw != null ? item.raw.toLocaleString() : 'N/A'}`
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: { display: true, text: 'Cutoff Rank', font: { family: 'Inter', weight: '600' } },
                        grid: { color: gridColor },
                        ticks: { color: textColor }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: textColor, font: { family: 'Inter', weight: '600', size: 12 } }
                    }
                },
                animation: { duration: 1200, easing: 'easeOutQuart' }
            }
        });
    }

    // Hook into renderCollege to populate the branch dropdown
    const originalRenderCollege = renderCollege;
    renderCollege = function (data) {
        originalRenderCollege(data);
        populateCategoryBranchSelect(data);
        // Set onThemeChange to re-render the category chart on theme toggle
        onThemeChange = () => {
            if (categoryBranchSelect && categoryBranchSelect.value) {
                loadCategoryChart(categoryBranchSelect.value);
            }
        };
    };

    // Branch change handler for category chart
    if (categoryBranchSelect) {
        categoryBranchSelect.addEventListener('change', function () {
            loadCategoryChart(this.value);
        });
    }
});
