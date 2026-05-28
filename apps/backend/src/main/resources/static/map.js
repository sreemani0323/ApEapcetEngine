document.addEventListener("DOMContentLoaded", function () {
    console.log("Map page DOM loaded");
    
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
    const regionFilter = document.getElementById("regionFilter");

    const searchBox = document.getElementById("searchBox");
    const searchDropdown = document.getElementById("searchDropdown");
    const searchBtn = document.getElementById("searchBtn");
    const filterBtn = document.getElementById("filterBtn");
    const collegeList = document.getElementById("collegeList");
    const loadingSpinner = document.getElementById("loadingSpinner");
    
    let allColleges = [];
    let map;
    let markers = [];
    let heatmapLayer = null;
    let selectedSearchCollege = null;
    
    console.log("Elements retrieved");



    const placeCoords = {

        "Visakhapatnam": [17.6868, 83.2185],
        "Vizag": [17.6868, 83.2185],
        "MVP Colony": [17.7231, 83.3012],
        "Gajuwaka": [17.7000, 83.2167],
        "Madhurawada": [17.7833, 83.3833],
        "Duvvada": [17.6333, 83.2167],
        "Anakapalle": [17.6911, 83.0036],
        "Bheemunipatnam": [17.8897, 83.4503],
        "Narsipatnam": [17.6673, 82.6122],

        "Vizianagaram": [18.1167, 83.4000],
        "Bobbili": [18.5667, 83.3667],
        "Parvathipuram": [18.7833, 83.4333],
        "Salur": [18.5167, 83.2000],

        "Srikakulam": [18.2949, 83.8938],
        "Palasa": [18.7667, 84.4167],
        "Amadalavalasa": [18.4167, 83.9000],
        "Ichchapuram": [19.1167, 84.6833],

        "Kakinada": [16.9891, 82.2475],
        "Rajahmundry": [17.0005, 81.8040],
        "Rajamahendravaram": [17.0005, 81.8040],
        "Amalapuram": [16.5782, 82.0076],
        "Tuni": [17.3500, 82.5500],
        "Peddapuram": [17.0770, 82.1376],
        "Rampachodavaram": [17.4423, 81.7774],

        "Eluru": [16.7107, 81.0953],
        "Bhimavaram": [16.5449, 81.5212],
        "S R K R ENGINEERING COLLEGE": [16.5449, 81.5212], 
        "Tadepalligudem": [16.8147, 81.5270],
        "Tanuku": [16.7500, 81.6833],
        "Narsapuram": [16.4333, 81.6833],

        "Vijayawada": [16.5062, 80.6480],
        "Machilipatnam": [16.1875, 81.1389],
        "Gudivada": [16.4333, 80.9833],
        "Nuzvid": [16.7833, 80.8500],
        "Jaggayyapeta": [16.8933, 80.0978],
        "Mylavaram": [16.6167, 80.6500],

        "Guntur": [16.3067, 80.4365],
        "Tenali": [16.2428, 80.6425],
        "Narasaraopet": [16.2333, 80.0500],
        "Mangalagiri": [16.4308, 80.5679],
        "Chilakaluripet": [16.0892, 80.1672],
        "Sattenapalle": [16.3953, 80.1514],
        "Bapatla": [15.9043, 80.4677],
        "Repalle": [16.0167, 80.8333],
        "Ponnur": [16.2000, 80.5167],
        "Vadlamudi": [16.3500, 80.9167],
        "Kollipara": [16.2833, 80.3000],

        "Ongole": [15.5057, 80.0499],
        "Chirala": [15.8239, 80.3522],
        "Markapur": [15.7353, 79.2705],
        "Kandukur": [15.2154, 79.9036],
        "Addanki": [15.8111, 79.9736],
        "Singarayakonda": [15.9167, 79.3500],
        "Kanigiri": [15.8000, 79.3667],
        "Yerragondapalem": [15.5667, 79.7333],

        "Nellore": [14.4426, 79.9865],
        "Gudur": [14.1500, 79.8500],
        "Kavali": [14.9167, 79.9833],
        "Atmakur": [14.5833, 79.6000],
        "Venkatagiri": [13.9667, 79.5833],
        "Udayagiri": [13.8167, 79.9167],
        "Sullurpeta": [13.8667, 79.8667],
        "Podalakur": [14.3167, 79.9167],

        "Chittoor": [13.2172, 79.1003],
        "Tirupati": [13.6288, 79.4192],
        "Madanapalle": [13.5503, 78.5029],
        "Puttur": [13.4419, 79.5533],
        "Srikalahasti": [13.7500, 79.7000],
        "Palamaner": [13.2000, 78.7667],
        "Punganur": [13.3667, 79.0833],
        "Vayalpad": [13.8000, 79.3000],

        "Kadapa": [14.4673, 78.8242],
        "Cuddapah": [14.4673, 78.8242],
        "Proddatur": [14.7502, 78.5483],
        "Rayachoti": [14.0500, 78.7500],
        "Jammalamadugu": [14.8500, 78.3833],
        "Pulivendla": [14.3833, 78.2333],
        "Badvel": [14.7000, 79.0333],
        "Kamalapuram": [14.5833, 78.8000],

        "Anantapur": [14.6819, 77.6006],
        "Hindupur": [13.8283, 77.4911],
        "Guntakal": [15.1667, 77.3667],
        "Dharmavaram": [14.4144, 77.7211],
        "Tadipatri": [14.9075, 78.0095],
        "Hiriyur": [14.5167, 77.8333],
        "Kalyandurg": [15.0833, 77.9667],
        "Rayadurg": [15.1000, 77.8000],

        "Kurnool": [15.8281, 78.0373],
        "Nandyal": [15.4769, 78.4830],
        "Adoni": [15.6281, 77.2750],
        "Yemmiganur": [15.7272, 77.4828],
        "Nandikotkur": [15.8667, 78.2667],
        "Pattikonda": [15.8333, 77.8667],
        "Allagadda": [15.7333, 78.2833],
        "Srisailam": [16.0667, 78.8667]
    };

    const districtCoords = {
        "Visakhapatnam": [17.6868, 83.2185],
        "Vizianagaram": [18.1167, 83.4000],
        "Srikakulam": [18.2949, 83.8938],
        "East Godavari": [17.0005, 82.2305],
        "West Godavari": [16.7150, 81.1094],
        "Eluru": [16.7107, 81.0953],
        "Krishna": [16.5193, 80.6305],
        "Guntur": [16.3067, 80.4365],
        "Prakasam": [15.6126, 79.5865],
        "Nellore": [14.4426, 79.9865],
        "Chittoor": [13.2172, 79.1003],
        "Kadapa": [14.4673, 78.8242],
        "YSR Kadapa": [14.4673, 78.8242],
        "Anantapur": [14.6819, 77.6006],
        "Kurnool": [15.8281, 78.0373],
        "Annamayya": [13.6288, 79.3848],
        "Tirupati": [13.6288, 79.4192],
        "Bapatla": [15.9043, 80.4677],
        "NTR": [16.5062, 80.6480],
        "Palnadu": [16.1814, 79.9864],
        "Nandyal": [15.4769, 78.4830]
    };

    const theme = localStorage.getItem("theme") || 'light';
    document.body.classList.toggle("dark-mode", theme === "dark");
    darkModeSwitch.checked = theme === "dark";
    darkModeSwitch.addEventListener("change", () => {
        const newTheme = darkModeSwitch.checked ? "dark" : "light";
        document.body.classList.toggle("dark-mode", newTheme === "dark");
        localStorage.setItem("theme", newTheme);
    });



    
    console.log("Theme initialized");

    map = L.map('map', {
        zoomControl: false // Disable default zoom control
    }).setView([15.9129, 79.7400], window.innerWidth < 768 ? 6 : 7); // Center of Andhra Pradesh
    
    console.log("Map initialized");

    L.control.zoom({
        position: 'topright'
    }).addTo(map);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        zIndex: 1000
    }).addTo(map);

    heatmapLayer = L.heatLayer([], {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: {0.4: 'blue', 0.65: 'lime', 1: 'red'}
    });
    
    console.log("Tile layer added");

    searchBox.addEventListener('input', function() {
        const query = searchBox.value;

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

            searchBox.value = query.replace(/[^a-zA-Z\s]/g, '');
            return;
        }
        
        const trimmedQuery = query.toLowerCase().trim();
        
        if (trimmedQuery.length < 2) {
            searchDropdown.style.display = 'none';
            return;
        }
        
        const uniqueColleges = new Map();
        allColleges.forEach(c => {
            if (!uniqueColleges.has(c.instcode)) {
                const name = (c.name || '').toLowerCase();
                const place = (c.place || '').toLowerCase();

                const nameNoSpaces = name.replace(/\s+/g, '');
                const queryNoSpaces = query.replace(/\s+/g, '');
                if (name.includes(query) || place.includes(query) || nameNoSpaces.includes(queryNoSpaces)) {
                    uniqueColleges.set(c.instcode, c);
                }
            }
        });
        
        if (uniqueColleges.size === 0) {
            searchDropdown.style.display = 'none';
            return;
        }
        
        const sortedColleges = Array.from(uniqueColleges.values())
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
            .slice(0, 10);
        
        searchDropdown.innerHTML = sortedColleges.map(c => `
            <div class="college-dropdown-item" data-instcode="${c.instcode}" 
                 style="padding: 0.75rem 1rem; cursor: pointer; border-bottom: 1px solid var(--border-light); color: var(--color-text-primary); background: var(--card-light);">
                <strong style="color: var(--color-primary);">${c.name}</strong><br>
                <small style="color: var(--color-text-secondary);">${c.place || 'N/A'} | ${c.district}</small>
            </div>
        `).join('');
        
        searchDropdown.style.display = 'block';

        const items = searchDropdown.querySelectorAll('.college-dropdown-item');
        items.forEach(item => {
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
        });

        searchDropdown.querySelectorAll('.college-dropdown-item').forEach(item => {
            item.addEventListener('click', function() {
                const instcode = this.getAttribute('data-instcode');
                selectedSearchCollege = uniqueColleges.get(instcode);
                searchBox.value = selectedSearchCollege.name;
                searchDropdown.style.display = 'none';
            });
            
            item.addEventListener('mouseenter', function() {
                this.style.background = 'var(--color-accent-light, #e8f4f8)';
            });
            
            item.addEventListener('mouseleave', function() {
                this.style.background = 'var(--card-light)';
            });
        });
    });

    searchBox.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();

            searchBtn.click();
        }
    });

    searchBtn.addEventListener('click', function() {

        resetMapResults();
        
        if (selectedSearchCollege) {

            displaySingleCollege(selectedSearchCollege);

            loadingSpinner.style.display = "none";
        } else if (searchBox.value.trim()) {

            filterAndDisplay();

            loadingSpinner.style.display = "none";
        } else {

            loadingSpinner.style.display = "none";
        }
    });

    function resetMapResults() {

        markers.forEach(m => map.removeLayer(m));
        markers = [];

        collegeList.innerHTML = '';

        loadingSpinner.style.display = "flex";
    }

    document.addEventListener('click', function(e) {
        if (!searchBox.contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.style.display = 'none';
        }
    });

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



    function loadColleges() {
        console.log("loadColleges called");

        resetMapResults();
        
        loadingSpinner.innerHTML = '<div class="spinner"></div>';
        loadingSpinner.style.display = "flex";
        collegeList.innerHTML = "";

        const cachedData = localStorage.getItem('mapCollegesData');
        const cacheTimestamp = localStorage.getItem('mapCollegesDataTimestamp');
        
        if (cachedData && cacheTimestamp) {
            const ageInMinutes = (Date.now() - parseInt(cacheTimestamp)) / (1000 * 60);
            if (ageInMinutes < 60) { // Cache is valid for 1 hour
                try {
                    const data = JSON.parse(cachedData);
                    allColleges = data;
                    console.log("Using cached data in loadColleges");
                    filterAndDisplay();
                    loadingSpinner.style.display = "none";
                    console.log("Loaded map data from localStorage cache");
                    return;
                } catch (e) {
                    console.warn("Failed to parse cached map data:", e);
                }
            }
        }

        console.log("Fetching fresh data from explore API");
        
        fetch(`/api/colleges/explore?_=${new Date().getTime()}`)
        .then(res => {
            console.log("API response received");
            return res.json();
        })
        .then(data => {
            console.log("API data parsed, enriching client-side...");
            const mappedData = data.map(c => {
                const regionVal = getRegionForDistrict(c.district);
                return {
                    name: c.name,
                    instcode: c.instcode,
                    place: c.place,
                    district: c.district,
                    region: regionVal,
                    type: c.type,
                    estd: c.estd,
                    coed: c.coed,

                };
            });

            try {
                localStorage.setItem('mapCollegesData', JSON.stringify(mappedData));
                localStorage.setItem('mapCollegesDataTimestamp', Date.now().toString());
            } catch (e) {
                console.warn("Failed to cache map data:", e);
            }
            
            allColleges = mappedData;
            console.log(`Loaded ${allColleges.length} colleges from API`);
            
            console.log("Data loaded, calling filterAndDisplay");
            filterAndDisplay();
            loadingSpinner.style.display = "none";
        })
        .catch(err => {
            console.error("Failed to load colleges:", err);
            loadingSpinner.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e74c3c; margin-bottom: 1rem;"></i>
                    <h3 style="color: var(--color-primary); margin-bottom: 1rem;">Unable to Load Map Data</h3>
                    <p style="color: var(--color-text-secondary); margin-bottom: 1.5rem;">
                        The backend server is not responding. Please ensure the server is running or try again later.
                    </p>
                    <a href="index.html" class="btn-primary" style="display: inline-block; text-decoration: none;">
                        <i class="fas fa-arrow-left"></i> Back to Home
                    </a>
                </div>
            `;
        });
    }
    
    filterBtn.addEventListener("click", function() {

        resetMapResults();
        filterAndDisplay();
    });
    
    function filterAndDisplay() {
        console.log("filterAndDisplay called");
        
        const region = regionFilter.value;
        const searchTerm = searchBox.value.toLowerCase().trim();
        
        let filtered = allColleges;

        if (region) {
            filtered = filtered.filter(c => c.region === region);
        }

        if (searchTerm && !selectedSearchCollege) {
            filtered = filtered.filter(c => {
                const name = (c.name || '').toLowerCase();
                const place = (c.place || '').toLowerCase();

                const nameNoSpaces = name.replace(/\s+/g, '');
                const searchTermNoSpaces = searchTerm.replace(/\s+/g, '');
                return name.includes(searchTerm) || place.includes(searchTerm) || nameNoSpaces.includes(searchTermNoSpaces);
            });
        }

        markers.forEach(m => map.removeLayer(m));
        markers = [];

        const uniqueColleges = new Map();
        filtered.forEach(college => {
            if (!uniqueColleges.has(college.instcode)) {
                uniqueColleges.set(college.instcode, college);
            }
        });
        
        console.log(`Filtered colleges: ${filtered.length}, Unique colleges: ${uniqueColleges.size}`);

        const heatmapData = [];
        let collegesWithCoords = 0;
        let collegesWithoutCoords = 0;
        uniqueColleges.forEach(college => {

            let coords = placeCoords[college.place];

            if (!coords) {
                coords = districtCoords[college.district];
                if (!coords) {
                    console.warn(`No coordinates for place: ${college.place} or district: ${college.district}`);
                    collegesWithoutCoords++;

                    coords = [15.9129, 79.7400]; // Default to center of Andhra Pradesh
                } else {
                    console.log(`Using district coordinates for ${college.name}: ${college.district} -> [${coords[0]}, ${coords[1]}]`);
                }
            } else {
                console.log(`Using place coordinates for ${college.name}: ${college.place} -> [${coords[0]}, ${coords[1]}]`);
            }
            collegesWithCoords++;

            heatmapData.push([coords[0], coords[1], 0.5]);

            const marker = L.marker(coords).addTo(map);
            markers.push(marker);
            
            const popupContent = `
                <div class="popup-inner">
                    <h4 class="popup-title">${college.name}</h4>
                    <p class="popup-location">
                        <i class="fas fa-map-marker-alt"></i> <strong>Location:</strong> ${college.place || college.district}
                    </p>
                    <p class="popup-info"><strong>District:</strong> ${college.district}</p>
                    <a href="college.html?instcode=${college.instcode}" class="popup-btn">View Details <i class="fas fa-arrow-right"></i></a>
                </div>
            `;
            
            marker.bindPopup(popupContent);
        });

        heatmapLayer.setLatLngs(heatmapData);
        
        console.log(`Colleges with coordinates: ${collegesWithCoords}, Colleges without coordinates: ${collegesWithoutCoords}`);

        displayCollegeList(Array.from(uniqueColleges.values()));

        selectedSearchCollege = null;

        loadingSpinner.style.display = "none";
        
        console.log("filterAndDisplay completed");
    }
    
    function displaySingleCollege(college) {
        console.log("displaySingleCollege called");

        markers.forEach(m => map.removeLayer(m));
        markers = [];

        heatmapLayer.setLatLngs([]);

        let coords = placeCoords[college.place];

        if (!coords) {
            coords = districtCoords[college.district];
            if (!coords) {
                console.warn(`No coordinates for place: ${college.place} or district: ${college.district}`);

                coords = [15.9129, 79.7400]; // Default to center of Andhra Pradesh
            } else {
                console.log(`Using district coordinates for ${college.name}: ${college.district} -> [${coords[0]}, ${coords[1]}]`);
            }
        } else {
            console.log(`Using place coordinates for ${college.name}: ${college.place} -> [${coords[0]}, ${coords[1]}]`);
        }
        
        const marker = L.marker(coords).addTo(map);
        markers.push(marker);
        
        const popupContent = `
            <div class="popup-inner">
                <h4 class="popup-title">${college.name}</h4>
                <p class="popup-location">
                    <i class="fas fa-map-marker-alt"></i> <strong>Location:</strong> ${college.place || college.district}
                </p>
                <p class="popup-info"><strong>District:</strong> ${college.district}</p>
                <a href="college.html?instcode=${college.instcode}" class="popup-btn">View Details <i class="fas fa-arrow-right"></i></a>
            </div>
        `;
        
        marker.bindPopup(popupContent).openPopup();
        map.setView(coords, 12);
        
        heatmapLayer.setLatLngs([[coords[0], coords[1], 0.5]]);

        displayCollegeList([college]);

        loadingSpinner.style.display = "none";
        
        console.log("displaySingleCollege completed");
    }
    
    function displayCollegeList(colleges, districtName = null) {
        console.log("displayCollegeList called");
        console.log(`Input colleges: ${colleges.length}`);
        
        if (districtName) {
            collegeList.innerHTML = `<h3 style="grid-column: 1/-1; color: var(--color-primary);">
                <i class="fas fa-map-marker-alt"></i> Colleges in ${districtName} (${colleges.length})
            </h3>`;
        } else {
            collegeList.innerHTML = `<h3 style="grid-column: 1/-1; color: var(--color-primary);">
                <i class="fas fa-university"></i> All Colleges (${colleges.length})
            </h3>`;
        }

        const uniqueColleges = new Map();
        colleges.forEach(c => {
            if (!uniqueColleges.has(c.instcode)) {
                uniqueColleges.set(c.instcode, c);
            }
        });
        
        console.log(`Unique colleges in displayCollegeList: ${uniqueColleges.size}`);

        const sortedColleges = Array.from(uniqueColleges.values()).sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });

        const selectedColleges = [];

        sortedColleges.forEach(college => {

            let coords = placeCoords[college.place];

            if (!coords) {
                coords = districtCoords[college.district];
                if (!coords) {
                    console.warn(`No coordinates for place: ${college.place} or district: ${college.district}`);
                    coords = [15.9129, 79.7400]; // Default to center of Andhra Pradesh
                }
            }
            
            const card = document.createElement("div");
            card.className = "college-card";
            card.style.cssText = "padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow); transition: transform 0.3s; position: relative; padding-top: 4rem;";

            const uniqueId = `${college.instcode}`;
            const isSelected = false; // No persistence between page loads

            const comparisonCheckbox = `
                <div class="compare-checkbox-wrapper">
                    <label for="compare-${uniqueId}" title="Compare">
                        <input type="checkbox" id="compare-${uniqueId}" class="compare-checkbox" data-college='${JSON.stringify(college).replace(/"/g, '"').replace(/'/g, "&#39;")}' data-unique-id="${uniqueId}" ${isSelected ? 'checked' : ''} onchange="handleMapCompareCheckbox(event)" />
                        <span>Compare</span>
                    </label>
                </div>
            `;
            
            card.innerHTML = `
                ${comparisonCheckbox}
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(college.name + ', ' + (college.district || college.place))}" target="_blank" class="card-location-link" title="View on Google Maps">
                    <i class="fas fa-map-marker-alt"></i> <span>Location</span>
                </a>
                <div class="card-content-wrapper">
                    <h4 class="map-card-title">${college.name}</h4>
                    <p class="map-card-info">
                        <i class="fas fa-map-marker-alt"></i> ${college.district} (${college.region})
                    </p>
                    <p class="map-card-info">
                        <i class="fas fa-code"></i> ${college.instcode}
                    </p>
                    <a href="college.html?instcode=${college.instcode}" class="btn-primary map-card-button">
                        View Details <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
            `;
            
            card.addEventListener("mouseenter", () => {
                card.style.transform = "translateY(-5px)";
            });
            
            card.addEventListener("mouseleave", () => {
                card.style.transform = "translateY(0)";
            });
            
            collegeList.appendChild(card);
        });

        initializeMapComparisonTray();
        
        console.log("displayCollegeList completed");
    }

    let selectedCollegesInMemory = [];

    window.handleMapCompareCheckbox = (event) => {
        const checkbox = event.target;
        const uniqueId = checkbox.dataset.uniqueId;
        
        let collegeData;
        try {

            const dataString = checkbox.getAttribute('data-college').replace(/"/g, '"').replace(/&#39;/g, "'");
            collegeData = JSON.parse(dataString);
        } catch (e) {
            console.error("Error parsing college data, preventing selection:", e);
            checkbox.checked = false; 
            return;
        }

        collegeData.uniqueId = uniqueId;

        let selectedColleges = [...selectedCollegesInMemory];
        
        if (checkbox.checked) {

            if (selectedColleges.length >= 6) {
                checkbox.checked = false;
                if (typeof showValidationModal === 'function' && typeof ValidationMessages !== 'undefined' && ValidationMessages.comparisonLimit) {
                    showValidationModal(
                        ValidationMessages.comparisonLimit.title,
                        ValidationMessages.comparisonLimit.message,
                        ValidationMessages.comparisonLimit.type
                    );
                } else {

                    alert('You can only select up to 6 colleges for comparison.');
                }
                return;
            }

            if (!selectedColleges.some(c => c.uniqueId === uniqueId)) {
                selectedColleges.push(collegeData);
            }
        } else {

            selectedColleges = selectedColleges.filter(c => c.uniqueId !== uniqueId);
        }

        selectedCollegesInMemory = selectedColleges;

        updateMapComparisonTray();
    };

    window.removeCollegeFromMapComparison = (uniqueId) => {

        let selectedColleges = [...selectedCollegesInMemory];

        selectedColleges = selectedColleges.filter(c => c.uniqueId !== uniqueId);

        selectedCollegesInMemory = selectedColleges;

        const checkbox = document.getElementById(`compare-${uniqueId}`);
        if (checkbox) {
            checkbox.checked = false;
        }

        updateMapComparisonTray();

        const modal = document.getElementById('map-comparison-modal');
        if (modal) {
            if (selectedColleges.length >= 2) {

                updateComparisonTableContent(selectedColleges);
            } else {

                modal.remove();
                alert('You need at least 2 colleges to compare. Please select more colleges.');
            }
        }
    };

    function updateComparisonTableContent(selectedColleges) {
        const tableContainer = document.querySelector('#map-comparison-modal .comparison-table-container');
        if (!tableContainer) return;

        let tableHTML = `
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th class="sticky-feature">Feature</th>
        `;

        selectedColleges.forEach(college => {
            tableHTML += `
                <th class="text-center">
                    <span class="college-name-row">${college.name}</span>
                    <button class="remove-col-btn mt-2" onclick="removeCollegeFromMapComparison('${college.uniqueId}')" title="Remove College">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </th>
            `;
        });
        
        tableHTML += `
                    </tr>
                </thead>
                <tbody>
        `;

        const features = [
            { key: 'instcode', label: 'Inst. Code' },
            { key: 'type', label: 'College Type' },
            { key: 'estd', label: 'Established' },
            { key: 'coed', label: 'Co-Ed/Girls' },

            { key: 'district', label: 'District' },
            { key: 'region', label: 'Region' }
        ];

        features.forEach(feature => {
            tableHTML += `<tr><th class="sticky-feature">${feature.label}</th>`;
            
            selectedColleges.forEach(college => {
                let value = college[feature.key] ?? 'N/A';
                let className = '';
                
                if (feature.key === 'type') {
                    const COLLEGE_TYPE_LABELS = {
                        'PVT': 'Private', 'UNIV': 'University', 'SF': 'Govt-Aided',
                        'PU': 'Private University', 'SS': 'State-Sponsored', 'GOV': 'Government'
                    };
                    value = COLLEGE_TYPE_LABELS[value] || value;
                } else if (feature.key === 'coed') {
                    value = value === 'GIRLS' ? 'Girls Only' : 'Co-Ed';
                } else if (feature.percent && typeof value === 'number') {
                    value = `${value.toFixed(0)}%`;
                } else if (feature.currency && typeof value === 'number') {
                    value = value > 0 ? `₹${value.toFixed(2)} LPA` : 'N/A';
                } else if (feature.key === 'cutoff' && typeof value === 'number') {
                    value = value.toLocaleString();
                }
                
                tableHTML += `<td class="${className}">${value}</td>`;
            });
            
            tableHTML += `</tr>`;
        });
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        tableContainer.innerHTML = tableHTML;
    }

    function updateMapComparisonTray() {

        const selectedColleges = [...selectedCollegesInMemory];
        const count = selectedColleges.length;

        const comparisonTray = document.getElementById('comparison-tray');
        const compareCountSpan = document.getElementById('compare-count');
        const compareNowBtn = document.getElementById('compare-now-btn');
        
        if (comparisonTray) {
            if (compareCountSpan) {
                compareCountSpan.textContent = count;
            }

            if (count > 0) {
                comparisonTray.classList.add('visible');
                comparisonTray.classList.remove('hidden');
            } else {
                comparisonTray.classList.remove('visible');
                comparisonTray.classList.add('hidden');
            }

            if (compareNowBtn) {
                compareNowBtn.disabled = count < 2;
            }
        }
    }

    window.openMapComparisonModal = () => {

        const selectedColleges = [...selectedCollegesInMemory];
        
        if (selectedColleges.length < 2) {
            alert('Please select at least 2 colleges to compare.');
            return;
        }

        const existingModal = document.getElementById('map-comparison-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'map-comparison-modal';
        modal.className = 'modal';
        modal.style.display = 'flex';

        let tableHTML = `
            <div class="modal-content-large">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fa-solid fa-scale-balanced"></i> Side-by-Side College Comparison</h3>
                    <button class="modal-close-btn" id="close-map-modal">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="modal-body-wrapper">
                    <div class="comparison-table-container">
                    </div>
                </div>
            </div>
        `;
        
        modal.innerHTML = tableHTML;
        document.body.appendChild(modal);

        updateComparisonTableContent(selectedColleges);

        const closeBtn = document.getElementById('close-map-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                modal.remove();
            });
        }

        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });
    };

    function initializeMapComparisonTray() {

        const selectedColleges = [...selectedCollegesInMemory];
        const count = selectedColleges.length;

        const comparisonTray = document.getElementById('comparison-tray');
        const compareCountSpan = document.getElementById('compare-count');
        const compareNowBtn = document.getElementById('compare-now-btn');
        
        if (comparisonTray) {
            if (compareCountSpan) {
                compareCountSpan.textContent = count;
            }

            if (count > 0) {
                comparisonTray.classList.add('visible');
                comparisonTray.classList.remove('hidden');
            } else {
                comparisonTray.classList.remove('visible');
                comparisonTray.classList.add('hidden');
            }

            if (compareNowBtn) {
                compareNowBtn.disabled = count < 2;
            }
        }
    }


    document.addEventListener('click', function(e) {
        if (e.target.id === 'compare-now-btn' || (e.target.closest('#compare-now-btn'))) {
            openMapComparisonModal();
        }
    });

    setTimeout(function() {
        const compareNowBtn = document.getElementById('compare-now-btn');
        if (compareNowBtn) {
            compareNowBtn.addEventListener('click', function() {
                openMapComparisonModal();
            });
        }
    }, 1000);

    window.loadColleges = loadColleges;

    window.toggleMarkersVisibility = function(visible) {
        markers.forEach(marker => {
            if (visible) {
                map.addLayer(marker);
            } else {
                map.removeLayer(marker);
            }
        });
    };
    
    window.toggleHeatmapVisibility = function(visible) {
        if (visible) {
            map.addLayer(heatmapLayer);
        } else {
            map.removeLayer(heatmapLayer);
        }
    };

    console.log("Initializing colleges data load...");
    setTimeout(function() {
        loadColleges();
    }, 100);
    
    console.log("Map page initialization completed");
});