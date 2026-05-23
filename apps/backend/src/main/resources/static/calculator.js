document.addEventListener("DOMContentLoaded", function () {


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
    const form = document.getElementById("calculatorForm");
    const collegeInput = document.getElementById("collegeName");
    const collegeDropdown = document.getElementById("collegeDropdown");
    const branchSelect = document.getElementById("branch");
    const categorySelect = document.getElementById("category");
    const genderSelect = document.getElementById("gender");
    const probabilitySelect = document.getElementById("probability");
    const resultDiv = document.getElementById("result");
    const loadingDiv = document.getElementById("loading");
    
    let allColleges = [];
    let selectedCollege = null;

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

    const cachedData = localStorage.getItem('calculatorCollegesData');
    const cacheTimestamp = localStorage.getItem('calculatorCollegesDataTimestamp');
    
    if (cachedData && cacheTimestamp) {
        const ageInMinutes = (Date.now() - parseInt(cacheTimestamp)) / (1000 * 60);
        if (ageInMinutes < 60) { // Cache is valid for 1 hour
            try {
                const data = JSON.parse(cachedData);
                allColleges = data;
                console.log(`Loaded ${allColleges.length} colleges from localStorage cache`);
                loadingDiv.style.display = "none";
            } catch (e) {
                console.error("Failed to parse cached calculator data:", e);

                loadColleges();
            }
        } else {

            loadColleges();
        }
    } else {

        loadColleges();
    }

    function loadColleges() {
        loadingDiv.innerHTML = '<div class="spinner"></div>';
        loadingDiv.style.display = "flex";

        const cachedData = localStorage.getItem('calculatorCollegesData');
        const cacheTimestamp = localStorage.getItem('calculatorCollegesDataTimestamp');
        
        if (cachedData && cacheTimestamp) {
            const ageInMinutes = (Date.now() - parseInt(cacheTimestamp)) / (1000 * 60);
            if (ageInMinutes < 60) { // Cache is valid for 1 hour
                try {
                    const data = JSON.parse(cachedData);
                    allColleges = data;
                    console.log(`Loaded ${allColleges.length} colleges from localStorage cache`);
                    loadingDiv.style.display = "none";
                    return;
                } catch (e) {
                    console.warn("Failed to parse cached calculator data:", e);
                }
            }
        }

        fetch(`/api/colleges/names?_=${new Date().getTime()}`)
        .then(res => res.json())
        .then(data => {
            try {
                localStorage.setItem('calculatorCollegesData', JSON.stringify(data));
                localStorage.setItem('calculatorCollegesDataTimestamp', Date.now().toString());
            } catch (e) {
                console.warn("Failed to cache calculator data:", e);
            }
            
            allColleges = data;
            console.log(`Loaded ${allColleges.length} colleges`);
            loadingDiv.style.display = "none";
        })
        .catch(err => {
            console.error("Failed to load colleges:", err);
            loadingDiv.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e74c3c; margin-bottom: 1rem;"></i>
                    <h3 style="color: var(--color-primary); margin-bottom: 1rem;">Unable to Load Data</h3>
                    <p style="color: var(--color-text-secondary); margin-bottom: 1.5rem;">
                        The backend server is not responding. Please try again later.
                    </p>
                    <a href="index.html" class="btn-primary" style="display: inline-block; text-decoration: none;">
                        <i class="fas fa-arrow-left"></i> Back to Home
                    </a>
                </div>
            `;
        });
    }

    collegeInput.addEventListener("input", function() {
        const query = collegeInput.value;

        if (query && !/^[a-zA-Z\s]*$/.test(query)) {

            if (typeof showValidationModal === 'function' && typeof ValidationMessages !== 'undefined') {
                showValidationModal(
                    'Invalid Input',
                    'Please enter only alphabetic characters and spaces.',
                    'warning'
                );
            } else {

                alert('Please enter only alphabetic characters and spaces.');
            }

            collegeInput.value = query.replace(/[^a-zA-Z\s]/g, '');
            return;
        }
        
        const trimmedQuery = query.toLowerCase().trim();
        
        if (trimmedQuery.length < 2) {
            collegeDropdown.classList.remove("show");
            return;
        }
        
        const uniqueColleges = new Map();
        allColleges.forEach(c => {
            if (c.name) {
                const name = c.name.toLowerCase();

                const nameNoSpaces = name.replace(/\s+/g, '');
                const queryNoSpaces = query.replace(/\s+/g, '');
                if (name.includes(query) || nameNoSpaces.includes(queryNoSpaces)) {
                    uniqueColleges.set(c.instcode, c);
                }
            }
        });
        
        if (uniqueColleges.size === 0) {
            collegeDropdown.classList.remove("show");
            return;
        }
        
        collegeDropdown.innerHTML = Array.from(uniqueColleges.values())
            .slice(0, 10)
            .map(c => `
                <div class="college-dropdown-item" data-instcode="${c.instcode}">
                    ${c.name} <small>(${c.instcode})</small>
                </div>
            `).join('');
        
        collegeDropdown.classList.add("show");
        
        collegeDropdown.querySelectorAll('.college-dropdown-item').forEach(item => {
            item.addEventListener('click', function() {
                const instcode = this.getAttribute('data-instcode');
                selectedCollege = uniqueColleges.get(instcode);
                collegeInput.value = selectedCollege.name;
                collegeDropdown.classList.remove("show");
                loadBranches(instcode);
            });
        });
    });

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

    function loadBranches(instcode) {
        fetch(`/api/colleges/${instcode}/branches?_=${new Date().getTime()}`)
            .then(res => res.json())
            .then(branches => {
                branchSelect.innerHTML = '<option value="">Select Branch</option>' +
                    branches.map(b => {
                        const code = b.branch_code;
                        const name = BRANCH_CODE_TO_NAME[code] || code;
                        return `<option value="${code}">${name} (${code})</option>`;
                    }).join('');
            })
            .catch(err => console.error("Failed to load branches:", err));
    }

    form.addEventListener("submit", function(e) {
        e.preventDefault();
        
        if (!selectedCollege) {
            alert("Please select a college from the dropdown");
            return;
        }
        
        const requestData = {
            instcode: selectedCollege.instcode,
            branch_code: branchSelect.value,
            category: (categorySelect.value + "_" + genderSelect.value).toUpperCase(),
            desired_probability: parseFloat(probabilitySelect.value)
        };
        
        loadingDiv.style.display = "flex";
        resultDiv.style.display = "none";
        
        fetch(`/api/reverse-calculate?_=${new Date().getTime()}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData)
        })
        .then(res => {
            if (!res.ok) {
                return res.text().then(text => {
                    throw new Error(text || "Failed to calculate.");
                });
            }
            return res.json();
        })
        .then(data => {
            displayResult(data);
            loadingDiv.style.display = "none";
        })
        .catch(err => {
            console.error("Calculation failed:", err);
            loadingDiv.style.display = "none";
            alert(err.message || "Failed to calculate. Please check your selections.");
        });
    });
    
    function displayResult(data) {
        const prob = data.desired_probability || 0;
        const probText = prob >= 85 ? "Very High" : 
                        prob >= 50 ? "Moderate" : "Ambitious";
        
        const branchName = BRANCH_CODE_TO_NAME[data.branch_code] || data.branch_code;
        const message = `To secure a seat in ${data.college_name} (${branchName}) with a ${prob}% probability, you need a rank around ${data.required_rank.toLocaleString()}.`;

        resultDiv.innerHTML = `
            <div class="result-card">
                <h2><i class="fas fa-bullseye"></i> Required Rank</h2>
                <div class="rank-number">${data.required_rank.toLocaleString()}</div>
                <p style="font-size: 1.1rem; margin-top: 1rem;">${message}</p>
            </div>
            <div class="result-details">
                <h3 style="margin-bottom: 1rem;"><i class="fas fa-info-circle"></i> Details</h3>
                <table style="width: 100%; text-align: left;">
                    <tr>
                        <td><strong>College:</strong></td>
                        <td>${data.college_name}</td>
                    </tr>
                    <tr>
                        <td><strong>Branch:</strong></td>
                        <td>${branchName} (${data.branch_code})</td>
                    </tr>
                    <tr>
                        <td><strong>Predicted Cutoff:</strong></td>
                        <td>${data.predicted_cutoff ? data.predicted_cutoff.toLocaleString() : "N/A"}</td>
                    </tr>
                    <tr>
                        <td><strong>Desired Chance:</strong></td>
                        <td>${prob.toFixed(0)}% (${probText})</td>
                    </tr>
                </table>
                <div style="margin-top: 1.5rem; padding: 1rem; background: #e8f4f8; border-left: 4px solid var(--color-accent); border-radius: 4px;">
                    <p style="margin: 0; color: #2c3e50;">
                        <strong>Note:</strong> This is an estimate based on previous year's cutoffs. 
                        Actual requirements may vary. Always aim 10-15% better than the suggested rank for safety.
                    </p>
                </div>
            </div>
        `;
        resultDiv.style.display = "block";
        resultDiv.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    document.addEventListener("click", function(e) {
        if (!collegeInput.contains(e.target) && !collegeDropdown.contains(e.target)) {
            collegeDropdown.classList.remove("show");
        }
    });

    window.loadColleges = loadColleges;
});