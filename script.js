/**
 * Registro de Horas - Core Logic
 * Handles Timer, CRUD, Persistence, and Dashboard
 */

// State Management
let entries = JSON.parse(localStorage.getItem('timeEntries')) || [
    { id: 1, date: '2024-05-20', desc: 'Estudos de Programação', start: '19:00', end: '21:00', total: '02:00', category: 'Estudo' },
    { id: 2, date: '2024-05-20', desc: 'Leitura', start: '21:00', end: '21:30', total: '00:30', category: 'Lazer' },
    { id: 3, date: '2024-05-19', desc: 'Projetos Pessoais', start: '14:00', end: '18:00', total: '04:00', category: 'Projetos' }
];

// Default categories
const defaultCategories = [
    { id: 'cat-1', name: '🏢 Atividades internas', color: '#34d399' },
    { id: 'cat-2', name: '🛠️ Instalação',          color: '#3b82f6' },
    { id: 'cat-3', name: '⬛ Toner',               color: '#f59e0b' },
    { id: 'cat-4', name: '🖨️ Impressora',          color: '#d946ef' },
    { id: 'cat-5', name: '📞 Ramal',               color: '#06b6d4' },
    { id: 'cat-6', name: '🚀 Rollout',             color: '#6366f1' },
    { id: 'cat-7', name: '🎧 Suporte',             color: '#fb7185' }
];
let categories = JSON.parse(localStorage.getItem('timeCategories')) || defaultCategories;
let timerRunning = false;
let timerInterval;
let secondsElapsed = parseInt(localStorage.getItem('timerSeconds')) || 0;
let editId = null;

// Pomodoro state
let pomodoroMode = false;
let pomodoroDuration = 1500; // 25 min default



// Initialization
document.addEventListener('DOMContentLoaded', () => {
    updateCurrentDate();
    renderCategoryManager();
    renderEntries();
    setDefaultDate();
    setupSearch();
    renderQuickFills();
    setupKeyboardShortcuts();
    // Initialize pill indicator position after layout is rendered
    requestAnimationFrame(initPillIndicator);

    if (secondsElapsed > 0) {
        document.getElementById('timer-text').innerText = formatTime(secondsElapsed);
    }
});

function initPillIndicator() {
    const indicator = document.getElementById('mode-indicator');
    const btnFree   = document.getElementById('mode-free');
    const pill      = document.getElementById('mode-pill-wrap');
    if (!indicator || !btnFree || !pill) return;
    const pillRect = pill.getBoundingClientRect();
    const btnRect  = btnFree.getBoundingClientRect();
    // Disable transition briefly so initial position is instant
    indicator.style.transition = 'none';
    indicator.style.left  = (btnRect.left - pillRect.left - 4) + 'px';
    indicator.style.width = btnRect.width + 'px';
    // Re-enable transition after a frame
    requestAnimationFrame(() => { indicator.style.transition = ''; });
}


function updateCurrentDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const display = document.getElementById('current-date-display');
    if (display) display.innerText = new Date().toLocaleDateString('pt-BR', options);
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('form-date');
    if (dateInput) dateInput.value = today;
}

// Timer Logic
function toggleTimer() {
    const btnLabel  = document.getElementById('timer-btn-label');
    const btnIcon   = document.getElementById('timer-icon');
    const timerEl   = document.getElementById('timer-text');
    const btnToggle = document.getElementById('btn-timer-toggle');
    const banner    = document.getElementById('pomodoro-banner');

    if (!timerRunning) {
        // — Start —
        timerRunning = true;
        if (banner) banner.classList.add('hidden');

        // Button label / icon
        btnLabel.innerText = 'Parar';
        btnIcon.innerHTML  = `<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd"/>`;

        if (pomodoroMode) {
            // Pomodoro: orange style
            btnToggle.style.cssText = 'background:#f97316;border-color:#fb923c;box-shadow:0 0 20px rgba(249,115,22,0.5);';
            timerEl.style.textShadow = '0 0 30px rgba(249,115,22,0.7)';
            timerEl.style.color = '#fb923c';
            // Init countdown from duration if fresh
            if (secondsElapsed === 0) secondsElapsed = pomodoroDuration;

            timerInterval = setInterval(() => {
                secondsElapsed--;
                timerEl.innerText = formatTime(secondsElapsed);
                localStorage.setItem('timerSeconds', secondsElapsed);
                if (secondsElapsed <= 0) {
                    stopTimer();
                    playPomodoroBeep();
                    if (banner) banner.classList.remove('hidden');
                }
            }, 1000);
        } else {
            // Free mode: purple style
            btnToggle.style.cssText = '';
            btnToggle.classList.add('bg-danger');
            timerEl.classList.add('animate-pulse-subtle');
            timerEl.style.color = '';
            timerEl.style.textShadow = '0 0 30px rgba(192,132,252,0.5)';

            timerInterval = setInterval(() => {
                secondsElapsed++;
                timerEl.innerText = formatTime(secondsElapsed);
                localStorage.setItem('timerSeconds', secondsElapsed);
            }, 1000);
        }
    } else {
        stopTimer();
    }
}

function stopTimer() {
    clearInterval(timerInterval);
    timerRunning = false;

    const btnLabel  = document.getElementById('timer-btn-label');
    const btnIcon   = document.getElementById('timer-icon');
    const timerEl   = document.getElementById('timer-text');
    const btnToggle = document.getElementById('btn-timer-toggle');

    btnLabel.innerText = 'Iniciar';
    btnIcon.innerHTML  = `<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>`;

    // Reset button style
    btnToggle.style.cssText = '';
    btnToggle.classList.remove('bg-danger');
    timerEl.classList.remove('animate-pulse-subtle');

    if (!pomodoroMode) {
        timerEl.style.color = '';
        timerEl.style.textShadow = '0 0 30px rgba(192,132,252,0.5)';
    }
}

function setTimerMode(mode) {
    if (timerRunning) stopTimer();
    secondsElapsed = 0;
    localStorage.removeItem('timerSeconds');

    const timerEl   = document.getElementById('timer-text');
    const label     = document.getElementById('timer-mode-label');
    const config    = document.getElementById('pomodoro-config');
    const btnFree   = document.getElementById('mode-free');
    const btnPomo   = document.getElementById('mode-pomodoro');
    const banner    = document.getElementById('pomodoro-banner');
    const indicator = document.getElementById('mode-indicator');
    const buttonsRow = document.querySelector('.timer-buttons-row');

    if (banner) banner.classList.add('hidden');
    pomodoroMode = (mode === 'pomodoro');

    // ── Slide the pill indicator to the active button ──
    function slideIndicator(targetBtn, colorClass) {
        if (!indicator || !targetBtn) return;
        const pill = document.getElementById('mode-pill-wrap');
        const pillRect = pill.getBoundingClientRect();
        const btnRect  = targetBtn.getBoundingClientRect();
        indicator.style.left  = (btnRect.left - pillRect.left - 4) + 'px';
        indicator.style.width = btnRect.width + 'px';
        indicator.className   = 'mode-pill-indicator ' + colorClass;
    }

    // Small nudge: timer text + label + buttons shift slightly when config appears
    const nudgeEls = [timerEl, label, buttonsRow].filter(Boolean);

    if (pomodoroMode) {
        // Nudge down to give room to duration config
        nudgeEls.forEach(el => el.classList.add('timer-nudge-down'));

        // Slide indicator to Pomodoro (orange)
        requestAnimationFrame(() => slideIndicator(btnPomo, 'is-pomodoro'));

        // Reveal duration config from depth
        config.classList.add('config-visible');

        // Button text color  
        btnPomo.style.color = '#fff';
        btnFree.style.color = 'rgba(192,132,252,0.7)';

        // Label + timer color
        label.innerText = '🍅 Modo Pomodoro';
        label.style.color = '#fb923c';
        timerEl.style.color = '#fb923c';
        timerEl.style.textShadow = '0 0 30px rgba(249,115,22,0.5)';
        timerEl.innerText = formatTime(pomodoroDuration);
    } else {
        // Remove nudge
        nudgeEls.forEach(el => el.classList.remove('timer-nudge-down'));

        // Slide indicator to Free (violet)
        requestAnimationFrame(() => slideIndicator(btnFree, 'is-free'));

        // Hide duration config
        config.classList.remove('config-visible');

        // Button text color
        btnFree.style.color = '#fff';
        btnPomo.style.color = 'rgba(167,139,250,0.7)';

        // Label + timer color
        label.innerText = 'Processo Ativo';
        label.style.color = '';
        timerEl.style.color = '';
        timerEl.style.textShadow = '0 0 30px rgba(192,132,252,0.5)';
        timerEl.innerText = '00:00:00';
    }
}

function updatePomodoroDuration() {
    const sel = document.getElementById('pomodoro-duration');
    pomodoroDuration = parseInt(sel.value);
    if (!timerRunning) {
        secondsElapsed = 0;
        document.getElementById('timer-text').innerText = formatTime(pomodoroDuration);
    }
}

function playPomodoroBeep() {
    try {
        const ctx  = new (window.AudioContext || window.webkitAudioContext)();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type      = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.5);
    } catch(e) { /* AudioContext not available */ }
}

// Keyboard Shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        const tag = document.activeElement.tagName.toLowerCase();
        const isTyping = ['input','textarea','select'].includes(tag);
        if (isTyping) return;

        if (e.code === 'Space') {
            e.preventDefault();
            toggleTimer();
        }
        if (e.code === 'Enter') {
            e.preventDefault();
            const form = document.getElementById('entry-form');
            if (form) form.requestSubmit();
        }
    });
}

function saveTimerToForm() {
    if (secondsElapsed === 0) return;
    const elapsed = pomodoroMode ? (pomodoroDuration - secondsElapsed) : secondsElapsed;
    if (elapsed <= 0) return;

    const now    = new Date();
    const endH   = now.getHours().toString().padStart(2, '0');
    const endM   = now.getMinutes().toString().padStart(2, '0');
    const startNow = new Date(now.getTime() - elapsed * 1000);
    const startH = startNow.getHours().toString().padStart(2, '0');
    const startM = startNow.getMinutes().toString().padStart(2, '0');

    document.getElementById('form-start').value = `${startH}:${startM}`;
    document.getElementById('form-end').value   = `${endH}:${endM}`;
    document.getElementById('entry-form').scrollIntoView({ behavior: 'smooth' });
}

function resetTimer() {
    stopTimer();
    secondsElapsed = 0;
    localStorage.removeItem('timerSeconds');
    const timerEl = document.getElementById('timer-text');
    const banner  = document.getElementById('pomodoro-banner');
    if (banner) banner.classList.add('hidden');
    timerEl.innerText = pomodoroMode ? formatTime(pomodoroDuration) : '00:00:00';
}

function formatTime(sec) {
    const h = Math.floor(sec / 3600).toString().padStart(2, '0');
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}


// CRUD Logic
function saveEntry(e) {
    e.preventDefault();
    const dateInput = document.getElementById('form-date');
    const categoryInput = document.getElementById('form-category');
    const descInput = document.getElementById('form-desc');
    const startInput = document.getElementById('form-start');
    const endInput = document.getElementById('form-end');

    const startVal = startInput.value;
    const endVal = endInput.value;
    const catVal = categoryInput.value;

    let startMin = timeToMin(startVal);
    let endMin = timeToMin(endVal);
    let diff = endMin - startMin;
    if (diff < 0) diff += 24 * 60;
    const total = minToTime(diff);

    if (editId) {
        // Update
        const index = entries.findIndex(ent => ent.id === editId);
        entries[index] = { ...entries[index], 
            date: dateInput.value,
            category: catVal,
            desc: descInput.value, 
            start: startVal,
            end: endVal,
            total: total
        };
        editId = null;
        document.querySelector('button[type="submit"]').innerText = 'Gravar no Storage';
    } else {
        // Create
        const newEntry = {
            id: Date.now(),
            date: dateInput.value,
            category: catVal,
            desc: descInput.value,
            start: startVal,
            end: endVal,
            total: total
        };
        entries.unshift(newEntry);
    }

    persist();
    renderEntries();
    renderQuickFills();
    e.target.reset();
    setDefaultDate();
}

function editEntry(id) {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    document.getElementById('form-date').value = entry.date;
    document.getElementById('form-category').value = entry.category || 'Atividades internas';
    document.getElementById('form-desc').value = entry.desc;
    if (entry.start) document.getElementById('form-start').value = entry.start;
    if (entry.end) document.getElementById('form-end').value = entry.end;
    
    editId = id;
    document.querySelector('button[type="submit"]').innerText = 'Atualizar Storage';
    document.getElementById('entry-form').scrollIntoView({ behavior: 'smooth' });
}

function deleteEntry(id) {
    if(confirm('Tem certeza que deseja remover este registro?')) {
        entries = entries.filter(e => e.id !== id);
        persist();
        renderEntries();
        renderQuickFills();
    }
}

function persist() {
    localStorage.setItem('timeEntries', JSON.stringify(entries));
}

function renderEntries(filteredEntries = entries) {
    const list = document.getElementById('activity-list');
    if (!list) return;
    
    list.innerHTML = '';

    filteredEntries.forEach(entry => {
        const row = document.createElement('tr');
        row.className = 'table-row-hover transition-colors group';
        row.innerHTML = `
            <td class="px-6 py-5 whitespace-nowrap text-sm font-medium text-accent/90">${formatDateBR(entry.date)}</td>
            <td class="px-6 py-5">
                <div class="text-sm font-bold text-white mb-1.5">${entry.desc}</div>
                ${getCategoryBadge(entry.category)}
            </td>
            <td class="px-6 py-5 whitespace-nowrap text-right">
                <span class="text-sm font-bold text-accent drop-shadow-[0_0_8px_var(--accent-glow)]">${entry.total}h</span>
            </td>
            <td class="px-6 py-5 whitespace-nowrap text-center actions-cell">
                <div class="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="editEntry(${entry.id})" class="p-2 text-accent/80 hover:text-accent transition-all hover:drop-shadow-[0_0_8px_var(--accent-glow)]">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onclick="deleteEntry(${entry.id})" class="p-2 text-accent/40 hover:text-danger transition-all hover:drop-shadow-[0_0_8px_rgba(251,113,133,0.8)]">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </td>
        `;
        list.appendChild(row);
    });

    updateDashboard();
}

function getCategoryBadge(categoryName) {
    const cat = categories.find(c => c.name === categoryName);
    const color = cat ? cat.color : '#c084fc';
    const r = parseInt(color.slice(1,3), 16);
    const g = parseInt(color.slice(3,5), 16);
    const b = parseInt(color.slice(5,7), 16);
    return `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border"
        style="background:rgba(${r},${g},${b},0.12);color:rgb(${r},${g},${b});border-color:rgba(${r},${g},${b},0.3);box-shadow:0 0 6px rgba(${r},${g},${b},0.25);">
        ${categoryName || 'Geral'}
    </span>`;
}

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = entries.filter(entry => 
            entry.desc.toLowerCase().includes(term) || 
            entry.date.includes(term)
        );
        renderEntries(filtered);
    });
}

// Exports
function exportCSV() {
    // Add UTF-8 BOM for Excel compatibility
    let csv = '\uFEFF';
    
    // Header with Semicolon (Standard for regional Excel)
    csv += 'Data;Descrição;Tempo Dedicado (h)\n';
    
    entries.forEach(e => {
        // Wrap fields in quotes to prevent column break
        const desc = `"${e.desc.replace(/"/g, '""')}"`;
        csv += `${formatDateBR(e.date)};${desc};${e.total}\n`;
    });
    
    // Summary line
    const totalMin = entries.reduce((sum, e) => sum + timeToMin(e.total), 0);
    csv += `\n;;;TOTAL;${minToTime(totalMin)}`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'registro_de_horas.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function exportPDF() {
    window.print();
}

// Helpers
function formatDateBR(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

function updateDashboard() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentYear  = now.getFullYear();
    const currentMonth = now.getMonth();

    // Day Total
    const dayTotal = entries
        .filter(e => e.date === todayStr)
        .reduce((sum, e) => sum + timeToMin(e.total), 0);

    // Week Total
    const weekTotal = entries.reduce((sum, e) => sum + timeToMin(e.total), 0);

    // Month Total — only current month/year
    const monthTotalMin = entries
        .filter(e => {
            const d = new Date(e.date + 'T00:00:00');
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        })
        .reduce((sum, e) => sum + timeToMin(e.total), 0);

    document.getElementById('card-day').innerText   = minToTime(dayTotal)  + 'h';
    document.getElementById('card-week').innerText  = minToTime(weekTotal) + 'h';
    document.getElementById('card-month').innerText = minToTime(monthTotalMin) + 'h';

    renderCategoryChart(currentYear, currentMonth);
}



function timeToMin(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return (h * 60) + m;
}

function minToTime(min) {
    const h = Math.floor(min / 60).toString().padStart(2, '0');
    const m = (min % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
}

// Category Distribution Chart
function renderCategoryChart(year, month) {
    const container = document.getElementById('category-chart');
    if (!container) return;

    // Filter entries for current month
    const monthEntries = entries.filter(e => {
        const d = new Date(e.date + 'T00:00:00');
        return d.getFullYear() === year && d.getMonth() === month;
    });

    if (monthEntries.length === 0) {
        container.innerHTML = `<p class="text-xs text-accent/50 font-bold uppercase tracking-widest text-center py-4">Nenhum registro no mês atual</p>`;
        return;
    }

    // Group by category
    const catMap = {};
    monthEntries.forEach(e => {
        const key = e.category || 'Geral';
        catMap[key] = (catMap[key] || 0) + timeToMin(e.total);
    });

    // Sort descending
    const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const maxMin = sorted[0][1];

    container.innerHTML = '';
    sorted.forEach(([name, mins]) => {
        const pct     = Math.round((mins / maxMin) * 100);
        const cat     = categories.find(c => c.name === name);
        const color   = cat ? cat.color : '#c084fc';
        const r = parseInt(color.slice(1,3), 16);
        const g = parseInt(color.slice(3,5), 16);
        const b = parseInt(color.slice(5,7), 16);
        const hLabel  = minToTime(mins) + 'h';
        const pctLabel = pct + '%';

        const row = document.createElement('div');
        row.className = 'flex items-center gap-3 group';
        row.innerHTML = `
            <span class="text-[11px] font-bold w-40 shrink-0 truncate" style="color:rgb(${r},${g},${b})">${name}</span>
            <div class="flex-1 h-5 bg-[rgba(15,0,28,0.4)] rounded-full overflow-hidden border border-accent/10">
                <div class="h-full rounded-full transition-all duration-700"
                    style="width:${pct}%;background:rgba(${r},${g},${b},0.7);box-shadow:0 0 8px rgba(${r},${g},${b},0.4);"></div>
            </div>
            <span class="text-[11px] font-black tabular-nums w-14 text-right" style="color:rgb(${r},${g},${b})">${hLabel}</span>
            <span class="text-[10px] font-bold text-accent/50 w-8 text-right">${pctLabel}</span>
        `;
        container.appendChild(row);
    });
}

// Category Manager
function renderCategoryManager() {
    const container = document.getElementById('category-list-container');
    const select = document.getElementById('form-category');
    if (!container || !select) return;

    // Render tags in the top card
    container.innerHTML = '';
    categories.forEach(cat => {
        const r = parseInt(cat.color.slice(1,3), 16);
        const g = parseInt(cat.color.slice(3,5), 16);
        const b = parseInt(cat.color.slice(5,7), 16);
        const tag = document.createElement('div');
        tag.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border group cursor-default';
        tag.style.cssText = `background:rgba(${r},${g},${b},0.12);color:rgb(${r},${g},${b});border-color:rgba(${r},${g},${b},0.35);`;
        tag.innerHTML = `
            <span class="leading-none">${cat.name}</span>
            <button type="button" onclick="deleteCategory('${cat.id}')"
                class="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 hover:text-white leading-none"
                title="Remover">&times;</button>
        `;
        container.appendChild(tag);
    });

    // Populate select
    select.innerHTML = '';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.name;
        opt.textContent = cat.name;
        select.appendChild(opt);
    });
}

function addCategory(e) {
    e.preventDefault();
    const nameInput = document.getElementById('cat-name');
    const colorInput = document.getElementById('cat-color');
    const name = nameInput.value.trim();
    if (!name) return;
    const exists = categories.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (exists) { nameInput.focus(); return; }

    const newCat = { id: 'cat-' + Date.now(), name, color: colorInput.value };
    categories.push(newCat);
    localStorage.setItem('timeCategories', JSON.stringify(categories));
    renderCategoryManager();
    e.target.reset();
    colorInput.value = '#c084fc';
}

function deleteCategory(id) {
    if (categories.length <= 1) return; // keep at least one
    categories = categories.filter(c => c.id !== id);
    localStorage.setItem('timeCategories', JSON.stringify(categories));
    renderCategoryManager();
}

function initQuotesCarousel() {} // removed


// Quick Fills Logic
function renderQuickFills() {
    const container = document.getElementById('quick-fill-container');
    if (!container) return;
    
    // Group combinations
    const patterns = {};
    entries.forEach(e => {
        if (!e.start || !e.end) return; // Ignore legacy entries without specific times
        const key = `${e.category || 'Atividades internas'}|${e.desc}|${e.start}|${e.end}`;
        if (!patterns[key]) patterns[key] = { desc: e.desc, start: e.start, end: e.end, category: e.category || 'Atividades internas', count: 0 };
        patterns[key].count++;
    });

    // Sort by frequency
    let sorted = Object.values(patterns).sort((a, b) => b.count - a.count).slice(0, 3);
    
    // Default fallback if no valid matches are found
    if (sorted.length === 0) {
        sorted = [{ desc: 'Manutenção Padrão', start: '07:00', end: '13:00', category: 'Atividades internas' }];
    }

    container.innerHTML = '';
    
    sorted.forEach(preset => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'text-[10px] sm:text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-xl bg-[rgba(192,132,252,0.1)] text-accent border border-accent/20 hover:bg-accent hover:text-white transition-all shadow-[0_0_10px_rgba(192,132,252,0.05)] hover:shadow-[0_0_15px_rgba(192,132,252,0.4)] flex items-center gap-1.5 focus:outline-none';
        btn.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> ${preset.desc} (${preset.start}-${preset.end})`;
        
        btn.onclick = () => {
            document.getElementById('form-category').value = preset.category;
            document.getElementById('form-desc').value = preset.desc;
            document.getElementById('form-start').value = preset.start;
            document.getElementById('form-end').value = preset.end;
            // Optionally flash input fields to show change
            const inputs = ['form-category', 'form-desc', 'form-start', 'form-end'].map(id => document.getElementById(id));
            inputs.forEach(input => {
                input.classList.add('bg-accent/20', 'border-accent');
                setTimeout(() => input.classList.remove('bg-accent/20', 'border-accent'), 300);
            });
        };
        
        container.appendChild(btn);
    });
    
    container.classList.remove('hidden');
}

// ── Sidebar & UI Navigation ──
function toggleSidebar(show) {
    const menu = document.getElementById('sidebar-menu');
    const overlay = document.getElementById('sidebar-overlay');
    if (!menu || !overlay) return;
    
    if (show) {
        menu.classList.add('sidebar-open');
        overlay.classList.add('overlay-visible');
        document.body.style.overflow = 'hidden';
    } else {
        menu.classList.remove('sidebar-open');
        overlay.classList.remove('overlay-visible');
        document.body.style.overflow = '';
    }
}

// ── Theme Management ──
const themes = [
    { name: 'Violet', accent: '#c084fc', glow: 'rgba(192, 132, 252, 0.5)', cardBg: 'rgba(22, 5, 43, 0.65)', cardHoverBg: 'rgba(40, 10, 75, 0.75)' },
    { name: 'Cyan', accent: '#22d3ee', glow: 'rgba(34, 211, 238, 0.5)', cardBg: 'rgba(5, 25, 40, 0.7)', cardHoverBg: 'rgba(10, 50, 75, 0.75)' },
    { name: 'Emerald', accent: '#34d399', glow: 'rgba(52, 211, 153, 0.5)', cardBg: 'rgba(5, 35, 20, 0.7)', cardHoverBg: 'rgba(10, 75, 50, 0.75)' },
    { name: 'Rose', accent: '#fb7185', glow: 'rgba(251, 113, 133, 0.5)', cardBg: 'rgba(35, 5, 15, 0.7)', cardHoverBg: 'rgba(75, 10, 30, 0.75)' },
    { name: 'Amber', accent: '#fbbf24', glow: 'rgba(251, 191, 36, 0.5)', cardBg: 'rgba(35, 25, 5, 0.7)', cardHoverBg: 'rgba(75, 55, 10, 0.75)' }
];
let currentThemeIdx = 0;

function changeTheme() {
    currentThemeIdx = (currentThemeIdx + 1) % themes.length;
    const theme = themes[currentThemeIdx];
    const nextTheme = themes[(currentThemeIdx + 1) % themes.length];
    
    document.documentElement.style.setProperty('--accent', theme.accent);
    document.documentElement.style.setProperty('--accent-glow', theme.glow);
    document.documentElement.style.setProperty('--card-bg', theme.cardBg);
    document.documentElement.style.setProperty('--card-hover-bg', theme.cardHoverBg);
    
    // Update PWA meta theme color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', theme.accent);
    
    // Update theme button icon container
    const iconContainer = document.getElementById('theme-icon-container');
    const themeBtn = document.getElementById('theme-switch-btn');
    if (iconContainer) {
        iconContainer.style.backgroundColor = theme.accent + '33'; // 20% opacity
        iconContainer.style.borderColor = theme.accent + '4d';     // 30% opacity
        iconContainer.style.boxShadow = `0 0 15px ${theme.glow}`;
    }
    
    // Update Sidebar border for feedback
    const sidebar = document.getElementById('sidebar-menu');
    if (sidebar) {
        sidebar.style.borderColor = theme.accent + '33';
        sidebar.style.backgroundColor = theme.cardBg;
    }
}

// ── Maintenance ──
function confirmClearStorage() {
    if (confirm('⚠️ ATENÇÃO: Isso apagará TODOS os seus registros permanentemente. Deseja continuar?')) {
        localStorage.clear();
        window.location.reload();
    }
}

// ── PWA Installation ──
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) installBtn.classList.remove('hidden');
});

async function installApp() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) installBtn.classList.add('hidden');
    }
    deferredPrompt = null;
}
