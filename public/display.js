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
        const res = await fetch('/api/settings');
        const data = await res.json();
        window.appSettings = data;
        
        // Apply theme and layout from server settings
        if (data.theme) changeTheme(data.theme);
        if (data.layout) changeLayout(data.layout);
        
        // Apply orientation
        if (data.orientation) {
            document.querySelector('.app-container')
                .classList.add(`orientation-${data.orientation}`);
        }
    } catch (_e) {
        window.appSettings = { 
            showSunriseSunset: false,
            theme: 'ancient-bronze',
            layout: 'gallery',
            orientation: 'horizontal'
        };
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


async function updateDisplay() {
    try {
        const response = await fetch('http://localhost:3000/api/state');
        const data = await response.json();
        currentData = data;
        
        // Render all three faces
        frontFace.render(data);
        backUpperFace.render(data);
        backLowerFace.render(data);
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
