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

    // Mobile nav toggle
    const navToggle = document.querySelector('.nav-toggle');
    const mainNav = document.querySelector('.main-nav');
    if (navToggle && mainNav) {
        navToggle.addEventListener('click', () => {
            mainNav.classList.toggle('nav-open');
        });
    }

    branchSelection.parentElement.style.display = "block";

    const cachedBranches = localStorage.getItem('branchComparisonBranchesData');
    const cachedColleges = localStorage.getItem('branchComparisonCollegesData');
    const branchesCacheTimestamp = localStorage.getItem('branchComparisonBranchesDataTimestamp');
    const collegesCacheTimestamp = localStorage.getItem('branchComparisonCollegesDataTimestamp');
    
    if (cachedBranches && cachedColleges && branchesCacheTimestamp && collegesCacheTimestamp) {
        const branchesAgeInMinutes = (Date.now() - parseInt(branchesCacheTimestamp)) / (1000 * 60);
        const collegesAgeInMinutes = (Date.now() - parseInt(collegesCacheTimestamp)) / (1000 * 60);

        if (branchesAgeInMinutes < 30 && collegesAgeInMinutes < 60) {
            try {
                branches = JSON.parse(cachedBranches);
                const allColleges = JSON.parse(cachedColleges);
                console.log(`Loaded ${branches.length} branches and ${allColleges.length} colleges from localStorage cache`);

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
                        console.log(`Loaded ${branches.length} branches from localStorage cache`);

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
            console.log(`Loaded ${branches.length} branches from backend:`, branches);

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
        compareBtn.textContent = "Select at least 2 branches";
    }
    
    compareBtn.addEventListener("click", compareBranches);
    
    async function compareBranches() {
        loadingSpinner.style.display = "flex";
        loadingSpinner.innerHTML = '<div class="spinner"></div><p>Loading comparison data...</p>';
        comparisonResults.style.display = "none";
        branchData = {};
        
        try {
            console.log('Fetching branch comparison data from backend...');
            const response = await fetch(`/api/analytics/compare-branches?_=${new Date().getTime()}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const compareList = await response.json();
            console.log('Fetched comparison list from backend:', compareList);

            const BRANCH_NAME_TO_CODE = {};
            Object.entries(BRANCH_CODE_TO_NAME).forEach(([code, name]) => {
                BRANCH_NAME_TO_CODE[name] = code;
            });

            for (const branch of selectedBranches) {
                console.log(`Matching stats for branch: ${branch}`);
                const code = BRANCH_NAME_TO_CODE[branch] || branch;
                const item = compareList.find(i => i.branch_code === code);
                
                if (item) {
                    branchData[branch] = {
                        totalColleges: item.college_count
                    };
                    console.log(`Stats for ${branch}:`, branchData[branch]);
                } else {
                    branchData[branch] = {
                        totalColleges: 0
                    };
                    console.warn(`No stats found for branch: ${branch}`);
                }
            }
            
            if (Object.keys(branchData).length === 0) {
                throw new Error('No data found for selected branches. Please try different branches.');
            }
            
            console.log('Rendering comparison...');
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
            card.style.cssText = "text-align: center;";
            card.innerHTML = `
                <h4 style="color: var(--color-accent); margin-bottom: 1rem;">${branch}</h4>
                <div style="font-size: 2rem; font-weight: 700; color: var(--color-primary); margin: 0.5rem 0;">
                    ${data.totalColleges}
                </div>
                <p style="color: var(--color-text-secondary); margin: 0;">Colleges</p>
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

        const collegesCtx = document.getElementById("collegesChart");
        if (collegesCtx.chart) collegesCtx.chart.destroy();
        
        collegesCtx.chart = new Chart(collegesCtx, {
            type: 'bar',
            data: {
                labels: branchNames,
                datasets: [{
                    label: 'Number of Colleges',
                    data: collegeCounts,
                    backgroundColor: '#3498db',
                    borderColor: '#2980b9',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { 
                            precision: 0,
                            font: {
                                size: window.innerWidth < 768 ? 10 : 12
                            }
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: window.innerWidth < 480 ? 60 : 45,
                            minRotation: window.innerWidth < 480 ? 60 : 45,
                            font: {
                                size: window.innerWidth < 768 ? 10 : 12
                            }
                        }
                    }
                },
                plugins: {
                    legend: { 
                        display: false,
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
            { key: 'totalColleges', label: 'Total Colleges' }
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
                
                if (feature.isCurrency && typeof value === 'number') {
                    cell.textContent = value.toFixed(2);
                } else if (typeof value === 'number') {
                    cell.textContent = Math.round(value);
                } else {
                    cell.textContent = value;
                }
                
                row.appendChild(cell);
            });
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
    }

    function reloadBranchData() {

        sessionStorage.removeItem('branchComparisonBranchesData');
        sessionStorage.removeItem('branchComparisonCollegesData');

        location.reload();
    }

    window.reloadBranchData = reloadBranchData;
});