const canvas = document.getElementById('atmosphereCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const co2CountSpan = document.getElementById('co2-count');
const ch4CountSpan = document.getElementById('ch4-count');
const r410aCountSpan = document.getElementById('r410a-count');

// --- Scientific & Emission Constants (GWP20) ---
const GWP_CO2 = 1;
const GWP_CH4 = 84;
const GWP_R410A = 4340;
const LIFETIME_CH4 = 12;

const EMISSIONS_FLIGHT = 1.0;
const EMISSIONS_COW = 0.1;
const EMISSIONS_WINDOW_AC = 0.000567;

let particles = [];
let totalWarmingPotential = 0;
const MAX_WARMING_POTENTIAL = 150;

const COLOR_STOPS = [
    { ratio: 0.0, color: { r: 12, g: 12, b: 26 } },
    { ratio: 0.4, color: { r: 139, g: 69, b: 19 } },
    { ratio: 0.7, color: { r: 255, g: 215, b: 0 } },
    { ratio: 1.0, color: { r: 255, g: 69, b: 0 } }
];

document.getElementById('emitCO2').addEventListener('click', () => createParticle('CO2'));
document.getElementById('emitCH4').addEventListener('click', () => createParticle('CH4'));
document.getElementById('emitR410a').addEventListener('click', () => createParticle('R410a'));

function createParticle(type) {
    // NEW: All particles now have a horizontal speed property
    let particle = { x: Math.random() * canvas.width, y: canvas.height, age: 0, type: type, speedX: 0 }; 

    if (type === 'CO2') {
        particle.gwp = GWP_CO2 * EMISSIONS_FLIGHT;
        particle.color = 'rgba(150, 150, 255, 0.7)';
        particle.speed = -1.0; // UPDATED: Doubled the initial speed from -0.5
    } else if (type === 'CH4') {
        particle.gwp = GWP_CH4 * EMISSIONS_COW;
        particle.color = 'rgba(255, 100, 100, 0.7)';
        particle.speed = -1.5;
    } else if (type === 'R410a') {
        particle.gwp = GWP_R410A * EMISSIONS_WINDOW_AC;
        particle.color = 'rgba(148, 0, 211, 0.7)';
        particle.speed = -1.0;
    }
    particle.radius = 3 + particle.gwp * 1.5;
    particles.push(particle);
    totalWarmingPotential += particle.gwp;
}

function animate() {
    // Background color logic (remains the same)
    const warmingRatio = Math.min(totalWarmingPotential / MAX_WARMING_POTENTIAL, 1);
    let startStop = COLOR_STOPS[0], endStop = COLOR_STOPS[1];
    for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
        if (warmingRatio >= COLOR_STOPS[i].ratio) {
            startStop = COLOR_STOPS[i];
            endStop = COLOR_STOPS[i + 1];
        }
    }
    const localRatio = (warmingRatio - startStop.ratio) / (endStop.ratio - startStop.ratio);
    const r = startStop.color.r + (endStop.color.r - startStop.color.r) * localRatio;
    const g = startStop.color.g + (endStop.color.g - startStop.color.g) * localRatio;
    const b = startStop.color.b + (endStop.color.b - startStop.color.b) * localRatio;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.2)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let co2Count = 0, ch4Count = 0, r410aCount = 0;

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (p.type === 'CO2' || p.type === 'CO2_decayed') co2Count++;
        else if (p.type === 'CH4') ch4Count++;
        else if (p.type === 'R410a') r410aCount++;

        // UPDATED: Move particles on both X and Y axes
        p.y += p.speed;
        p.x += p.speedX;
        p.age += 1/60;
        
        if (p.type === 'CH4' && p.age > LIFETIME_CH4) {
            totalWarmingPotential -= (GWP_CH4 * EMISSIONS_COW - GWP_CO2 * EMISSIONS_COW);
            p.type = 'CO2_decayed';
            p.color = 'rgba(150, 150, 255, 0.7)';
            p.gwp = GWP_CO2 * EMISSIONS_COW;
            p.radius = 3 + p.gwp * 1.5;
            p.speedX = (Math.random() - 0.5) * 2; // Give it a random direction after decay
        }

        // --- UPDATED: New bouncing and removal logic ---
        const isCO2 = p.type === 'CO2' || p.type === 'CO2_decayed';

        // Bounce off top/bottom for CO2
        if ((p.y < p.radius && p.speed < 0) || (p.y > canvas.height - p.radius && p.speed > 0)) {
            if (isCO2) {
                p.speed *= -1; // Reverse vertical direction
                p.speedX = (Math.random() - 0.5) * 2; // Assign a new random horizontal direction
            }
        }
        // Bounce off left/right for CO2
        if ((p.x < p.radius && p.speedX < 0) || (p.x > canvas.width - p.radius && p.speedX > 0)) {
            if (isCO2) {
                p.speedX *= -1; // Reverse horizontal direction
            }
        }

        // Remove Methane/Refrigerant if they leave the frame
        if (p.y < -p.radius && !isCO2) {
            totalWarmingPotential -= p.gwp;
            particles.splice(i, 1);
            continue; // Skip drawing this particle since it's removed
        }

        // Particle jitter and drawing logic
        if (p.type === 'CH4') p.x += (Math.random() - 0.5) * 4;
        if (p.type === 'R410a') p.radius = (3 + p.gwp * 1.5) * (1 + Math.sin(p.age * 5) * 0.2);
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = p.type === 'CH4' ? 30 : (p.type === 'R410a' ? 20 : 5);
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    
    // Counter update
    co2CountSpan.textContent = co2Count;
    ch4CountSpan.textContent = ch4Count;
    r410aCountSpan.textContent = r410aCount;

    requestAnimationFrame(animate);
}
animate();