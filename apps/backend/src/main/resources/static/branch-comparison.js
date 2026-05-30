document.addEventListener("DOMContentLoaded", async function () {


    function createBackgroundAnimation() {
        const container = document.getElementById('backgroundAnimation');
        if (!container) return;

        container.innerHTML = '';

        for (let i = 0; i < 15; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');

            const size = Math.random() * 6 + 2;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;

            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;

            const duration = Math.random() * 15 + 10;
            particle.style.animationDuration = `${duration}s`;

            const delay = Math.random() * 5;
            particle.style.animationDelay = `${delay}s`;
            
            container.appendChild(particle);
        }
    }

    createBackgroundAnimation();

    const darkModeSwitch = document.getElementById("darkModeSwitch");
    const branchSelection = document.getElementById("branchSelection");
    const compareBtn = document.getElementById("compareBtn");
    const loadingSpinner = document.getElementById("loadingSpinner");
    const comparisonResults = document.getElementById("comparisonResults");
    const summaryCards = document.getElementById("summaryCards");
    
    let branches = [];
    let selectedBranches = [];
    let branchData = {};

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

    const theme = localStorage.getItem("theme") || 'light';
    document.body.classList.toggle("dark-mode", theme === "dark");
    darkModeSwitch.checked = theme === "dark";
    darkModeSwitch.addEventListener("change", () => {
        const newTheme = darkModeSwitch.checked ? "dark" : "light";
        document.body.classList.toggle("dark-mode", newTheme === "dark");
        localStorage.setItem("theme", newTheme);
    });




    branchSelection.parentElement.style.display = "block";

    const cachedBranches = localStorage.getItem('branchComparisonBranchesData');
    const branchesCacheTimestamp = localStorage.getItem('branchComparisonBranchesDataTimestamp');
    
    if (cachedBranches && branchesCacheTimestamp) {
        const branchesAgeInMinutes = (Date.now() - parseInt(branchesCacheTimestamp)) / (1000 * 60);

        if (branchesAgeInMinutes < 30) {
            try {
                branches = JSON.parse(cachedBranches);

                renderBranchCheckboxes();
                
                loadingSpinner.style.display = "none";
                return;
            } catch (e) {
                console.error("Failed to parse cached branch comparison data:", e);

                loadInitialData();
            }
        }
    }

    loadInitialData();
    
    async function loadInitialData() {
        try {
            loadingSpinner.style.display = "flex";
            loadingSpinner.innerHTML = '<div class="spinner"></div><p>Loading available branches...</p>';

            const cachedBranches = localStorage.getItem('branchComparisonBranchesData');
            const cacheTimestamp = localStorage.getItem('branchComparisonBranchesDataTimestamp');
            
            if (cachedBranches && cacheTimestamp) {
                const ageInMinutes = (Date.now() - parseInt(cacheTimestamp)) / (1000 * 60);
                if (ageInMinutes < 30) { // Cache is valid for 30 minutes
                    try {
                        branches = JSON.parse(cachedBranches);

                        renderBranchCheckboxes();
                        
                        loadingSpinner.style.display = "none";
                        return;
                    } catch (e) {
                        console.warn("Failed to parse cached branch comparison branches data:", e);
                    }
                }
            }

            const response = await fetch(`/api/analytics/branches?_=${new Date().getTime()}`);
            if (!response.ok) {
                throw new Error(`Failed to load branches: ${response.status}`);
            }
            
            branches = await response.json();

            try {
                localStorage.setItem('branchComparisonBranchesData', JSON.stringify(branches));
                localStorage.setItem('branchComparisonBranchesDataTimestamp', Date.now().toString());
            } catch (e) {
                console.warn("Failed to cache branch comparison branches data:", e);
            }
            
            if (branches.length === 0) {
                throw new Error('No branches found in database');
            }

            renderBranchCheckboxes();
            
            loadingSpinner.style.display = "none";
            
        } catch (err) {
            console.error('Failed to load branches:', err);
            loadingSpinner.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e74c3c; margin-bottom: 1rem;"></i>
                    <h3 style="color: var(--color-primary); margin-bottom: 1rem;">Failed to Load Branches</h3>
                    <p style="color: var(--color-text-secondary); margin-bottom: 1.5rem;">
                        ${err.message || 'Could not connect to server.'}
                    </p>
                    <button onclick="location.reload()" class="btn-primary">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        }
    }
    
    function renderBranchCheckboxes() {
        branches.forEach(branch => {
            const div = document.createElement("div");
            div.className = "branch-checkbox";
            div.innerHTML = `
                <input type="checkbox" id="branch_${branch.replace(/\s+/g, '_')}" value="${branch}" />
                <label for="branch_${branch.replace(/\s+/g, '_')}" style="cursor: pointer; flex: 1;">${branch}</label>
            `;
            
            const checkbox = div.querySelector("input");
            checkbox.addEventListener("change", function() {
                if (this.checked) {
                    selectedBranches.push(branch);

                } else {
                    selectedBranches = selectedBranches.filter(b => b !== branch);

                }
                
                compareBtn.disabled = selectedBranches.length < 2;
                if (selectedBranches.length < 2) {
                    compareBtn.textContent = "Select at least 2 branches";
                } else {
                    compareBtn.innerHTML = `<i class="fas fa-chart-bar"></i> Compare ${selectedBranches.length} Branches`;
                }
            });
            
            branchSelection.appendChild(div);
        });
        
        compareBtn.disabled = true;
    }
    
    compareBtn.addEventListener("click", compareBranches);
    
    async function compareBranches() {
        loadingSpinner.style.display = "flex";
        loadingSpinner.innerHTML = '<div class="spinner"></div><p>Loading comparison data...</p>';
        comparisonResults.style.display = "none";
        branchData = {};
        
        try {
            const [compareRes, trendRes] = await Promise.all([
                fetch(`/api/analytics/compare-branches?_=${new Date().getTime()}`),
                fetch(`/api/analytics/trending-branches?all=true&_=${new Date().getTime()}`)
            ]);
            
            if (!compareRes.ok || !trendRes.ok) {
                throw new Error(`HTTP error! statuses: ${compareRes.status} / ${trendRes.status}`);
            }
            
            const compareList = await compareRes.json();
            const trendList = await trendRes.json();

            const BRANCH_NAME_TO_CODE = {};
            Object.entries(BRANCH_CODE_TO_NAME).forEach(([code, name]) => {
                BRANCH_NAME_TO_CODE[name] = code;
            });

            for (const branch of selectedBranches) {
                const code = BRANCH_NAME_TO_CODE[branch] || branch;
                const item = compareList.find(i => i.branch_code === code);
                const trendItem = trendList.find(i => i.branch_code === code);
                
                branchData[branch] = {
                    totalColleges: item ? item.college_count : 0,
                    medianCutoff2022: trendItem && trendItem.median_cutoff_2022 ? Math.round(trendItem.median_cutoff_2022) : null,
                    medianCutoff2024: trendItem && trendItem.median_cutoff_2024 ? Math.round(trendItem.median_cutoff_2024) : null,
                    competitionIncrease: trendItem ? Math.round(trendItem.competition_increase) : 0,
                    trendStatus: trendItem ? trendItem.trend_status : 'Stable'
                };
            }
            
            if (Object.keys(branchData).length === 0) {
                throw new Error('No data found for selected branches. Please try different branches.');
            }
            renderComparison();
            loadingSpinner.style.display = "none";
            comparisonResults.style.display = "block";
            comparisonResults.scrollIntoView({ behavior: "smooth" });
            
        } catch (err) {
            console.error("Failed to fetch branch data:", err);
            loadingSpinner.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e74c3c; margin-bottom: 1rem;"></i>
                    <h3 style="color: var(--color-primary); margin-bottom: 1rem;">Failed to Load Comparison</h3>
                    <p style="color: var(--color-text-secondary); margin-bottom: 1.5rem;">
                        ${err.message || 'An error occurred while loading branch comparison data.'}
                    </p>
                    <button onclick="location.reload()" class="btn-primary">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        }
    }
    
    function renderComparison() {
        summaryCards.innerHTML = "";
        Object.entries(branchData).forEach(([branch, data]) => {
            const card = document.createElement("div");
            card.className = "chart-container";
            card.innerHTML = `
                <h4 style="color: var(--color-accent); margin-bottom: 0.75rem; border-bottom: 2px solid var(--border-light); padding-bottom: 0.5rem; font-family: var(--font-heading); font-weight: 700;">${branch}</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; text-align: left; font-size: 0.85rem;">
                    <div>
                        <span style="color: var(--color-text-secondary); font-size: 0.75rem; display: block;">Colleges</span>
                        <strong style="font-size: 1.1rem; color: var(--color-primary); font-family: var(--font-heading);">${data.totalColleges}</strong>
                    </div>
                    <div>
                        <span style="color: var(--color-text-secondary); font-size: 0.75rem; display: block;">Trend</span>
                        <strong style="font-size: 0.85rem; color: ${data.trendStatus.includes('Competitive') || data.trendStatus.includes('Harder') ? '#EF476F' : '#2DC653'}; font-family: var(--font-heading);">${data.trendStatus}</strong>
                    </div>
                    <div>
                        <span style="color: var(--color-text-secondary); font-size: 0.75rem; display: block;">2024 Median Cutoff</span>
                        <strong style="font-size: 1.1rem; color: var(--color-primary); font-family: var(--font-heading);">${data.medianCutoff2024 ? data.medianCutoff2024.toLocaleString() : 'N/A'}</strong>
                    </div>
                    <div>
                        <span style="color: var(--color-text-secondary); font-size: 0.75rem; display: block;">2022 Median Cutoff</span>
                        <strong style="font-size: 1.1rem; color: var(--color-primary); font-family: var(--font-heading);">${data.medianCutoff2022 ? data.medianCutoff2022.toLocaleString() : 'N/A'}</strong>
                    </div>
                </div>
            `;
            summaryCards.appendChild(card);
        });

        renderCharts();
        renderTable();
    }
    
    function renderCharts() {
        const isDark = document.body.classList.contains("dark-mode");
        const textColor = isDark ? '#c9d1d9' : '#2c3e50';
        const gridColor = isDark ? '#30363d' : '#e0e0e0';
        
        Chart.defaults.color = textColor;
        Chart.defaults.borderColor = gridColor;
        
        const branchNames = Object.keys(branchData);
        const collegeCounts = branchNames.map(b => branchData[b].totalColleges);

        // Chart 1: Number of Colleges (Horizontal Bar)
        const collegesCtx = document.getElementById("collegesChart");
        if (collegesCtx.chart) collegesCtx.chart.destroy();
        
        collegesCtx.chart = new Chart(collegesCtx, {
            type: 'bar',
            data: {
                labels: branchNames,
                datasets: [{
                    label: 'Number of Colleges',
                    data: collegeCounts,
                    backgroundColor: '#4361EE',
                    borderColor: '#1A1A2E',
                    borderWidth: 2,
                    borderRadius: 6,
                    minBarLength: 10 // Ensures small counts like 1 are clearly visible!
                }]
            },
            options: {
                indexAxis: 'y', // Horizontal bars for perfect legibility!
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: { 
                            precision: 0,
                            font: {
                                size: window.innerWidth < 768 ? 10 : 12
                            }
                        },
                        title: {
                            display: true,
                            text: 'Number of Colleges offering this Program',
                            font: { weight: 'bold' }
                        }
                    },
                    y: {
                        ticks: {
                            font: {
                                size: window.innerWidth < 768 ? 10 : 12
                            }
                        }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

        // Chart 2: Median Cutoff Comparison (Horizontal Bar)
        const cutoffCtx = document.getElementById("cutoffChart");
        if (cutoffCtx.chart) cutoffCtx.chart.destroy();
        
        const m22 = branchNames.map(b => branchData[b].medianCutoff2022);
        const m24 = branchNames.map(b => branchData[b].medianCutoff2024);
        
        cutoffCtx.chart = new Chart(cutoffCtx, {
            type: 'bar',
            data: {
                labels: branchNames,
                datasets: [
                    {
                        label: 'Median Cutoff 2022',
                        data: m22,
                        backgroundColor: '#FFB703',
                        borderColor: '#1A1A2E',
                        borderWidth: 2,
                        borderRadius: 6
                    },
                    {
                        label: 'Median Cutoff 2024',
                        data: m24,
                        backgroundColor: '#4361EE',
                        borderColor: '#1A1A2E',
                        borderWidth: 2,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                indexAxis: 'y', // Horizontal bars for perfect legibility!
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: { 
                            font: {
                                size: window.innerWidth < 768 ? 10 : 12
                            }
                        },
                        title: {
                            display: true,
                            text: 'Closing Rank (Lower = Higher Demand)',
                            font: {
                                weight: 'bold'
                            }
                        }
                    },
                    y: {
                        ticks: {
                            font: {
                                size: window.innerWidth < 768 ? 10 : 12
                            }
                        }
                    }
                },
                plugins: {
                    legend: { 
                        position: 'top',
                        labels: {
                            font: {
                                size: window.innerWidth < 768 ? 10 : 12
                            }
                        }
                    }
                }
            }
        });
    }
    
    function renderTable() {
        const table = document.getElementById("comparisonTable");
        table.innerHTML = "";

        const features = [
            { key: 'totalColleges', label: 'Total Colleges' },
            { key: 'medianCutoff2024', label: '2024 Median Cutoff', isRank: true },
            { key: 'medianCutoff2022', label: '2022 Median Cutoff', isRank: true },
            { key: 'competitionIncrease', label: 'Competition Shift (+ is Harder)', isShift: true },
            { key: 'trendStatus', label: 'Trend Status' }
        ];

        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");

        const featureHeader = document.createElement("th");
        featureHeader.textContent = "Feature";
        featureHeader.className = "sticky-feature";
        headerRow.appendChild(featureHeader);

        Object.keys(branchData).forEach(branch => {
            const th = document.createElement("th");
            th.textContent = branch;
            th.className = "text-center";
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");

        features.forEach(feature => {
            const row = document.createElement("tr");

            const featureCell = document.createElement("td");
            featureCell.textContent = feature.label;
            featureCell.className = "sticky-feature";
            row.appendChild(featureCell);

            Object.entries(branchData).forEach(([branch, data]) => {
                const cell = document.createElement("td");
                let value = data[feature.key];
                
                if (feature.isRank && typeof value === 'number') {
                    cell.textContent = value.toLocaleString();
                } else if (feature.isShift && typeof value === 'number') {
                    const absVal = Math.abs(value).toLocaleString();
                    cell.textContent = value > 0 ? `+${absVal} (Harder)` : value < 0 ? `-${absVal} (Easier)` : '0 (Stable)';
                    cell.style.color = value > 0 ? '#EF476F' : value < 0 ? '#2DC653' : 'inherit';
                    cell.style.fontWeight = '700';
                } else if (typeof value === 'number') {
                    cell.textContent = Math.round(value);
                } else {
                    cell.textContent = value;
                    if (feature.key === 'trendStatus') {
                        cell.style.color = value.includes('Competitive') || value.includes('Harder') ? '#EF476F' : value.includes('Easier') ? '#2DC653' : 'inherit';
                        cell.style.fontWeight = '700';
                    }
                }
                
                row.appendChild(cell);
            });
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
    }

    function reloadBranchData() {
        localStorage.removeItem('branchComparisonBranchesData');
        location.reload();
    }

    window.reloadBranchData = reloadBranchData;
});