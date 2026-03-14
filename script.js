let map;
let geoJsonLayer;
let currentCountry;
let score = 0;
let timer;
let timeLeft = 0;
let difficulty = 'easy';
let selectedContinent = 'all';
let countriesData = [];
let quizActive = false;
let questionsAnswered = 0;
const totalQuestions = 7;
let usedCountries = [];


const difficultySettings = {
    easy: { time: 20, points: 10 },
    moderate: { time: 15, points: 20 },
    hard: { time: 10, points: 30 }
};


const continentMap = {
    'Africa': 'Africa',
    'Asia': 'Asia',
    'Europe': 'Europe',
    'North America': 'North America',
    'South America': 'South America',
    'Oceania': 'Oceania'
};


document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadLeaderboard();
    showSection('home');
});

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(id).classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`btn-${id}`).classList.add('active');

    if (id === 'play') {
        setTimeout(() => map.invalidateSize(), 100);
        if (!quizActive) {
            resetQuiz();
        }
    }
}

function initMap() {
    map = L.map('map', {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxBounds: [[-90, -180], [90, 180]]
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(map);

    
    fetch('https://raw.githubusercontent.com/datasets/geo-boundaries-world-110m/master/countries.geojson')
        .then(response => response.json())
        .then(data => {
            countriesData = data.features;
            renderGeoJson(data);
        });
}

function renderGeoJson(data) {
    if (geoJsonLayer) {
        map.removeLayer(geoJsonLayer);
    }

    geoJsonLayer = L.geoJson(data, {
        style: {
            fillColor: '#238636',
            weight: 1,
            opacity: 1,
            color: '#30363d',
            fillOpacity: 0.3
        },
        onEachFeature: (feature, layer) => {
            layer.on({
                mouseover: (e) => {
                    if (!quizActive) return;
                    const layer = e.target;
                    layer.setStyle({
                        fillOpacity: 0.7,
                        fillColor: '#009dff'
                    });
                },
                mouseout: (e) => {
                    if (!quizActive) return;
                    geoJsonLayer.resetStyle(e.target);
                },
                click: (e) => {
                    if (!quizActive) return;
                    validateAnswer(feature.properties.name);
                }
            });
        }
    }).addTo(map);
}

let quizType = 'countries';

function setDifficulty(level) {
    difficulty = level;
    document.querySelectorAll('.diff-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-${level}`).classList.add('active');
    document.getElementById('current-level-display').innerText = level.charAt(0).toUpperCase() + level.slice(1);
    
    // Update timer display immediately
    document.getElementById('timer').innerText = difficultySettings[difficulty].time;
}

function filterContinent() {
    selectedContinent = document.getElementById('continent-select').value;
}

function resetQuiz() {
    score = 0;
    questionsAnswered = 0;
    quizActive = false;
    document.getElementById('score').innerText = score;
    document.getElementById('timer').innerText = difficultySettings[difficulty].time;
    document.getElementById('progress-bar').style.width = '0%';
    document.getElementById('question-text').innerText = 'Select your options and click Start!';
    document.getElementById('start-game-btn').style.display = 'inline-block';
    document.getElementById('start-game-btn').innerText = 'Start Game';
    clearInterval(timer);
    
    
    if (geoJsonLayer) {
        geoJsonLayer.eachLayer(layer => {
            geoJsonLayer.resetStyle(layer);
        });
    }
}

function startGame() {
    quizActive = true;
    score = 0;
    questionsAnswered = 0;
    usedCountries = [];
    quizType = document.getElementById('quiz-type-select').value;
    selectedContinent = document.getElementById('continent-select').value;
    
    document.getElementById('score').innerText = score;
    document.getElementById('start-game-btn').style.display = 'none';
    
    nextQuestion();
}

function nextQuestion() {
    if (questionsAnswered >= totalQuestions) {
        endGame();
        return;
    }

    
    const targetCountries = [
        "China", "Egypt", "Australia", "Canada", 
        "United Kingdom", "India", "South Korea", "Saudi Arabia",
        "New Zealand", "United Arab Emirates", "Norway", "Singapore", "South Africa"
    ];

    let availableCountries = countriesData.filter(f => 
        targetCountries.includes(f.properties.name) && !usedCountries.includes(f.properties.name)
    );

    
    if (selectedContinent !== 'all') {
        let continentFiltered = availableCountries.filter(f => f.properties.continent === selectedContinent);
        if (continentFiltered.length > 0) {
            availableCountries = continentFiltered;
        }
    }

    if (availableCountries.length === 0) {
        
        availableCountries = countriesData.filter(f => 
            targetCountries.includes(f.properties.name) && !usedCountries.includes(f.properties.name)
        );
    }

    
    if (availableCountries.length === 0) {
        usedCountries = [];
        availableCountries = countriesData.filter(f => targetCountries.includes(f.properties.name));
    }

    const randomIndex = Math.floor(Math.random() * availableCountries.length);
    currentCountry = availableCountries[randomIndex].properties.name;
    usedCountries.push(currentCountry);
    
    document.getElementById('question-text').innerText = `Question ${questionsAnswered + 1}/${totalQuestions}: Click on ${currentCountry}`;
    
    timeLeft = difficultySettings[difficulty].time;
    document.getElementById('timer').innerText = timeLeft;
    
    startTimer();
}

function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            questionsAnswered++;
            updateProgressBar();

            const correctCountryData = countriesData.find(f => f.properties.name === currentCountry);
            const countryCode = correctCountryData ? correctCountryData.properties.iso_a2 : '';
            
            showFeedback('timeout', currentCountry, countryCode);

            
            geoJsonLayer.eachLayer(layer => {
                if (layer.feature.properties.name === currentCountry) {
                    map.flyTo(layer.getBounds().getCenter(), 4);
                    layer.setStyle({ fillColor: '#ff453a', fillOpacity: 0.9 });
                    setTimeout(() => geoJsonLayer.resetStyle(layer), 2000);
                }
            });

            setTimeout(nextQuestion, 2000);
        }
    }, 1000);
}

function validateAnswer(clickedCountry) {
    if (!quizActive) return;
    clearInterval(timer);
    questionsAnswered++;

    const correctCountryData = countriesData.find(f => f.properties.name === currentCountry);
    const countryCode = correctCountryData ? correctCountryData.properties.iso_a2 : '';

    if (clickedCountry === currentCountry) {
        const points = difficultySettings[difficulty].points + timeLeft;
        score += points;
        document.getElementById('score').innerText = score;
        showFeedback(true, currentCountry, countryCode);

        geoJsonLayer.eachLayer(layer => {
            if (layer.feature.properties.name === clickedCountry) {
                map.flyTo(layer.getBounds().getCenter(), 4);
                layer.setStyle({ fillColor: '#00d26a', fillOpacity: 0.9 });
                setTimeout(() => geoJsonLayer.resetStyle(layer), 2000);
            }
        });
    } else {
        showFeedback(false, currentCountry, countryCode);

        geoJsonLayer.eachLayer(layer => {
            if (layer.feature.properties.name === currentCountry) {
                map.flyTo(layer.getBounds().getCenter(), 4);
                layer.setStyle({ fillColor: '#ff453a', fillOpacity: 0.9 });
                setTimeout(() => geoJsonLayer.resetStyle(layer), 2000);
            }
        });
    }
    
    updateProgressBar();
    setTimeout(nextQuestion, 2000);
}

function showFeedback(type, countryName, countryCode) {
    const overlay = document.getElementById('feedback-overlay');
    const message = document.getElementById('feedback-message');
    const flagUrl = countryCode ? `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png` : '';
    let feedbackHtml = '';

    overlay.className = 'feedback-overlay'; // Reset classes

    if (type === true) { // Correct
        overlay.classList.add('correct');
        feedbackHtml = `<img src="${flagUrl}" alt="Flag" style="width: 30px; vertical-align: middle; margin-right: 10px;"> Correct! ✅`;
    } else if (type === false) { // Incorrect
        overlay.classList.add('incorrect');
        feedbackHtml = `<img src="${flagUrl}" alt="Flag" style="width: 30px; vertical-align: middle; margin-right: 10px;"> Incorrect! ❌ It was ${countryName}`;
    } else { // Timeout
        overlay.classList.add('incorrect'); // Use same color as incorrect
        feedbackHtml = `Time's Up! ⏰ It was ${countryName}`;
    }

    message.innerHTML = feedbackHtml;
    
    overlay.classList.add('visible');
    setTimeout(() => {
        overlay.classList.remove('visible');
    }, 2000);
}


function updateProgressBar() {
    const percentage = (questionsAnswered / totalQuestions) * 100;
    document.getElementById('progress-bar').style.width = `${percentage}%`;
}

function endGame() {
    quizActive = false;
    clearInterval(timer);
    document.getElementById('question-text').innerText = `Quiz Complete! Final Score: ${score}`;
    document.getElementById('start-game-btn').style.display = 'inline-block';
    document.getElementById('start-game-btn').innerText = 'Play Again';
    updateProgressBar();
    
    // Show Game Over Popup
    const overlay = document.getElementById('game-over-overlay');
    document.getElementById('final-score').innerText = score;
    overlay.classList.remove('hidden');
}

function saveFinalScore() {
    const playerName = document.getElementById('player-name').value || "Explorer";
    const overlay = document.getElementById('game-over-overlay');
    
    saveScore(score, playerName);
    overlay.classList.add('hidden');
    
    loadLeaderboard();
    showSection('leaderboard');
}

function saveScore(finalScore, playerName) {
    playerName = playerName.trim();
    let leaderboard = JSON.parse(localStorage.getItem('geoQuizLeaderboard') || '[]');
    
    // Check if the player already exists on the leaderboard (case-insensitive and trimmed)
    const existingPlayerIndex = leaderboard.findIndex(e => e.name.trim().toLowerCase() === playerName.toLowerCase());
    
    if (existingPlayerIndex !== -1) {
        // If they exist, only update if the new score is higher
        if (finalScore > leaderboard[existingPlayerIndex].score) {
            leaderboard[existingPlayerIndex].score = finalScore;
            leaderboard[existingPlayerIndex].name = playerName; // Update to the latest casing/trimming
            leaderboard[existingPlayerIndex].date = new Date().toLocaleDateString();
        }
    } else {
        // If it's a new player, add them
        leaderboard.push({
            name: playerName,
            score: finalScore,
            date: new Date().toLocaleDateString()
        });
    }
    
    leaderboard.sort((a, b) => b.score - a.score);
    localStorage.setItem('geoQuizLeaderboard', JSON.stringify(leaderboard.slice(0, 10)));
}

let leaderboardChart;

function loadLeaderboard() {
    let rawLeaderboard = JSON.parse(localStorage.getItem('geoQuizLeaderboard')) || [];

    
    if (rawLeaderboard.length === 0 || !rawLeaderboard.some(e => e.name.trim() === "Amandeep")) {
        rawLeaderboard = [
            { name: "Rashmeet", score: 110 },
            { name: "Amandeep", score: 95 },
            { name: "Taran", score: 80 },
            { name: "Jaspreet", score: 65 },
            { name: "Tejinder", score: 50 },
        ];
        localStorage.setItem('geoQuizLeaderboard', JSON.stringify(rawLeaderboard));
    }

    
    const playerMap = new Map();
    
    rawLeaderboard.forEach(entry => {
        const cleanName = entry.name.trim();
        const key = cleanName.toLowerCase();
        if (!playerMap.has(key) || entry.score > playerMap.get(key).score) {
            playerMap.set(key, { ...entry, name: cleanName });
        }
    });
    
    
    let leaderboard = Array.from(playerMap.values()).sort((a, b) => b.score - a.score);
    
    
    localStorage.setItem('geoQuizLeaderboard', JSON.stringify(leaderboard.slice(0, 10)));

    // Keep only the top 5 for display
    leaderboard = leaderboard.slice(0, 5);

    const body = document.getElementById('leaderboard-body');
    body.innerHTML = '';
    
    const medals = ['🥇', '🥈', '🥉'];

    leaderboard.forEach((entry, index) => {
        const medal = medals[index] || '';
        const row = `
            <tr>
                <td>${index + 1} ${medal}</td>
                <td>${entry.name}</td>
                <td>${entry.score}</td>
            </tr>
        `;
        body.innerHTML += row;
    });

    renderChart(leaderboard);
}

function showCustomAlert(message) {
    const overlay = document.getElementById('custom-alert-overlay');
    document.getElementById('custom-alert-message').innerText = message;
    overlay.classList.remove('hidden');
}

function closeCustomAlert() {
    document.getElementById('custom-alert-overlay').classList.add('hidden');
}

function renderChart(data) {
    const ctx = document.getElementById('leaderboard-chart').getContext('2d');
    const names = data.map(entry => entry.name);
    const scores = data.map(entry => entry.score);

    if (leaderboardChart) {
        leaderboardChart.destroy();
    }

    leaderboardChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: names,
            datasets: [{
                label: 'Scores',
                data: scores,
                backgroundColor: [
                    '#009dff',
                    '#00d26a',
                    '#ffc107',
                    '#ff453a',
                    '#8b949e'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#30363d'
                    },
                    ticks: {
                        color: '#8b949e'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#8b949e'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            }
        }
    });
}
