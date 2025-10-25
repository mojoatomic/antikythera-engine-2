// Global state
let animationInterval = null;
let currentData = null;
let currentFaceIndex = 0;

// Component instances
let frontFace = null;
let backUpperFace = null;
let backLowerFace = null;

// Initialize on page load
window.addEventListener('load', () => {
    initComponents();
    setCurrentDate();
    updateDisplay();
    setupEventListeners();
});

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

async function updateDisplay() {
    const dateInput = document.getElementById('dateInput').value;
    const date = dateInput ? new Date(dateInput).toISOString() : new Date().toISOString();
    
    try {
        const response = await fetch(`http://localhost:3000/api/state/${date}`);
        const data = await response.json();
        currentData = data;
        
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
    
    animationInterval = setInterval(() => {
        const dateInput = document.getElementById('dateInput');
        const currentDate = new Date(dateInput.value || new Date());
        currentDate.setDate(currentDate.getDate() + 1); // Advance by 1 day
        
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
        } else {
            animateForward();
        }
    }
});
