/* ── i18n ── */
const i18n = {
  couple:        { fr: "[PERSON A] & [PERSON B]", en: "[PERSON A] & [PERSON B]", ar: "[شخص A] & [شخص B]" },
  subtitle:      { fr: "Le Jeu Géo du Mariage", en: "The Wedding Geo Game", ar: "لعبة جغرافيا الزفاف" },
  instructions:  {
    fr: "Nos invités viennent des quatre coins du monde ! Devinez d'où ils arrivent en plaçant une épingle sur la carte. Plus vous êtes proche, meilleur est votre score.",
    en: "Our guests are coming from all over the world! Guess where they're traveling from by dropping a pin on the map. The closer you are, the better your score.",
    ar: "ضيوفنا قادمون من كل أنحاء العالم! خمّنوا من أين يأتون بوضع دبوس على الخريطة. كلما اقتربتم، كان أداؤكم أفضل."
  },
  start:         { fr: "Commencer", en: "Start", ar: "ابدأ" },
  round:         { fr: "Tour", en: "Round", ar: "الجولة" },
  score:         { fr: "Score", en: "Score", ar: "النتيجة" },
  submit:        { fr: "Valider", en: "Submit", ar: "تأكيد" },
  next:          { fr: "Suivant", en: "Next", ar: "التالي" },
  finish:        { fr: "Voir les résultats", en: "See Results", ar: "عرض النتائج" },
  results_title: { fr: "Vos Résultats", en: "Your Results", ar: "نتائجكم" },
  total:         { fr: "Total", en: "Total", ar: "المجموع" },
  avg:           { fr: "Moyenne par tour", en: "Average per round", ar: "المعدل لكل جولة" },
  replay:        { fr: "Rejouer", en: "Play Again", ar: "العب مجدداً" },
  tap_hint:      { fr: "Touchez la carte pour placer votre épingle", en: "Tap the map to place your pin", ar: "انقر على الخريطة لوضع الدبوس" },
  perfect:       { fr: "Parfait !", en: "Perfect!", ar: "ممتاز!" },
  very_close:    { fr: "Très proche !", en: "Very close!", ar: "قريب جداً!" },
  not_bad:       { fr: "Pas mal !", en: "Not bad!", ar: "لا بأس!" },
  far:           { fr: "Loin !", en: "Far!", ar: "بعيد!" },
  tier_great:    { fr: "Expert en géographie !", en: "Geography expert!", ar: "خبير جغرافيا!" },
  tier_good:     { fr: "Bien joué !", en: "Well played!", ar: "أحسنت!" },
  tier_ok:       { fr: "Pas mal du tout !", en: "Not bad at all!", ar: "لا بأس أبداً!" },
  tier_meh:      { fr: "Il y a de la marge !", en: "Room for improvement!", ar: "هناك مجال للتحسين!" },
  hint_label:    { fr: "Zone", en: "Area", ar: "المنطقة" },
  resume:        { fr: "Reprendre", en: "Resume", ar: "استئناف" }
};

let currentLang = "fr";

function applyLanguage(lang) {
  currentLang = lang;
  document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
  document.documentElement.setAttribute("lang", lang);

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (i18n[key] && i18n[key][lang]) {
      el.textContent = i18n[key][lang];
    }
  });

  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  // Re-render dynamic content if game is in progress
  if (state.phase === "playing") {
    renderClue();
  }
  if (state.phase === "results") {
    renderResults();
  }

  // Update resume button label if visible
  const resumeBtn = document.getElementById('btn-resume');
  if (resumeBtn && resumeBtn.style.display !== 'none') {
    updateResumeButton(lang);
  }
}

/* ── Game State ── */
const state = {
  phase: "welcome",  // welcome | playing | results
  rounds: [],
  currentRound: 0,
  guessMarker: null,
  actualMarker: null,
  guessLine: null,
  results: [],
  totalDistance: 0
};

let map;
let resultsMap;

/* ── Persistence ── */
const SAVE_KEY = 'wgg_state';

function saveState() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    lang: currentLang,
    rounds: state.rounds,
    currentRound: state.currentRound,
    results: state.results,
    totalDistance: state.totalDistance
  }));
}

function clearSavedState() {
  localStorage.removeItem(SAVE_KEY);
}

function updateResumeButton(lang) {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;
  const saved = JSON.parse(raw);
  const btn = document.getElementById('btn-resume');
  btn.textContent =
    `${i18n.resume[lang]} — ${i18n.round[lang]} ${saved.currentRound + 1}/${saved.rounds.length}`;
}

function checkSavedState() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;
  const saved = JSON.parse(raw);
  if (!saved.rounds || saved.currentRound >= saved.rounds.length) {
    clearSavedState();
    return;
  }
  document.getElementById('btn-resume').style.display = '';
  updateResumeButton(currentLang);
}

function resumeGame() {
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
  state.rounds = saved.rounds;
  state.currentRound = saved.currentRound;
  state.results = saved.results;
  state.totalDistance = saved.totalDistance;
  state.phase = "playing";
  applyLanguage(saved.lang);
  showScreen("game");
  setTimeout(() => { initMap(); map.invalidateSize(); startRound(); }, 50);
}

/* ── Helpers ── */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatKm(km) {
  return km < 1 ? "< 1 km" : Math.round(km).toLocaleString() + " km";
}

function getFeedback(km) {
  if (km < 50)   return { key: "perfect",    tier: "tier-perfect" };
  if (km < 300)  return { key: "very_close",  tier: "tier-close" };
  if (km < 1500) return { key: "not_bad",     tier: "tier-ok" };
  return             { key: "far",         tier: "tier-far" };
}

function createIcon(className) {
  return L.divIcon({
    className: className,
    iconSize: [24, 34],
    iconAnchor: [12, 34]
  });
}

/* ── Screen Management ── */
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  state.phase = id === "game" ? "playing" : id;
}

/* ── Map Init ── */
function initMap() {
  if (map) return;
  map = L.map("map", {
    zoomControl: false,
    attributionControl: false
  }).setView([30, 25], 3);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18
  }).addTo(map);

  L.control.zoom({ position: "topright" }).addTo(map);

  map.on("click", onMapClick);
}

function onMapClick(e) {
  const submitBtn = document.getElementById("btn-submit");
  if (submitBtn.disabled === false && submitBtn.dataset.locked === "true") return;

  if (state.guessMarker) {
    state.guessMarker.setLatLng(e.latlng);
  } else {
    state.guessMarker = L.marker(e.latlng, {
      icon: createIcon("marker-guess"),
      draggable: true
    }).addTo(map);
  }
  submitBtn.disabled = false;
}

/* ── Round Flow ── */
function renderClue() {
  const round = state.rounds[state.currentRound];
  document.getElementById("clue-text").textContent = round.clue[currentLang];
  document.getElementById("hint-text").textContent = round.hint[currentLang];
  document.getElementById("round-counter").textContent =
    `${i18n.round[currentLang]} ${state.currentRound + 1}/${state.rounds.length}`;
  document.getElementById("score-display").textContent =
    `${i18n.score[currentLang]}: ${formatKm(state.totalDistance)}`;
}

function startRound() {
  // Clear previous markers and line
  if (state.guessMarker) { map.removeLayer(state.guessMarker); state.guessMarker = null; }
  if (state.actualMarker) { map.removeLayer(state.actualMarker); state.actualMarker = null; }
  if (state.guessLine) { map.removeLayer(state.guessLine); state.guessLine = null; }

  // Reset map view
  map.setView([30, 25], 3);

  // Update UI
  renderClue();
  const submitBtn = document.getElementById("btn-submit");
  submitBtn.disabled = true;
  submitBtn.dataset.locked = "false";
  submitBtn.textContent = i18n.submit[currentLang];
  document.getElementById("clue-text").textContent =
    state.rounds[state.currentRound].clue[currentLang];
}

function submitGuess() {
  if (!state.guessMarker) return;

  const round = state.rounds[state.currentRound];
  const guessLatLng = state.guessMarker.getLatLng();
  const distance = haversine(guessLatLng.lat, guessLatLng.lng, round.lat, round.lng);

  // Lock interactions
  const submitBtn = document.getElementById("btn-submit");
  submitBtn.dataset.locked = "true";
  state.guessMarker.dragging.disable();

  // Place actual marker
  state.actualMarker = L.marker([round.lat, round.lng], {
    icon: createIcon("marker-actual")
  }).addTo(map);

  // Draw dashed line
  state.guessLine = L.polyline(
    [guessLatLng, [round.lat, round.lng]],
    { className: "guess-line", weight: 2 }
  ).addTo(map);

  // Fit bounds to show both pins
  const bounds = L.latLngBounds([guessLatLng, [round.lat, round.lng]]);
  map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });

  // Record result
  const feedback = getFeedback(distance);
  state.results.push({ round, distance, feedback });
  state.totalDistance += distance;

  // Update score in header
  document.getElementById("score-display").textContent =
    `${i18n.score[currentLang]}: ${formatKm(state.totalDistance)}`;

  // Show result sheet
  showResultSheet(round, distance, feedback);
}

function showResultSheet(round, distance, feedback) {
  const overlay = document.getElementById("result-overlay");
  document.getElementById("result-emoji").textContent = round.emoji;
  document.getElementById("result-city").textContent = round.city[currentLang];
  document.getElementById("result-country").textContent = round.country[currentLang];

  const distEl = document.getElementById("result-distance");
  distEl.textContent = formatKm(distance);
  distEl.className = "result-distance " + feedback.tier;

  document.getElementById("result-feedback").textContent = i18n[feedback.key][currentLang];

  const isLast = state.currentRound >= state.rounds.length - 1;
  const nextBtn = document.getElementById("btn-next");
  nextBtn.textContent = isLast ? i18n.finish[currentLang] : i18n.next[currentLang];

  overlay.classList.add("visible");
}

function nextRound() {
  document.getElementById("result-overlay").classList.remove("visible");

  state.currentRound++;
  if (state.currentRound >= state.rounds.length) {
    clearSavedState();
    showResults();
  } else {
    saveState();
    startRound();
  }
}

/* ── Results ── */
function showResults() {
  showScreen("results");
  renderResults();
}

function renderResults() {
  const avg = state.totalDistance / state.rounds.length;

  // Color tier for total
  let tierClass, tierKey;
  if (avg < 200)       { tierClass = "tier-perfect"; tierKey = "tier_great"; }
  else if (avg < 500)  { tierClass = "tier-close";   tierKey = "tier_good"; }
  else if (avg < 1200) { tierClass = "tier-ok";      tierKey = "tier_ok"; }
  else                 { tierClass = "tier-far";      tierKey = "tier_meh"; }

  const totalEl = document.getElementById("results-total");
  totalEl.textContent = formatKm(state.totalDistance);
  totalEl.className = "results-total " + tierClass;

  document.getElementById("results-tier").textContent = i18n[tierKey][currentLang];
  document.getElementById("results-avg").textContent =
    `${i18n.avg[currentLang]}: ${formatKm(avg)}`;

  // Per-round breakdown
  const list = document.getElementById("results-list");
  list.innerHTML = "";
  state.results.forEach((r, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="round-place">${r.round.emoji} ${r.round.city[currentLang]}</span>
      <span class="round-distance ${r.feedback.tier}">${formatKm(r.distance)}</span>
    `;
    list.appendChild(li);
  });

  document.getElementById("btn-replay").textContent = i18n.replay[currentLang];

  // Summary map
  if (resultsMap) { resultsMap.remove(); resultsMap = null; }
  resultsMap = L.map("results-map", {
    zoomControl: false,
    attributionControl: false
  });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18
  }).addTo(resultsMap);

  const markers = state.results.map(r => {
    return L.marker([r.round.lat, r.round.lng], {
      icon: L.divIcon({
        className: "results-map-pin",
        html: r.round.emoji,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })
    })
    .bindTooltip(r.round.city[currentLang], { direction: "top", offset: [0, -10] })
    .addTo(resultsMap);
  });

  if (markers.length) {
    const group = L.featureGroup(markers);
    resultsMap.fitBounds(group.getBounds(), { padding: [30, 30] });
  }
}

function resetGame() {
  clearSavedState();
  if (resultsMap) { resultsMap.remove(); resultsMap = null; }
  state.currentRound = 0;
  state.results = [];
  state.totalDistance = 0;
  if (state.guessMarker) { map.removeLayer(state.guessMarker); state.guessMarker = null; }
  if (state.actualMarker) { map.removeLayer(state.actualMarker); state.actualMarker = null; }
  if (state.guessLine)    { map.removeLayer(state.guessLine);    state.guessLine = null; }
  loadAndStart();
}

/* ── Init ── */
async function loadAndStart() {
  const resp = await fetch("guests.json");
  const data = await resp.json();
  state.rounds = shuffle(data);
  showScreen("game");
  setTimeout(() => {
    initMap();
    map.invalidateSize();
    startRound();
  }, 50);
}

document.addEventListener("DOMContentLoaded", () => {
  // Language buttons
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => applyLanguage(btn.dataset.lang));
  });

  // Start
  document.getElementById("btn-start").addEventListener("click", loadAndStart);

  // Submit guess
  document.getElementById("btn-submit").addEventListener("click", submitGuess);

  // Next round
  document.getElementById("btn-next").addEventListener("click", nextRound);

  // Replay
  document.getElementById("btn-replay").addEventListener("click", resetGame);

  // Resume saved game
  document.getElementById('btn-resume').addEventListener('click', resumeGame);

  // Apply default language
  applyLanguage("fr");

  // Show resume button if saved state exists
  checkSavedState();
});
