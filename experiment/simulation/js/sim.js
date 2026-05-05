// sim.js

let current = 0.0;
let tms = 1.0;
let plugSetting = 2.5;

let isTripped = false;
let isRunning = false;
let progress = 0.0; // 0.0 to 1.0
let elapsedTime = 0.0;
let lastTime = 0;
let animFrame;

const elements = {
    relayCurrentDisplay: document.getElementById('relayCurrentDisplay'),
    stopClockDisplay: document.getElementById('stopClockDisplay'),
    relayDisc: document.getElementById('relayDisc'),
    tripIndicator: document.getElementById('tripIndicator'),
    tmsValue: document.getElementById('tmsValue'),
    psmRadios: document.getElementsByName('psm'),
    incCurrentBtn: document.getElementById('incCurrentBtn'),
    decCurrentBtn: document.getElementById('decCurrentBtn'),
    incTmsBtn: document.getElementById('incTms'),
    decTmsBtn: document.getElementById('decTms'),
    resetBtn: document.getElementById('resetBtn')
};

// Setup Listeners
elements.incCurrentBtn.addEventListener('click', () => {
    if (isTripped) return;
    current += 0.5;
    updateDisplay();
    checkRelayState();
});

elements.decCurrentBtn.addEventListener('click', () => {
    if (isTripped) return;
    if (current > 0) current -= 0.5;
    if (current < 0) current = 0;
    updateDisplay();
    checkRelayState();
});

elements.incTmsBtn.addEventListener('click', () => {
    if (tms < 1.0 && !isRunning && !isTripped) {
        tms = parseFloat((tms + 0.1).toFixed(1));
        updateDisplay();
        checkRelayState();
    }
});

elements.decTmsBtn.addEventListener('click', () => {
    if (tms > 0.1 && !isRunning && !isTripped) {
        tms = parseFloat((tms - 0.1).toFixed(1));
        updateDisplay();
        checkRelayState();
    }
});

elements.psmRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (!isRunning && !isTripped) {
            plugSetting = parseFloat(e.target.value);
            checkRelayState();
        } else {
            // Revert selection if running or tripped
            e.target.checked = false;
            document.querySelector(`input[name="psm"][value="${plugSetting.toFixed(2)}"]`).checked = true;
        }
    });
});

elements.resetBtn.addEventListener('click', () => {
    current = 0.0;
    isTripped = false;
    isRunning = false;
    progress = 0.0;
    elapsedTime = 0.0;
    cancelAnimationFrame(animFrame);
    
    elements.tripIndicator.classList.remove('tripped');
    elements.relayDisc.style.transform = 'rotate(0deg)';
    
    updateDisplay();
});

function updateDisplay() {
    elements.relayCurrentDisplay.textContent = current.toFixed(2) + ' Amp';
    elements.tmsValue.textContent = tms.toFixed(1);
    // Display TMS in stop clock temporarily when not running
    if (!isRunning && !isTripped && elapsedTime === 0) {
        elements.stopClockDisplay.textContent = '0 s';
    }
}

function checkRelayState() {
    if (isTripped) return;
    
    // Relay picks up if Current >= Plug Setting
    if (current > plugSetting) {
        if (!isRunning) {
            isRunning = true;
            lastTime = performance.now();
            animFrame = requestAnimationFrame(simulationLoop);
        }
    } else {
        if (isRunning) {
            // Reset if current drops below pickup before tripping
            isRunning = false;
            progress = 0.0;
            elapsedTime = 0.0;
            elements.relayDisc.style.transform = 'rotate(0deg)';
            elements.stopClockDisplay.textContent = '0 s';
            cancelAnimationFrame(animFrame);
        }
    }
}

function simulationLoop(timestamp) {
    if (!isRunning || isTripped) return;
    
    const dt = (timestamp - lastTime) / 1000; // seconds
    lastTime = timestamp;
    
    // Calculate expected trip time based on current
    // IEC Normal Inverse Characteristics
    let psmMultipler = current / plugSetting;
    let expectedTripTime = 1000; // default large
    
    if (psmMultipler > 1.0) {
        expectedTripTime = tms * (0.14 / (Math.pow(psmMultipler, 0.02) - 1));
    }
    
    // Update progress based on current speed
    if (expectedTripTime > 0) {
        let speed = 1.0 / expectedTripTime;
        progress += speed * dt;
        elapsedTime += dt;
    }
    
    elements.stopClockDisplay.textContent = elapsedTime.toFixed(3) + ' s';
    
    // Update disc rotation (0 to -90 degrees counter-clockwise)
    let angle = progress * -90;
    elements.relayDisc.style.transform = `rotate(${angle}deg)`;
    
    if (progress >= 1.0) {
        // Tripped
        isTripped = true;
        isRunning = false;
        elements.relayDisc.style.transform = 'rotate(-90deg)';
        elements.tripIndicator.classList.add('tripped');
    } else {
        animFrame = requestAnimationFrame(simulationLoop);
    }
}

// Initial update
updateDisplay();

