// ============================================================
// BRANCH_MAP: All 55 branch codes from APSCHE CSV data
// ============================================================
export const BRANCH_MAP: Record<string, string> = {
  // Core CS
  'CSE': 'Computer Science & Engineering',
  'INF': 'Information Technology',
  // CSE Variants
  'AIM': 'AI & Machine Learning',
  'AID': 'AI & Data Science',
  'AI': 'Artificial Intelligence',
  'CAI': 'CSE (Artificial Intelligence)',
  'CAD': 'CSE (AI & Data Science)',
  'CSC': 'CSE (Cyber Security)',
  'CSD': 'CSE (Data Science)',
  'CSM': 'CSE (AI & ML)',
  'CSB': 'CSE (Business Systems)',
  'CSO': 'CSE (IoT)',
  'CIC': 'CSE (IoT & Cyber Security)',
  'CIT': 'CSE (Information Technology)',
  'CBA': 'CSE (Block Chain & AI)',
  'CSS': 'CSE (Smart Systems)',
  'CSG': 'CSE (Gaming)',
  'CSER': 'CSE (Robotics)',
  'CS': 'Computer Science',
  'DS': 'Data Science',
  'CSBS': 'CSE (Business Systems)',
  'CSEB': 'CSE (Emerging Business)',
  'CST': 'CSE (Technology)',
  'CSW': 'CSE (Web Technology)',
  'CN': 'Computer Networking',
  'SWE': 'Software Engineering',
  'RBT': 'Robotics',
  'BDT': 'Big Data Technology',
  'CCC': 'Cloud Computing',
  // Core Engineering
  'ECE': 'Electronics & Communication',
  'EEE': 'Electrical & Electronics',
  'MEC': 'Mechanical Engineering',
  'CIV': 'Civil Engineering',
  'ECM': 'Electronics & Computer Engineering',
  'EIE': 'Electronics & Instrumentation',
  'ECT': 'Electronics & Telematics',
  'EBM': 'Electronics & Biomedical',
  'EII': 'Electronics & Instrumentation (Industrial)',
  // Other Engineering
  'CHE': 'Chemical Engineering',
  'BIO': 'Biotechnology',
  'AGR': 'Agricultural Engineering',
  'MIN': 'Mining Engineering',
  'MET': 'Metallurgical Engineering',
  'AUT': 'Automobile Engineering',
  'ASE': 'Aerospace Engineering',
  'IOT': 'Internet of Things',
  'FDE': 'Food Technology',
  'FDT': 'Food Technology',
  'PEE': 'Petroleum Engineering',
  'NAM': 'Naval Architecture & Marine Engineering',
  'GIN': 'Geo-Informatics',
  'IST': 'Instrumentation Technology',
  'MRB': 'Marine Engineering',
  // Pharmacy
  'PHM': 'B.Pharmacy',
  'PHD': 'Pharm.D',
};

// ============================================================
// COLLEGE TYPE: All 5 types from APSCHE CSV data
// ============================================================
export const COLLEGE_TYPE_MAP: Record<string, string> = {
  'PVT': 'Private',
  'SF': 'Self-Finance',
  'UNIV': 'University',
  'PU': 'Pharmacy University',
  'SS': 'State-Sponsored',
};

// ============================================================
// AFFILIATIONS: All 20 from APSCHE CSV data
// ============================================================
export const AFFILIATION_MAP: Record<string, string> = {
  'JNTUK': 'JNTU Kakinada',
  'JNTUA': 'JNTU Anantapur',
  'JNTUV': 'JNTU Vizianagaram',
  'AU': 'Andhra University',
  'SVU': 'Sri Venkateswara University',
  'ANU': 'Acharya Nagarjuna University',
  'AKNU': 'Adikavi Nannaya University',
  'BRAU': 'B.R. Ambedkar University',
  'KSUM': 'Krishna University',
  'SKU': 'Sri Krishnadevaraya University',
  'YGVU': 'YSR Giddaluru Vedic University',
  'SVVU': 'Sri Venkateswara Veterinary University',
  'ANGRAU': 'ANGRAU',
  'APUCPU': 'AP University of Community & Public Health',
  'BESTPU': 'BEST Pharmacy University',
  'CENUPU': 'Central University of AP',
  'RSUK': 'Rayalaseema University',
  'SPMU': 'Sri Padmavathi Mahila University',
  'SRMUPU': 'SRM University AP',
  'VITAPU': 'VIT-AP University',
};

// ============================================================
// CATEGORIES: 9 categories from APSCHE cutoff data
// Frontend uses separate Category + Gender dropdowns.
// Combined at API call time → e.g. "BCA_BOYS"
// ============================================================
export const CATEGORIES = ['OC', 'SC', 'ST', 'BCA', 'BCB', 'BCC', 'BCD', 'BCE', 'OC_EWS'];
export const GENDERS = ['BOYS', 'GIRLS'];

// ============================================================
// REGIONS: Institution registration regions
// ============================================================
export const REGIONS = [
  { code: 'AU', label: 'Andhra University (AU)' },
  { code: 'SVU', label: 'Sri Venkateswara University (SVU)' },
  { code: 'SW', label: 'State-Wide (SW)' },
];

// ============================================================
// DISTRICTS: All 25 from APSCHE CSV data
// ============================================================
export const DISTRICTS = [
  'Alluri Sitharama Raju', 'Anakapalli', 'Anantapuramu', 'Annamayya',
  'Bapatla', 'Chittoor', 'East Godavari', 'Eluru', 'Guntur',
  'Kakinada', 'Konaseema', 'Krishna', 'Kurnool',
  'Nandyal', 'NTR', 'Palnadu', 'Prakasam',
  'SPSR Nellore', 'Sri Sathya Sai',
  'Srikakulam', 'Tirupati', 'Visakhapatnam', 'Vizianagaram',
  'West Godavari', 'YSR Kadapa',
].sort();
