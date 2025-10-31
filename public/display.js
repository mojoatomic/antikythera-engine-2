// Global state
let currentData = null;
let currentFaceIndex = 0;

// Component instances
let frontFace = null;
let backUpperFace = null;
let backLowerFace = null;

// Initialize on page load
window.addEventListener('load', async () => {
    await languageManager.load();
    await loadSettings();
    initComponents();
    updateDisplay();
    startPolling();
});

async function loadSettings() {
    try {
        const res = await fetch('http://localhost:3000/api/settings');
        const data = await res.json();
        console.log('loadSettings: received data =', data);
        window.appSettings = data;
        console.log('loadSettings: window.appSettings =', window.appSettings);
        
        // Apply theme and layout from server settings
        if (data.theme) changeTheme(data.theme);
        if (data.layout) changeLayout(data.layout);

        // Apply mount (single source of truth)
        const mount = data.mount || 'landscape';
        document.body.setAttribute('data-mount', mount);
    } catch (_e) {
        console.warn('loadSettings: failed to fetch /api/settings, using defaults (showSunriseSunset=false)');
        window.appSettings = { 
            showSunriseSunset: false,
            theme: 'ancient-bronze',
            layout: 'gallery',
            orientation: 'horizontal'
        };
        console.log('loadSettings: window.appSettings (fallback) =', window.appSettings);
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
        if (faceNav) faceNav.classList.remove('hidden');
        faces.forEach((face, idx) => {
            face.classList.toggle('active', idx === currentFaceIndex);
        });
    } else {
        if (faceNav) faceNav.classList.add('hidden');
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


async function updateDisplay() {
    try {
        const response = await fetch('http://localhost:3000/api/state');
        const data = await response.json();
        currentData = data;
        
        // Render all three faces
        console.log('updateDisplay: window.appSettings =', window.appSettings);
        const renderData = { ...data, settings: window.appSettings };
        frontFace.render(renderData);
        backUpperFace.render(renderData);
        backLowerFace.render(renderData);
    } catch (err) {
        console.error('Error fetching data:', err);
        showError('Unable to connect to server.');
    }
}

function showError(message) {
    console.error(message);
}

function startPolling() {
    setInterval(updateDisplay, 1000);
}
