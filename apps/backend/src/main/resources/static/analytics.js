document.addEventListener("DOMContentLoaded", function () {
    const darkModeSwitch = document.getElementById("darkModeSwitch");
    const loadingSpinner = document.getElementById("loadingSpinner");
    const analyticsContent = document.getElementById("analyticsContent");
    
    const theme = localStorage.getItem("theme") || 'light';
    document.body.classList.toggle("dark-mode", theme === "dark");
    darkModeSwitch.checked = theme === "dark";
    
    darkModeSwitch.addEventListener("change", () => {
        const newTheme = darkModeSwitch.checked ? "dark" : "light";
        document.body.classList.toggle("dark-mode", newTheme === "dark");
        localStorage.setItem("theme", newTheme);
        
        if (analyticsContent.style.display === "block") {
            loadAnalytics();
        }
    });



    
    const cachedData = sessionStorage.getItem('analyticsData');
    if (cachedData) {
        try {
            const data = JSON.parse(cachedData);
            updateSummaryCards(data);
            renderCharts(data);
            if (typeof window.showSmartSpinner === 'function') {
                window.showSmartSpinner(false);
            } else {
                loadingSpinner.style.display = "none";
            }
            analyticsContent.style.display = "block";
        } catch (e) {
            console.error("Failed to parse cached analytics data:", e);
            loadAnalytics();
        }
    } else {
        loadAnalytics();
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

    const regionDistrictMap = {
        "AU": ["Visakhapatnam", "Vizianagaram", "Srikakulam", "East Godavari", "West Godavari", "Eluru", "Bapatla", "Alluri Sitharama Raju", "Anakapalli", "Kakinada", "Konaseema"], 
        "SVU": ["Chittoor", "SPSR Nellore", "Annamayya", "Tirupati", "YSR Kadapa", "Kadapa", "Nellore"],
        "SW": ["Anantapuramu", "Anantapur", "Kurnool", "Guntur", "Krishna", "Prakasam", "Nandyal", "NTR", "Palnadu", "Sri Sathya Sai"]
    };

    function getRegionForDistrict(district) {
        if (!district) return "Other";
        for (const [region, districts] of Object.entries(regionDistrictMap)) {
            if (districts.some(d => d.toLowerCase() === district.toLowerCase() || district.toLowerCase().includes(d.toLowerCase()))) {
                return region;
            }
        }
        return "Other";
    }



    function loadAnalytics() {
        if (typeof window.showSmartSpinner === 'function') {
            window.showSmartSpinner(true, { type: 'analytics' });
        } else {
            loadingSpinner.style.display = "flex";
            const statusEl = loadingSpinner.querySelector('.loader-status-text, p');
            if (statusEl) statusEl.textContent = 'Synthesizing live analytics data...';
        }
        
        const cachedData = localStorage.getItem('analyticsData');
        const cacheTimestamp = localStorage.getItem('analyticsDataTimestamp');
        
        if (cachedData && cacheTimestamp) {
            const ageInMinutes = (Date.now() - parseInt(cacheTimestamp)) / (1000 * 60);
            if (ageInMinutes < 30) {
                try {
                    const data = JSON.parse(cachedData);
                    updateSummaryCards(data);
                    renderCharts(data);
                    if (typeof window.showSmartSpinner === 'function') {
                        window.showSmartSpinner(false);
                    } else {
                        loadingSpinner.style.display = "none";
                    }
                    analyticsContent.style.display = "block";
                    return;
                } catch (e) {
                    console.warn("Failed to parse cached analytics data:", e);
                }
            }
        }
        
        Promise.all([
            fetch(`/api/stats/dashboard?_=${new Date().getTime()}`).then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); }),
            fetch(`/api/analytics/compare-branches?_=${new Date().getTime()}`).then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); }),
            fetch(`/api/colleges/explore?_=${new Date().getTime()}`).then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
        ])
        .then(([dashboard, compareBranchesData, exploreData]) => {
            // Synthesize the statistics structure client-side
            const collegesByBranch = {};
            compareBranchesData.forEach(item => {
                const fullName = BRANCH_CODE_TO_NAME[item.branch_code] || item.branch_code;
                collegesByBranch[fullName] = item.college_count;
            });

            const collegesByRegion = { "AU": 0, "SVU": 0, "SW": 0, "Other": 0 };
            exploreData.forEach(c => {
                const region = getRegionForDistrict(c.district);
                collegesByRegion[region] = (collegesByRegion[region] || 0) + 1;
            });
            if (collegesByRegion["Other"] === 0) {
                delete collegesByRegion["Other"];
            }

            const synthesizedData = {
                totalColleges: dashboard.total_colleges || exploreData.length,
                collegesByBranch: collegesByBranch,
                collegesByRegion: collegesByRegion
            };

            try {
                localStorage.setItem('analyticsData', JSON.stringify(synthesizedData));
                localStorage.setItem('analyticsDataTimestamp', Date.now().toString());
            } catch (e) {
                console.warn("Failed to cache analytics data:", e);
            }
            
            updateSummaryCards(synthesizedData);
            renderCharts(synthesizedData);
            if (typeof window.showSmartSpinner === 'function') {
                window.showSmartSpinner(false);
            } else {
                loadingSpinner.style.display = "none";
            }
            analyticsContent.style.display = "block";
        })
        .catch(err => {
            console.error("Failed to load/synthesize analytics:", err);
            if (typeof window.showSmartSpinner === 'function') {
                window.showSmartSpinner(false);
            }
            analyticsContent.innerHTML = "<p style='color: red; padding: 2rem; text-align: center;'>Failed to load analytics data from server. Please try refreshing the page.</p>";
            analyticsContent.style.display = "block";
        });
    }
    
    function updateSummaryCards(data) {
        document.getElementById("totalColleges").textContent = data.totalColleges || 0;
        document.getElementById("totalBranches").textContent = 
            Object.keys(data.collegesByBranch || {}).length;
    }
    
    function renderCharts(data) {
        const isDark = document.body.classList.contains("dark-mode");
        const textColor = isDark ? '#E5E7EB' : '#1A1A2E';
        const gridColor = isDark ? '#3A3A5C' : '#E5E7EB';
        
        Chart.defaults.color = textColor;
        Chart.defaults.borderColor = gridColor;
        
        renderPieChart('regionChart', 
            Object.keys(data.collegesByRegion || {}), 
            Object.values(data.collegesByRegion || {}),
            ['#4361EE', '#EF476F', '#2DC653']);
        

        
        const branchEntries = Object.entries(data.collegesByBranch || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        renderBarChart('branchChart', 
            branchEntries.map(e => e[0]), 
            branchEntries.map(e => e[1]));
    }
    
    function renderPieChart(canvasId, labels, data, colors) {
        const ctx = document.getElementById(canvasId);
        if (ctx.chart) ctx.chart.destroy();
        
        ctx.chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors || [
                        '#4361EE', '#EF476F', '#2DC653', '#FFB703', 
                        '#818CF8', '#00B4D8', '#1A1A2E'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
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
    
    function renderBarChart(canvasId, labels, data, yLabel = 'Colleges') {
        const ctx = document.getElementById(canvasId);
        if (ctx.chart) ctx.chart.destroy();
        
        ctx.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: yLabel,
                    data: data,
                    backgroundColor: '#4361EE',
                    borderColor: '#1A1A2E',
                    borderWidth: 2,
                    borderRadius: 6
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
    
    window.loadAnalytics = loadAnalytics;
});