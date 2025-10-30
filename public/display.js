// Global state
let animationInterval = null;
let clockInterval = null;
let currentData = null;
let currentFaceIndex = 0;
let isRealTimeMode = false;

// Component instances
let frontFace = null;
let backUpperFace = null;
let backLowerFace = null;

// Initialize on page load
window.addEventListener('load', async () => {
    // Load language system (reads .env.local via API)
    await languageManager.load();

    // Load UI settings from server
    await loadSettings();
    
    initComponents();
    setCurrentDate();
    updateDisplay();
    setupEventListeners();
    startRealTime(); // Auto-start in real-time mode
});

async function loadSettings() {
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        window.appSettings = data || { showSunriseSunset: false };
    } catch (_e) {
        window.appSettings = { showSunriseSunset: false };
    }
}

function initComponents() {
    // Initialize all three face components
    const frontCanvas = document.getElementById('frontCanvas');
    const backUpperCanvas = document.getElementById('backUpperCanvas');
    const backLowerCanvas = document.getElementById('backLowerCanvas');
    
    frontFace = new FrontFace(frontCanvas);
    backUpperFace = new BackUpperFace(backUpperCanvas);
    backLowerFace = new BackLowerFace(backLowerCanvas);
}

function setupEventListeners() {
    // Layout selector
    document.getElementById('layoutSelect').addEventListener('change', (e) => {
        changeLayout(e.target.value);
    });
    
    // Theme selector
    document.getElementById('themeSelect').addEventListener('change', (e) => {
        changeTheme(e.target.value);
    });
}

function changeLayout(layout) {
    const container = document.querySelector('.app-container');
    const faceNav = document.getElementById('faceNav');
    const faces = document.querySelectorAll('.face');
    
    // Remove all layout classes
    container.classList.remove('layout-hero', 'layout-gallery', 'layout-focus');
    
    // Add new layout class
    container.classList.add(`layout-${layout}`);
    
    // Show/hide navigation for focus layout
    if (layout === 'focus') {
        faceNav.classList.remove('hidden');
        faces.forEach((face, idx) => {
            face.classList.toggle('active', idx === currentFaceIndex);
        });
    } else {
        faceNav.classList.add('hidden');
        faces.forEach(face => {
            face.classList.remove('active');
        });
    }
    
    // For hero layout, only show front face
    if (layout === 'hero') {
        document.getElementById('frontFace').classList.remove('hidden');
        document.getElementById('backUpperFace').classList.add('hidden');
        document.getElementById('backLowerFace').classList.add('hidden');
    } else {
        document.getElementById('frontFace').classList.remove('hidden');
        document.getElementById('backUpperFace').classList.remove('hidden');
        document.getElementById('backLowerFace').classList.remove('hidden');
    }
}

function changeTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    
    // Re-render all faces with new theme
    if (currentData) {
        frontFace.render(currentData);
        backUpperFace.render(currentData);
        backLowerFace.render(currentData);
    }
}

function nextFace() {
    const faces = document.querySelectorAll('.face');
    faces[currentFaceIndex].classList.remove('active');
    currentFaceIndex = (currentFaceIndex + 1) % faces.length;
    faces[currentFaceIndex].classList.add('active');
}

function previousFace() {
    const faces = document.querySelectorAll('.face');
    faces[currentFaceIndex].classList.remove('active');
    currentFaceIndex = (currentFaceIndex - 1 + faces.length) % faces.length;
    faces[currentFaceIndex].classList.add('active');
}

function setCurrentDate() {
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    document.getElementById('dateInput').value = localDateTime;
}

function parseLocalDateTime(value) {
    // Safely parse 'YYYY-MM-DDTHH:mm' as a LOCAL time and return Date
    if (!value) return new Date();
    const [datePart, timePart] = value.split('T');
    const [y, m, d] = datePart.split('-').map(n => parseInt(n, 10));
    const [hh, mm] = timePart.split(':').map(n => parseInt(n, 10));
    return new Date(y, m - 1, d, hh, mm, 0, 0); // Local time -> Date
}

async function updateDisplay() {
    // Choose date source:
    // - Real-time mode: always use current time with seconds
    // - Otherwise: use user-selected datetime input (parsed as local)
    const inputEl = document.getElementById('dateInput');
    const inputVal = inputEl ? inputEl.value : '';
    const date = isRealTimeMode
        ? new Date().toISOString()
        : (inputVal ? parseLocalDateTime(inputVal).toISOString() : new Date().toISOString());

    try {
        const response = await fetch(`http://localhost:3000/api/state/${date}`);
        const data = await response.json();
        currentData = data;

        // Also include wall clock for ancillary uses (FrontFace uses data.date now)
        const now = new Date();
        data.currentTime = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        // Render all three faces
        frontFace.render(data);
        backUpperFace.render(data);
        backLowerFace.render(data);

    } catch (err) {
        console.error('Error fetching data:', err);
        // Show error message or use demo data
        showError('Unable to connect to server. Make sure the API is running on port 3000.');
    }
}

function showError(message) {
    // Could add a toast notification here
    console.error(message);
}

function animateForward() {
    if (animationInterval) return; // Already animating
    
    // Stop real-time mode if active
    stopRealTime();
    
    animationInterval = setInterval(() => {
        const dateInput = document.getElementById('dateInput');
        const currentDate = new Date(dateInput.value || new Date());
        currentDate.setUTCDate(currentDate.getUTCDate() + 1); // Advance by 1 day
        
        const localDateTime = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        dateInput.value = localDateTime;
        updateDisplay();
    }, 100); // Update every 100ms
}

function stopAnimation() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
    stopRealTime();
}

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const clockDisplay = document.getElementById('clockDisplay');
    if (clockDisplay) {
        clockDisplay.textContent = `${hours}:${minutes}:${seconds}`;
    }
}

function startRealTime() {
    // Stop any existing animation
    stopAnimation();
    
    isRealTimeMode = true;
    
    // Update button state
    const btn = document.getElementById('realTimeBtn');
    if (btn) {
        btn.style.backgroundColor = 'var(--color-accent)';
        btn.style.fontWeight = 'bold';
    }
    
    // Update clock every second
    clockInterval = setInterval(() => {
        updateClock();
        setCurrentDate();
        updateDisplay();
    }, 1000);
    
    // Initial clock update
    updateClock();
}

function stopRealTime() {
    if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
    isRealTimeMode = false;
    
    // Reset button state
    const btn = document.getElementById('realTimeBtn');
    if (btn) {
        btn.style.backgroundColor = '';
        btn.style.fontWeight = '';
    }
}

// eslint-disable-next-line no-unused-vars
function toggleRealTime() {
    if (isRealTimeMode) {
        stopRealTime();
    } else {
        startRealTime();
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    const layout = document.getElementById('layoutSelect').value;
    
    if (layout === 'focus') {
        if (e.key === 'ArrowLeft') {
            previousFace();
        } else if (e.key === 'ArrowRight') {
            nextFace();
        }
    }
    
    // Space to play/pause
    if (e.key === ' ') {
        e.preventDefault();
        if (animationInterval) {
            stopAnimation();
        } else if (isRealTimeMode) {
            stopRealTime();
        } else {
            animateForward();
        }
    }
});
