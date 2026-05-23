const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5173;
const BACKEND_URL = process.env.API_URL || process.env.BACKEND_URL || 'http://127.0.0.1:8080';

app.use(cors());


// Legacy mock endpoint for listing branches
app.get('/api/analytics/branches', (req, res) => {
    const branches = [
        "Aerospace Engineering",
        "Agricultural Engineering",
        "Artificial Intelligence",
        "Artificial Intelligence & Data Science",
        "Artificial Intelligence & Machine Learning",
        "Automobile Engineering",
        "B.Pharm",
        "Biotechnology",
        "Chemical Engineering",
        "Civil Engineering",
        "Computer Engineering (Software Engineering)",
        "Computer Networking",
        "Computer Science & Engineering",
        "Computer Science and Design",
        "Computer Science and Business Systems",
        "Computer Science and Engineering (Artificial Intelligence)",
        "Computer Science and Engineering (Big Data Analytics)",
        "Computer Science and Engineering (IoT)",
        "Computer Science and Engineering & Business Systems",
        "Computer Science and Information Technology",
        "Computer Science and Systems Engineering",
        "Computer Science and Technology",
        "CSE (AI & ML Specialization)",
        "CSE (Artificial Intelligence & Data Science)",
        "CSE (Business Systems)",
        "CSE (Cyber Security)",
        "CSE (Data Science)",
        "CSE (IoT & Cyber Security with Block Chain Tech)",
        "CSE (Regional Course - Telugu)",
        "CSE with Specialization in Cloud Computing",
        "Cyber Security",
        "Dairy Technology",
        "Data Science",
        "Doctor of Pharmacy (Pharm.D)",
        "Electrical & Electronics Engineering",
        "Electronics & Communication Engineering",
        "Electronics & Instrumentation Engineering",
        "Electronics and Communication Engineering (Bio-Medical Engineering)",
        "Electronics and Communication Engineering (Industry Integrated)",
        "Electronics and Communication Technology",
        "Electronics and Computer Engineering",
        "Food Engineering",
        "Food Technology",
        "Geo-Informatics",
        "Information Technology",
        "Instrumentation Engineering and Technology",
        "Internet of Things",
        "Mechanical Engineering",
        "Mechanical Engineering (Robotics)",
        "Metallurgical Engineering",
        "Mining Engineering",
        "Naval Architecture and Marine Engineering",
        "Petroleum Engineering",
        "Robotics and Automation",
        "Software Engineering"
    ];
    res.json(branches);
});

// Proxy other API endpoints to Spring Boot backend
app.use('/api', createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    pathRewrite: (path, req) => '/api' + path,
    logLevel: 'debug',
    onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).send('Proxy error: ' + err.message);
    }
}));

app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all for HTML pages (redirect to index.html if route not matched)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Frontend Express server running on port ${PORT}`);
    console.log(`Proxying backend requests to ${BACKEND_URL}`);
});
