/**
 * TimeTracker Cyber — Core Logic v9.0.9
 * Refactored: centralized state, named constants, module pattern
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
    ENTRIES:     'timeEntries',
    CATEGORIES:  'timeCategories',
    TIMER:       'timerSeconds',
    DAILY_GOAL:  'dailyGoalMin',
};

const DEFAULTS = {
    POMODORO_DURATION_SEC: 1500,   // 25 minutes
    DAILY_GOAL_MIN:        360,    // 6 hours
    MAX_TERMINAL_ENTRIES:  50,
    MAX_QUICK_FILLS:       3,
    TOAST_DURATION_MS:     4000,
    BEEP_DURATION_SEC:     1.5,
    BEEP_FREQUENCY_HZ:     880,
    BEEP_GAIN:             0.3,
};

const DEFAULT_CATEGORIES = [
    { id: 'cat-1', name: '🏢 Atividades internas', color: '#34d399' },
    { id: 'cat-2', name: '🛠️ Instalação',          color: '#3b82f6' },
    { id: 'cat-3', name: '⬛ Toner',               color: '#f59e0b' },
    { id: 'cat-4', name: '🖨️ Impressora',          color: '#d946ef' },
    { id: 'cat-5', name: '📞 Ramal',               color: '#06b6d4' },
    { id: 'cat-6', name: '🚀 Rollout',             color: '#6366f1' },
    { id: 'cat-7', name: '🎧 Suporte',             color: '#fb7185' },
];

const THEMES = [
    { name: 'Violet',  accent: '#c084fc', secondary: '#818cf8', glow: 'rgba(192,132,252,0.5)', cardBg: 'rgba(22,5,43,0.65)',   cardHoverBg: 'rgba(40,10,75,0.75)'  },
    { name: 'Cyan',    accent: '#22d3ee', secondary: '#0ea5e9', glow: 'rgba(34,211,238,0.5)',  cardBg: 'rgba(5,25,40,0.7)',    cardHoverBg: 'rgba(10,50,75,0.75)'  },
    { name: 'Emerald', accent: '#34d399', secondary: '#10b981', glow: 'rgba(52,211,153,0.5)',  cardBg: 'rgba(5,35,20,0.7)',    cardHoverBg: 'rgba(10,75,50,0.75)'  },
    { name: 'Rose',    accent: '#fb7185', secondary: '#e11d48', glow: 'rgba(251,113,133,0.5)', cardBg: 'rgba(35,5,15,0.7)',    cardHoverBg: 'rgba(75,10,30,0.75)'  },
    { name: 'Amber',   accent: '#fbbf24', secondary: '#f59e0b', glow: 'rgba(251,191,36,0.5)',  cardBg: 'rgba(35,25,5,0.7)',    cardHoverBg: 'rgba(75,55,10,0.75)'  },
];

// ─── App State ────────────────────────────────────────────────────────────────

const AppState = {
    entries:        JSON.parse(localStorage.getItem(STORAGE_KEYS.ENTRIES)) || [
        { id: 1, date: '2024-05-20', desc: 'Estudos de Programação', start: '19:00', end: '21:00', total: '02:00', category: 'Estudo' },
        { id: 2, date: '2024-05-20', desc: 'Leitura',                start: '21:00', end: '21:30', total: '00:30', category: 'Lazer'  },
        { id: 3, date: '2024-05-19', desc: 'Projetos Pessoais',      start: '14:00', end: '18:00', total: '04:00', category: 'Projetos' },
    ],
    categories:     JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES)) || DEFAULT_CATEGORIES,
    dailyGoalMin:   parseInt(localStorage.getItem(STORAGE_KEYS.DAILY_GOAL))   || DEFAULTS.DAILY_GOAL_MIN,

    timer: {
        running:          false,
        interval:         null,
        secondsElapsed:   parseInt(localStorage.getItem(STORAGE_KEYS.TIMER)) || 0,
        pomodoroMode:     false,
        pomodoroDuration: DEFAULTS.POMODORO_DURATION_SEC,
    },

    ui: {
        editId:           null,
        currentThemeIdx:  0,
        deferredPwaPrompt: null,
        categoryChart:    null,
    },
};

// ─── Persistence ──────────────────────────────────────────────────────────────

const Storage = {
    saveEntries()    { localStorage.setItem(STORAGE_KEYS.ENTRIES,    JSON.stringify(AppState.entries));    },
    saveCategories() { localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(AppState.categories)); },
    saveDailyGoal()  { localStorage.setItem(STORAGE_KEYS.DAILY_GOAL, AppState.dailyGoalMin);               },
    saveTimer()      { localStorage.setItem(STORAGE_KEYS.TIMER,      AppState.timer.secondsElapsed);       },
    clearTimer()     { localStorage.removeItem(STORAGE_KEYS.TIMER); },
    clearAll()       { localStorage.clear(); },

    saveAll() {
        this.saveEntries();
        this.saveCategories();
        this.saveDailyGoal();
    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

function formatTime(sec) {
    const h = Math.floor(sec / 3600).toString().padStart(2, '0');
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function formatDateBR(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

function timeToMin(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h * 60) + (m || 0);
}

function minToTime(min) {
    const h = Math.floor(min / 60).toString().padStart(2, '0');
    const m = (min % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
}

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ─── Terminal Module ──────────────────────────────────────────────────────────

const Terminal = {
    log(message, type = 'info') {
        const terminal = $('cyber-terminal');
        if (!terminal) return;

        const colorMap = { success: 'text-success', error: 'text-danger', warning: 'text-amber-400' };
        const colorClass = colorMap[type] || 'text-accent/60';
        const timeStr = new Date().toLocaleTimeString('pt-BR', { hour12: false });

        const entry = document.createElement('div');
        entry.className = `terminal-entry ${colorClass}`;
        entry.innerHTML = `<span class="opacity-40">[${timeStr}]</span> > ${message.toUpperCase()}`;
        terminal.appendChild(entry);
        terminal.scrollTop = terminal.scrollHeight;

        if (terminal.children.length > DEFAULTS.MAX_TERMINAL_ENTRIES) {
            terminal.removeChild(terminal.firstChild);
        }
    },
};

// Legacy global alias kept for HTML inline calls
function sysLog(message, type) { Terminal.log(message, type); }

// ─── Toast Module ─────────────────────────────────────────────────────────────

const Toast = {
    ICONS: {
        success: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
        error:   '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
        warning: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>',
    },

    show(message, type = 'success', duration = DEFAULTS.TOAST_DURATION_MS) {
        const container = $('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `cyber-toast toast-${type}`;
        toast.innerHTML = `
            <div class="text-accent">${this.ICONS[type] || ''}</div>
            <div class="flex flex-col">
                <span class="text-[10px] font-black uppercase tracking-widest opacity-50">${type === 'success' ? 'Syscall Return' : 'System Alert'}</span>
                <span>${message}</span>
            </div>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },
};

// Legacy global alias
function showToast(message, type, duration) { Toast.show(message, type, duration); }

// ─── Timer Module ─────────────────────────────────────────────────────────────

const TimerModule = {
    get state() { return AppState.timer; },

    toggle() {
        this.state.running ? this.stop() : this.start();
    },

    start() {
        const { timer } = AppState;
        timer.running = true;

        const timerEl   = $('timer-text');
        const btnLabel  = $('timer-btn-label');
        const btnIcon   = $('timer-icon');
        const btnToggle = $('btn-timer-toggle');
        const banner    = $('pomodoro-banner');

        if (banner) banner.classList.add('hidden');
        btnLabel.innerText = 'Parar';
        btnIcon.innerHTML  = `<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd"/>`;

        if (timer.pomodoroMode) {
            btnToggle.style.cssText = 'background:#f97316;border-color:#fb923c;box-shadow:0 0 20px rgba(249,115,22,0.5);';
            timerEl.style.textShadow = '0 0 30px rgba(249,115,22,0.7)';
            timerEl.style.color = '#fb923c';
            if (timer.secondsElapsed === 0) timer.secondsElapsed = timer.pomodoroDuration;

            timer.interval = setInterval(() => {
                timer.secondsElapsed--;
                timerEl.innerText = formatTime(timer.secondsElapsed);
                Storage.saveTimer();
                if (timer.secondsElapsed <= 0) {
                    this.stop();
                    this._playBeep();
                    if (banner) banner.classList.remove('hidden');
                }
            }, 1000);
        } else {
            btnToggle.style.cssText = '';
            btnToggle.classList.add('bg-danger');
            timerEl.classList.add('animate-pulse-subtle');
            timerEl.style.color = '';
            timerEl.style.textShadow = '0 0 30px rgba(192,132,252,0.5)';

            timer.interval = setInterval(() => {
                timer.secondsElapsed++;
                timerEl.innerText = formatTime(timer.secondsElapsed);
                Storage.saveTimer();
            }, 1000);
        }

        Terminal.log(`Cronômetro INICIADO (${timer.pomodoroMode ? 'POMODORO' : 'LIVRE'})`, 'info');
    },

    stop() {
        const { timer } = AppState;
        clearInterval(timer.interval);
        timer.running = false;

        const btnLabel  = $('timer-btn-label');
        const btnIcon   = $('timer-icon');
        const timerEl   = $('timer-text');
        const btnToggle = $('btn-timer-toggle');

        btnLabel.innerText = 'Iniciar';
        btnIcon.innerHTML  = `<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>`;
        btnToggle.style.cssText = '';
        btnToggle.classList.remove('bg-danger');
        timerEl.classList.remove('animate-pulse-subtle');
        if (!timer.pomodoroMode) {
            timerEl.style.color = '';
            timerEl.style.textShadow = '0 0 30px rgba(192,132,252,0.5)';
        }
        Terminal.log('Cronômetro INTERROMPIDO', 'warning');
    },

    reset() {
        this.stop();
        const { timer } = AppState;
        timer.secondsElapsed = 0;
        Storage.clearTimer();
        const timerEl = $('timer-text');
        const banner  = $('pomodoro-banner');
        if (banner) banner.classList.add('hidden');
        if (timerEl) timerEl.innerText = timer.pomodoroMode ? formatTime(timer.pomodoroDuration) : '00:00:00';
    },

    setMode(mode) {
        this.reset();
        const { timer } = AppState;
        timer.pomodoroMode = (mode === 'pomodoro');

        const timerEl    = $('timer-text');
        const label      = $('timer-mode-label');
        const config     = $('pomodoro-config');
        const btnFree    = $('mode-free');
        const btnPomo    = $('mode-pomodoro');
        const banner     = $('pomodoro-banner');
        const indicator  = $('mode-indicator');
        const btnsRow    = document.querySelector('.timer-buttons-row');

        if (banner) banner.classList.add('hidden');

        const slideIndicator = (targetBtn, colorClass) => {
            if (!indicator || !targetBtn) return;
            const pill     = $('mode-pill-wrap');
            const pillRect = pill.getBoundingClientRect();
            const btnRect  = targetBtn.getBoundingClientRect();
            indicator.style.left  = (btnRect.left - pillRect.left - 4) + 'px';
            indicator.style.width = btnRect.width + 'px';
            indicator.className   = 'mode-pill-indicator ' + colorClass;
        };

        const nudgeEls = [timerEl, label, btnsRow].filter(Boolean);

        if (timer.pomodoroMode) {
            nudgeEls.forEach(el => el.classList.add('timer-nudge-down'));
            requestAnimationFrame(() => slideIndicator(btnPomo, 'is-pomodoro'));
            config.classList.add('config-visible');
            btnPomo.style.color = '#fff';
            btnFree.style.color = 'var(--accent)';
            label.classList.replace('is-free', 'is-pomodoro');
            timerEl.style.color = '#fb923c';
            timerEl.style.textShadow = '0 0 30px rgba(249,115,22,0.5)';
            timerEl.innerText = formatTime(timer.pomodoroDuration);
        } else {
            nudgeEls.forEach(el => el.classList.remove('timer-nudge-down'));
            requestAnimationFrame(() => slideIndicator(btnFree, 'is-free'));
            config.classList.remove('config-visible');
            btnFree.style.color = '#fff';
            btnPomo.style.color = 'var(--accent)';
            label.classList.replace('is-pomodoro', 'is-free');
            timerEl.style.color = '';
            timerEl.style.textShadow = '0 0 30px var(--accent-glow)';
            timerEl.innerText = '00:00:00';
        }
    },

    updatePomodoroDuration() {
        const sel = $('pomodoro-duration');
        AppState.timer.pomodoroDuration = parseInt(sel.value);
        if (!AppState.timer.running) {
            AppState.timer.secondsElapsed = 0;
            $('timer-text').innerText = formatTime(AppState.timer.pomodoroDuration);
        }
    },

    saveToForm() {
        const { timer } = AppState;
        if (timer.secondsElapsed === 0) return;
        const elapsed = timer.pomodoroMode ? (timer.pomodoroDuration - timer.secondsElapsed) : timer.secondsElapsed;
        if (elapsed <= 0) return;

        const now    = new Date();
        const endH   = now.getHours().toString().padStart(2, '0');
        const endM   = now.getMinutes().toString().padStart(2, '0');
        const start  = new Date(now.getTime() - elapsed * 1000);
        const startH = start.getHours().toString().padStart(2, '0');
        const startM = start.getMinutes().toString().padStart(2, '0');

        $('form-start').value = `${startH}:${startM}`;
        $('form-end').value   = `${endH}:${endM}`;
        CyberTimePickers.start?.setTime(`${startH}:${startM}`);
        CyberTimePickers.end?.setTime(`${endH}:${endM}`);
        $('entry-form').scrollIntoView({ behavior: 'smooth' });
    },

    _playBeep() {
        try {
            const ctx  = new (window.AudioContext || window.webkitAudioContext)();
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(DEFAULTS.BEEP_FREQUENCY_HZ, ctx.currentTime);
            gain.gain.setValueAtTime(DEFAULTS.BEEP_GAIN, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + DEFAULTS.BEEP_DURATION_SEC);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + DEFAULTS.BEEP_DURATION_SEC);
        } catch (e) { /* AudioContext unavailable */ }
    },
};

// Legacy global aliases for HTML inline handlers
function toggleTimer()              { TimerModule.toggle(); }
function stopTimer()                { TimerModule.stop(); }
function resetTimer()               { TimerModule.reset(); }
function setTimerMode(mode)         { TimerModule.setMode(mode); }
function updatePomodoroDuration()   { TimerModule.updatePomodoroDuration(); }
function saveTimerToForm()          { TimerModule.saveToForm(); }
function playPomodoroBeep()         { TimerModule._playBeep(); }

// ─── Entries Module ───────────────────────────────────────────────────────────

const EntriesModule = {
    save(e) {
        e.preventDefault();
        const dateVal  = $('form-date').value;
        const catVal   = $('form-category').value;
        const descVal  = $('form-desc').value;
        const startVal = $('form-start').value;
        const endVal   = $('form-end').value;

        let diff = timeToMin(endVal) - timeToMin(startVal);
        if (diff < 0) diff += 24 * 60;
        const total = minToTime(diff);

        const { ui } = AppState;
        if (ui.editId) {
            const idx = AppState.entries.findIndex(en => en.id === ui.editId);
            AppState.entries[idx] = { ...AppState.entries[idx], date: dateVal, category: catVal, desc: descVal, start: startVal, end: endVal, total };
            ui.editId = null;
            document.querySelector('button[type="submit"]').innerText = 'Gravar no Storage';
        } else {
            AppState.entries.unshift({ id: Date.now(), date: dateVal, category: catVal, desc: descVal, start: startVal, end: endVal, total });
        }

        Storage.saveEntries();
        UI.renderEntries();
        UI.renderQuickFills();
        e.target.reset();
        setDefaultDate();

        const startDisp = $('time-start-display');
        const endDisp   = $('time-end-display');
        if (startDisp) startDisp.textContent = '--:--';
        if (endDisp)   endDisp.textContent   = '--:--';

        Terminal.log(`Registro GRAVADO: ${descVal}`, 'success');
        Toast.show('Bloco de tempo sincronizado com sucesso!');
    },

    edit(id) {
        const entry = AppState.entries.find(e => e.id === id);
        if (!entry) return;

        $('form-date').value = entry.date;
        $('form-desc').value = entry.desc;
        if (entry.start) $('form-start').value = entry.start;
        if (entry.end)   $('form-end').value   = entry.end;

        CyberDatePicker.setDate(entry.date);
        if (entry.start) CyberTimePickers.start?.setTime(entry.start);
        if (entry.end)   CyberTimePickers.end?.setTime(entry.end);

        const catName = entry.category || 'Atividades internas';
        const select  = $('form-category');
        if (select) select.value = catName;
        const cat = AppState.categories.find(c => c.name === catName) || { name: catName, color: 'var(--accent)' };
        UI.syncCustomSelectDisplay(cat.name, cat.color);
        document.querySelectorAll('.custom-select-option').forEach(opt => {
            opt.classList.toggle('is-active', opt.querySelector('span:last-child')?.textContent === catName);
        });

        AppState.ui.editId = id;
        document.querySelector('button[type="submit"]').innerText = 'Atualizar Storage';
        $('entry-form').scrollIntoView({ behavior: 'smooth' });
    },

    delete(id) {
        if (!confirm('Tem certeza que deseja remover este registro?')) return;
        const entry = AppState.entries.find(e => e.id === id);
        AppState.entries = AppState.entries.filter(e => e.id !== id);
        Storage.saveEntries();
        UI.renderEntries();
        UI.renderQuickFills();
        Terminal.log(`Registro REMOVIDO: ${entry ? entry.desc : 'ID ' + id}`, 'error');
        Toast.show('Registro eliminado do storage.', 'warning');
    },
};

// Legacy global aliases
function saveEntry(e)     { EntriesModule.save(e); }
function editEntry(id)    { EntriesModule.edit(id); }
function deleteEntry(id)  { EntriesModule.delete(id); }

// ─── UI Module ────────────────────────────────────────────────────────────────

const UI = {
    renderEntries(filteredEntries = AppState.entries) {
        const list = $('activity-list');
        if (!list) return;
        list.innerHTML = '';

        filteredEntries.forEach(entry => {
            const row = document.createElement('tr');
            row.className = 'table-row-hover transition-colors group';
            row.innerHTML = `
                <td class="px-6 py-5 whitespace-nowrap text-sm font-medium text-accent/90">${formatDateBR(entry.date)}</td>
                <td class="px-6 py-5">
                    <div class="text-sm font-bold text-white mb-1.5">${entry.desc}</div>
                    ${this._getCategoryBadge(entry.category)}
                </td>
                <td class="px-6 py-5 whitespace-nowrap text-right">
                    <span class="text-sm font-bold text-accent drop-shadow-[0_0_8px_var(--accent-glow)]">${entry.total}h</span>
                </td>
                <td class="px-6 py-5 whitespace-nowrap text-center actions-cell">
                    <div class="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="editEntry(${entry.id})" class="btn-icon p-2 text-accent/80 hover:text-accent transition-all hover:drop-shadow-[0_0_8px_var(--accent-glow)]">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onclick="deleteEntry(${entry.id})" class="btn-icon p-2 text-accent/40 hover:text-danger transition-all hover:drop-shadow-[0_0_8px_rgba(251,113,133,0.8)]">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                </td>`;
            list.appendChild(row);
        });

        DashboardModule.update();
    },

    renderCategoryManager() {
        const container = $('category-list-container');
        const select    = $('form-category');
        if (!container || !select) return;

        container.innerHTML = '';
        AppState.categories.forEach(cat => {
            const { r, g, b } = hexToRgb(cat.color);
            const tag = document.createElement('div');
            tag.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border group cursor-default';
            tag.style.cssText = `background:rgba(${r},${g},${b},0.12);color:rgb(${r},${g},${b});border-color:rgba(${r},${g},${b},0.35);`;
            tag.innerHTML = `
                <span class="leading-none">${cat.name}</span>
                <button type="button" onclick="deleteCategory('${cat.id}')"
                    class="btn-icon opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 hover:text-white leading-none"
                    title="Remover">&times;</button>`;
            container.appendChild(tag);
        });

        select.innerHTML = '';
        AppState.categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = cat.name;
            select.appendChild(opt);
        });

        this._populateCustomSelect();
    },

    renderQuickFills() {
        const container = $('quick-fill-container');
        if (!container) return;

        const patterns = {};
        AppState.entries.forEach(e => {
            if (!e.start || !e.end) return;
            const key = `${e.category || 'Atividades internas'}|${e.desc}|${e.start}|${e.end}`;
            if (!patterns[key]) patterns[key] = { desc: e.desc, start: e.start, end: e.end, category: e.category || 'Atividades internas', count: 0 };
            patterns[key].count++;
        });

        let sorted = Object.values(patterns).sort((a, b) => b.count - a.count).slice(0, DEFAULTS.MAX_QUICK_FILLS);
        if (sorted.length === 0) {
            sorted = [{ desc: 'Manutenção Padrão', start: '07:00', end: '13:00', category: 'Atividades internas' }];
        }

        container.innerHTML = '';
        sorted.forEach(preset => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn-weight btn-3d-accent text-[10px] sm:text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-xl bg-accent/25 hover:bg-accent/40 text-white transition-all shadow-[0_0_10px_var(--accent-glow)] flex items-center gap-1.5 focus:outline-none relative overflow-hidden';
            btn.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> ${preset.desc} (${preset.start}-${preset.end})`;
            btn.onclick = () => {
                $('form-category').value = preset.category;
                $('form-desc').value     = preset.desc;
                $('form-start').value    = preset.start;
                $('form-end').value      = preset.end;
                ['form-category', 'form-desc', 'form-start', 'form-end'].forEach(id => {
                    const el = $(id);
                    el.classList.add('bg-accent/20', 'border-accent');
                    setTimeout(() => el.classList.remove('bg-accent/20', 'border-accent'), 300);
                });
            };
            container.appendChild(btn);
        });

        container.classList.remove('hidden');
    },

    // ── Custom Select ──

    _populateCustomSelect() {
        const dropdown = $('category-select-dropdown');
        const select   = $('form-category');
        if (!dropdown || !select) return;

        const currentValue = select.value || (AppState.categories[0]?.name);
        dropdown.innerHTML = '';

        AppState.categories.forEach(cat => {
            const opt = document.createElement('div');
            opt.className = 'custom-select-option' + (cat.name === currentValue ? ' is-active' : '');
            opt.setAttribute('role', 'option');
            opt.setAttribute('aria-selected', cat.name === currentValue ? 'true' : 'false');
            opt.style.setProperty('--cat-color', cat.color);
            opt.innerHTML = `
                <span class="cat-dot" style="background:${cat.color};box-shadow:0 0 8px ${cat.color}80;"></span>
                <span>${cat.name}</span>`;
            opt.addEventListener('click', () => this.selectCustomCategory(cat.name, cat.color));
            dropdown.appendChild(opt);
        });

        const activeCat = AppState.categories.find(c => c.name === currentValue) || AppState.categories[0];
        if (activeCat) this.syncCustomSelectDisplay(activeCat.name, activeCat.color);
    },

    syncCustomSelectDisplay(name, color) {
        const label = $('category-select-label');
        const dot   = $('category-select-dot');
        if (label) label.textContent = name;
        if (dot) {
            dot.style.background = color;
            dot.style.boxShadow  = `0 0 8px ${color}99`;
        }
    },

    selectCustomCategory(name, color) {
        const select = $('form-category');
        if (select) select.value = name;
        this.syncCustomSelectDisplay(name, color);
        document.querySelectorAll('.custom-select-option').forEach(opt => {
            const isActive = opt.querySelector('span:last-child')?.textContent === name;
            opt.classList.toggle('is-active', isActive);
            opt.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        closeCustomSelect();
    },

    _getCategoryBadge(categoryName) {
        const cat = AppState.categories.find(c => c.name === categoryName);
        const color = cat ? cat.color : '#c084fc';
        const { r, g, b } = hexToRgb(color);
        return `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border"
            style="background:rgba(${r},${g},${b},0.12);color:rgb(${r},${g},${b});border-color:rgba(${r},${g},${b},0.3);box-shadow:0 0 6px rgba(${r},${g},${b},0.25);">
            ${categoryName || 'Geral'}
        </span>`;
    },
};

// Legacy aliases
function renderEntries(f)          { UI.renderEntries(f); }
function renderCategoryManager()   { UI.renderCategoryManager(); }
function renderQuickFills()        { UI.renderQuickFills(); }
function syncCustomSelectDisplay(n, c) { UI.syncCustomSelectDisplay(n, c); }
function selectCustomCategory(n, c)   { UI.selectCustomCategory(n, c); }
function populateCustomSelect()    { UI._populateCustomSelect(); }

// ─── Dashboard Module ─────────────────────────────────────────────────────────

const DashboardModule = {
    update() {
        const now          = new Date();
        const todayStr     = now.toISOString().split('T')[0];
        const currentYear  = now.getFullYear();
        const currentMonth = now.getMonth();

        const dayTotal = AppState.entries
            .filter(e => e.date === todayStr)
            .reduce((sum, e) => sum + timeToMin(e.total), 0);

        const dow          = now.getDay();
        const diffToMon    = (dow === 0 ? -6 : 1 - dow);
        const weekStart    = new Date(now);
        weekStart.setDate(now.getDate() + diffToMon);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const weekTotal = AppState.entries
            .filter(e => { const d = new Date(e.date + 'T00:00:00'); return d >= weekStart && d <= weekEnd; })
            .reduce((sum, e) => sum + timeToMin(e.total), 0);

        const monthTotal = AppState.entries
            .filter(e => { const d = new Date(e.date + 'T00:00:00'); return d.getFullYear() === currentYear && d.getMonth() === currentMonth; })
            .reduce((sum, e) => sum + timeToMin(e.total), 0);

        $('card-day').innerText   = minToTime(dayTotal)   + 'h';
        $('card-week').innerText  = minToTime(weekTotal)  + 'h';
        $('card-month').innerText = minToTime(monthTotal) + 'h';

        const goalPercent    = Math.min(Math.round((dayTotal / AppState.dailyGoalMin) * 100), 100);
        const progressFill   = $('goal-progress-bar');
        const percentLabel   = $('goal-percent');
        if (progressFill) progressFill.style.width = `${goalPercent}%`;
        if (percentLabel) percentLabel.innerText = `${goalPercent}%`;
        if (progressFill) progressFill.classList.toggle('glitch-text', goalPercent >= 100);

        this._updateChart(currentYear, currentMonth);
    },

    initChart() {
        const container = $('category-chart');
        if (!container) return;

        AppState.ui.categoryChart = new ApexCharts(container, {
            series: [],
            chart: {
                type: 'donut', height: 320, background: 'transparent',
                animations: { enabled: true, easing: 'easeinout', speed: 800 },
                dropShadow: { enabled: true, blur: 10, color: 'var(--accent)', opacity: 0.35 },
            },
            stroke: { show: false, width: 0 },
            plotOptions: {
                pie: {
                    donut: {
                        size: '75%', background: 'transparent',
                        labels: {
                            show: true,
                            name:  { show: true, fontSize: '12px', fontFamily: 'Outfit', fontWeight: 900, color: 'var(--accent)', offsetY: -10 },
                            value: { show: true, fontSize: '24px', fontFamily: 'Outfit', fontWeight: 700, color: '#fff', offsetY: 10, formatter: val => minToTime(val) + 'h' },
                            total: { show: true, label: 'TOTAL', color: 'var(--accent)', fontSize: '10px', fontWeight: 900, formatter: w => minToTime(w.globals.seriesTotals.reduce((a, b) => a + b, 0)) + 'h' },
                        },
                    },
                },
            },
            dataLabels: { enabled: false },
            legend: { show: false },
            colors: [],
            tooltip: { enabled: true, theme: 'dark', fillSeriesColor: false, y: { formatter: val => `${minToTime(val)}h exploradas` } },
            noData: { text: 'SEM DADOS NO CICLO', align: 'center', verticalAlign: 'middle', style: { color: 'var(--accent)', fontSize: '10px', fontFamily: 'Outfit' } },
            labels: [],
        });

        AppState.ui.categoryChart.render();
    },

    _updateChart(year, month) {
        const chart = AppState.ui.categoryChart;
        if (!chart) return;

        const catMap = {};
        AppState.entries
            .filter(e => { const d = new Date(e.date + 'T00:00:00'); return d.getFullYear() === year && d.getMonth() === month; })
            .forEach(e => { const k = e.category || 'Geral'; catMap[k] = (catMap[k] || 0) + timeToMin(e.total); });

        const labels  = Object.keys(catMap);
        const series  = Object.values(catMap);
        const colors  = labels.map(name => AppState.categories.find(c => c.name === name)?.color || 'var(--accent)');

        chart.updateOptions({ series, labels, colors, chart: { dropShadow: { color: colors[0] || 'var(--accent)' } } });
    },
};

// Legacy aliases
function updateDashboard()                { DashboardModule.update(); }
function initCategoryChart()             { DashboardModule.initChart(); }
function updateCategoryChart(y, m)       { DashboardModule._updateChart(y, m); }

// ─── Category Module ──────────────────────────────────────────────────────────

const CategoryModule = {
    add(e) {
        e.preventDefault();
        const nameInput  = $('cat-name');
        const colorInput = $('cat-color');
        const name       = nameInput.value.trim();
        if (!name) return;
        if (AppState.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) { nameInput.focus(); return; }

        AppState.categories.push({ id: 'cat-' + Date.now(), name, color: colorInput.value });
        Storage.saveCategories();
        UI.renderCategoryManager();
        e.target.reset();
        colorInput.value = '#c084fc';
    },

    delete(id) {
        if (AppState.categories.length <= 1) return;
        AppState.categories = AppState.categories.filter(c => c.id !== id);
        Storage.saveCategories();
        UI.renderCategoryManager();
    },
};

// Legacy aliases
function addCategory(e)       { CategoryModule.add(e); }
function deleteCategory(id)   { CategoryModule.delete(id); }

// ─── Export Module ────────────────────────────────────────────────────────────

const ExportModule = {
    csv() {
        let csv = '\uFEFF';
        csv += 'Data;Descrição;Tempo Dedicado (h)\n';
        AppState.entries.forEach(e => {
            const desc = `"${e.desc.replace(/"/g, '""')}"`;
            csv += `${formatDateBR(e.date)};${desc};${e.total}\n`;
        });
        const totalMin = AppState.entries.reduce((sum, e) => sum + timeToMin(e.total), 0);
        csv += `\n;;;TOTAL;${minToTime(totalMin)}`;
        triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'registro_de_horas.csv');
    },

    pdf() {
        const rateInput  = $('hourly-rate');
        const hourlyRate = rateInput?.value ? parseFloat(rateInput.value) : 0;

        const searchInput = $('search-input');
        const list = (searchInput?.value.trim())
            ? AppState.entries.filter(e => e.desc.toLowerCase().includes(searchInput.value.toLowerCase()) || e.date.includes(searchInput.value))
            : AppState.entries;

        if (list.length === 0) { Toast.show('Nenhum dado para exportar.', 'error'); return; }

        const catMap = {};
        let totalMin = 0;
        list.forEach(entry => {
            const cat  = entry.category || 'Sem Categoria';
            const mins = timeToMin(entry.total);
            catMap[cat] = (catMap[cat] || 0) + mins;
            totalMin   += mins;
        });

        const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
        const printDate = $('print-date');
        if (printDate) {
            const now = new Date();
            printDate.innerText = `Ref. Sistema: ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')} - Protocolo de Emissão PDF`;
        }

        const tHead = document.querySelector('.invoice-table thead');
        const tFoot = document.querySelector('.invoice-table tfoot');
        const tBody = $('print-summary-table');

        if (tHead) tHead.innerHTML = `<tr><th>Categoria / Atividade</th><th style="text-align:right">Total de Horas</th>${hourlyRate > 0 ? '<th style="text-align:right">Valor Calculado</th>' : ''}</tr>`;

        if (tBody) {
            tBody.innerHTML = '';
            sorted.forEach(([cat, mins]) => {
                const priceStr = hourlyRate > 0 ? `<td style="text-align:right">R$ ${(mins / 60 * hourlyRate).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>` : '';
                const tr = document.createElement('tr');
                tr.innerHTML = `<td><strong>${cat}</strong></td><td style="text-align:right">${minToTime(mins)}h</td>${priceStr}`;
                tBody.appendChild(tr);
            });
        }

        if (tFoot) {
            const grandHDec = totalMin / 60;
            const priceStr  = hourlyRate > 0 ? `<td style="text-align:right"><strong>R$ ${(grandHDec * hourlyRate).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></td>` : '';
            tFoot.innerHTML = `<tr><td>Total Geral Executado</td><td style="text-align:right">${Math.floor(totalMin / 60)}h ${totalMin % 60}m (${Math.round(grandHDec * 100) / 100} dec.)</td>${priceStr}</tr>`;
        }

        window.print();
        setTimeout(() => { Toast.show('Documento gerado com sucesso.', 'success'); Terminal.log('EXPORTAÇÃO PDF: CONCLUÍDA', 'success'); }, 1000);
    },

    json() {
        const data = { entries: AppState.entries, categories: AppState.categories, dailyGoalMin: AppState.dailyGoalMin, version: '9.0.9', exportDate: new Date().toISOString() };
        triggerDownload(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `timetracker_backup_${new Date().toISOString().split('T')[0]}.json`);
        Terminal.log('BACKUP JSON EXPORTADO', 'success');
        Toast.show('Backup do banco de dados concluído.');
    },

    importJSON() {
        const input = $('json-input');
        if (input) input.click();
    },

    handleJSONImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.entries || !data.categories) throw new Error('Formato de backup inválido.');
                if (!confirm('⚠️ RESTAURAR BACKUP: Isso substituirá todos os seus dados atuais. Continuar?')) return;

                AppState.entries    = data.entries;
                AppState.categories = data.categories;
                if (data.dailyGoalMin) AppState.dailyGoalMin = data.dailyGoalMin;

                Storage.saveAll();
                UI.renderCategoryManager();
                UI.renderEntries();
                UI.renderQuickFills();
                DashboardModule.update();
                Terminal.log('BACKUP RESTAURADO COM SUCESSO', 'success');
                Toast.show('Banco de dados restaurado!', 'success');
            } catch (err) {
                Terminal.log('ERRO NA RESTAURAÇÃO: ' + err.message, 'error');
                Toast.show('Erro ao ler arquivo de backup.', 'error');
            }
            event.target.value = '';
        };
        reader.readAsText(file);
    },
};

// Legacy aliases
function exportCSV()                 { ExportModule.csv(); }
function exportPDF()                 { ExportModule.pdf(); }
function exportJSON()                { ExportModule.json(); }
function importJSON()                { ExportModule.importJSON(); }
function handleJSONImport(e)         { ExportModule.handleJSONImport(e); }

// ─── Theme Module ─────────────────────────────────────────────────────────────

const ThemeModule = {
    change() {
        AppState.ui.currentThemeIdx = (AppState.ui.currentThemeIdx + 1) % THEMES.length;
        const theme = THEMES[AppState.ui.currentThemeIdx];
        const root  = document.documentElement;

        root.style.setProperty('--accent',          theme.accent);
        root.style.setProperty('--secondary-accent', theme.secondary);
        root.style.setProperty('--accent-glow',     theme.glow);
        root.style.setProperty('--card-bg',         theme.cardBg);
        root.style.setProperty('--card-hover-bg',   theme.cardHoverBg);
        root.style.setProperty('--blob-1-bg',       theme.accent);
        root.style.setProperty('--blob-2-bg',       theme.secondary);
        root.style.setProperty('--blob-3-bg',       theme.accent);

        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) metaTheme.setAttribute('content', theme.accent);

        const iconContainer = $('theme-icon-container');
        if (iconContainer) {
            iconContainer.style.backgroundColor = theme.accent + '33';
            iconContainer.style.borderColor     = theme.accent + '4d';
            iconContainer.style.boxShadow       = `0 0 15px ${theme.glow}`;
        }

        [$('sidebar-menu'), $('right-sidebar')].forEach(el => {
            if (el) { el.style.borderColor = theme.accent + '33'; el.style.backgroundColor = theme.cardBg; }
        });

        const chart = AppState.ui.categoryChart;
        if (chart) chart.updateOptions({ chart: { dropShadow: { color: theme.accent } } });

        const circuit = document.querySelector('.bg-circuit-texture');
        if (circuit) {
            const hue = (AppState.ui.currentThemeIdx * 60) + 240;
            circuit.style.filter = `sepia(100%) hue-rotate(${hue}deg) brightness(0.7) contrast(1.3)`;
        }
    },
};

function changeTheme() { ThemeModule.change(); }

// ─── Sidebar & Navigation ─────────────────────────────────────────────────────

function toggleSidebar(show) {
    const menu    = $('sidebar-menu');
    const overlay = $('sidebar-overlay');
    if (!menu || !overlay) return;
    menu.classList.toggle('sidebar-open', show);
    overlay.classList.toggle('overlay-visible', show);
    document.body.style.overflow = show ? 'hidden' : '';
}

function closeAllSidebars() {
    toggleSidebar(false);
    toggleRightSidebar(false);
}

function toggleRightSidebar(lock) {
    const sidebar = $('right-sidebar');
    const overlay = $('sidebar-overlay');
    if (!sidebar) return;
    sidebar.classList.toggle('sidebar-lock', lock);
    sidebar.classList.toggle('sidebar-open', lock);
    if (overlay) {
        const leftOpen = $('sidebar-menu')?.classList.contains('sidebar-open');
        overlay.classList.toggle('overlay-visible', lock || leftOpen);
    }
}

// ─── Custom Select (Pomodoro & Category) ──────────────────────────────────────

function closeAllPopups() {
    closeCustomSelect();
    closePomoSelect();
    CyberDatePicker.close();
    Object.values(CyberTimePickers).forEach(p => p.close());
    document.querySelectorAll('.glass-card').forEach(c => c.classList.remove('z-elevated'));
}

function openCustomSelect() {
    closeAllPopups();
    const btn      = $('category-select-btn');
    const dropdown = $('category-select-dropdown');
    if (!btn || !dropdown) return;
    btn.closest('.glass-card')?.classList.add('z-elevated');
    const spaceBelow = window.innerHeight - btn.getBoundingClientRect().bottom;
    dropdown.classList.toggle('open-up', spaceBelow < 300);
    btn.setAttribute('aria-expanded', 'true');
    dropdown.classList.add('open');
}

function closeCustomSelect() {
    const btn      = $('category-select-btn');
    const dropdown = $('category-select-dropdown');
    if (!btn || !dropdown) return;
    btn.setAttribute('aria-expanded', 'false');
    dropdown.classList.remove('open');
}

function initCustomSelect() {
    const btn     = $('category-select-btn');
    const wrapper = $('category-select-wrapper');
    if (!btn || !wrapper) return;

    btn.addEventListener('click', e => {
        e.stopPropagation();
        btn.getAttribute('aria-expanded') === 'true' ? closeCustomSelect() : openCustomSelect();
    });
    document.addEventListener('click', e => { if (!wrapper.contains(e.target)) closeCustomSelect(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCustomSelect(); });

    const pomoBtn     = $('pomo-select-btn');
    const pomoWrapper = $('pomo-select-wrapper');
    if (pomoBtn && pomoWrapper) {
        pomoBtn.addEventListener('click', e => {
            e.stopPropagation();
            pomoBtn.getAttribute('aria-expanded') === 'true' ? closePomoSelect() : openPomoSelect();
        });
        document.addEventListener('click', e => { if (!pomoWrapper.contains(e.target)) closePomoSelect(); });
    }
}

function openPomoSelect() {
    closeAllPopups();
    const btn      = $('pomo-select-btn');
    const dropdown = $('pomo-select-dropdown');
    if (!btn || !dropdown) return;
    btn.setAttribute('aria-expanded', 'true');
    dropdown.classList.add('open');
}

function closePomoSelect() {
    const btn      = $('pomo-select-btn');
    const dropdown = $('pomo-select-dropdown');
    if (!btn || !dropdown) return;
    btn.setAttribute('aria-expanded', 'false');
    dropdown.classList.remove('open');
}

function updatePomodoroVal(val, label, el) {
    const select  = $('pomodoro-duration');
    const display = $('pomo-select-label');
    if (select) { select.value = val; TimerModule.updatePomodoroDuration(); }
    if (display) display.textContent = label;
    if (el) {
        el.parentElement.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('is-active'));
        el.classList.add('is-active');
    }
    closePomoSelect();
}

// ─── Maintenance & PWA ────────────────────────────────────────────────────────

function confirmClearStorage() {
    if (confirm('⚠️ ATENÇÃO: Isso apagará TODOS os seus registros permanentemente. Deseja continuar?')) {
        Storage.clearAll();
        window.location.reload();
    }
}

window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    AppState.ui.deferredPwaPrompt = e;
    const btn = $('pwa-install-btn');
    if (btn) btn.classList.remove('hidden');
});

async function installApp() {
    const prompt = AppState.ui.deferredPwaPrompt;
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
        const btn = $('pwa-install-btn');
        if (btn) btn.classList.add('hidden');
    }
    AppState.ui.deferredPwaPrompt = null;
}

// ─── Misc UI Helpers ──────────────────────────────────────────────────────────

function updateCurrentDate() {
    const display = $('current-date-display');
    if (display) display.innerText = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = $('form-date');
    if (dateInput) dateInput.value = today;
    CyberDatePicker.setDate(today);
}

function setupSearch() {
    const searchInput = $('search-input');
    if (!searchInput) return;
    searchInput.addEventListener('input', e => {
        const term = e.target.value.toLowerCase();
        UI.renderEntries(AppState.entries.filter(entry =>
            entry.desc.toLowerCase().includes(term) || entry.date.includes(term)
        ));
    });
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
        const tag = document.activeElement.tagName.toLowerCase();
        if (['input', 'textarea', 'select'].includes(tag)) return;
        if (e.code === 'Space') { e.preventDefault(); TimerModule.toggle(); }
        if (e.code === 'Enter') { e.preventDefault(); $('entry-form')?.requestSubmit(); }
    });
}

function initPillIndicator() {
    const indicator = $('mode-indicator');
    const btnFree   = $('mode-free');
    const pill      = $('mode-pill-wrap');
    if (!indicator || !btnFree || !pill) return;
    const pillRect = pill.getBoundingClientRect();
    const btnRect  = btnFree.getBoundingClientRect();
    indicator.style.transition = 'none';
    indicator.style.left  = (btnRect.left - pillRect.left - 4) + 'px';
    indicator.style.width = btnRect.width + 'px';
    requestAnimationFrame(() => { indicator.style.transition = ''; });
}

function initQuotesCarousel() {} // removed — kept for compatibility

// ─── Custom Date Picker ───────────────────────────────────────────────────────

const CyberDatePicker = (() => {
    const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    let displayMonth = new Date();
    let selectedDate = null;

    const el = id => document.getElementById(id);

    function init() {
        const btn     = el('date-picker-btn');
        const wrapper = el('date-picker-wrapper');
        if (!btn || !wrapper) return;
        btn.addEventListener('click', e => { e.stopPropagation(); toggle(); });
        document.addEventListener('click', e => { if (!wrapper.contains(e.target)) close(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
        renderCalendar();
    }

    function toggle() { el('date-picker-popup').classList.contains('open') ? close() : open(); }

    function open() {
        closeAllPopups();
        const btn = el('date-picker-btn');
        const pop = el('date-picker-popup');
        if (!btn || !pop) return;
        btn.closest('.glass-card')?.classList.add('z-elevated');
        pop.classList.toggle('open-up', window.innerHeight - btn.getBoundingClientRect().bottom < 320);
        btn.classList.add('open');
        pop.classList.add('open');
        renderCalendar();
    }

    function close() {
        el('date-picker-btn')?.classList.remove('open');
        el('date-picker-popup')?.classList.remove('open');
    }

    function prevMonth() { displayMonth.setMonth(displayMonth.getMonth() - 1); renderCalendar(); }
    function nextMonth() { displayMonth.setMonth(displayMonth.getMonth() + 1); renderCalendar(); }

    function selectDay(y, m, d) {
        selectedDate = displayMonth = new Date(y, m, d);
        const inp = el('form-date');
        if (inp) inp.value = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        syncDisplay();
        renderCalendar();
        setTimeout(close, 160);
    }

    function setDate(dateStr) {
        if (!dateStr) return;
        const [y, m, d] = dateStr.split('-').map(Number);
        selectedDate = displayMonth = new Date(y, m - 1, d);
        syncDisplay();
        renderCalendar();
    }

    function syncDisplay() {
        const elD = el('date-picker-display');
        if (!elD) return;
        if (selectedDate) {
            const dd = String(selectedDate.getDate()).padStart(2, '0');
            const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
            elD.textContent = `${dd}/${mm}/${selectedDate.getFullYear()}`;
            elD.classList.add('text-accent');
        } else {
            elD.textContent = 'Selecionar data';
            elD.classList.remove('text-accent');
        }
    }

    function setToday() {
        const d = new Date();
        selectDay(d.getFullYear(), d.getMonth(), d.getDate());
    }

    function renderCalendar() {
        const grid = el('cal-day-grid');
        const lbl  = el('cal-month-lbl');
        if (!grid || !lbl) return;

        const y = displayMonth.getFullYear();
        const m = displayMonth.getMonth();
        lbl.textContent = `${MONTHS[m]} ${y}`;

        const today    = new Date();
        const firstDow = new Date(y, m, 1).getDay();
        const daysInM  = new Date(y, m + 1, 0).getDate();
        const prevLast = new Date(y, m, 0).getDate();
        const total    = Math.ceil((firstDow + daysInM) / 7) * 7;

        let html = '';
        for (let i = 0; i < total; i++) {
            if (i < firstDow) {
                html += `<button type="button" class="cal-day other-month" disabled>${prevLast - firstDow + 1 + i}</button>`;
            } else if (i >= firstDow + daysInM) {
                html += `<button type="button" class="cal-day other-month" disabled>${i - firstDow - daysInM + 1}</button>`;
            } else {
                const d     = i - firstDow + 1;
                const isTod = today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
                const isSel = selectedDate && selectedDate.getFullYear() === y && selectedDate.getMonth() === m && selectedDate.getDate() === d;
                let cls = 'cal-day' + (isTod ? ' today' : '') + (isSel ? ' selected' : '');
                html += `<button type="button" class="${cls}" onclick="CyberDatePicker.selectDay(${y},${m},${d})"><span>${d}</span></button>`;
            }
        }
        grid.innerHTML = html;

        if (!el('cal-footer')) {
            const footer = document.createElement('div');
            footer.id        = 'cal-footer';
            footer.className = 'cal-footer';
            footer.innerHTML = `<button type="button" class="cal-today-btn" onclick="CyberDatePicker.setToday()">HOJE</button>`;
            el('date-picker-popup').appendChild(footer);
        }
    }

    return { init, open, close, toggle, selectDay, prevMonth, nextMonth, setDate, setToday };
})();

// ─── Custom Time Picker Factory ───────────────────────────────────────────────

const CyberTimePickers = {};

function createTimePicker(inputId, btnId, displayId, popupId) {
    const ITEM_H = 36;

    let h = 7, m = 0;

    const el  = id => document.getElementById(id);
    const pad = n  => String(n).padStart(2, '0');

    function getTime()      { return `${pad(h)}:${pad(m)}`; }
    function updateDisplay() {
        const elD = el(displayId); if (elD) elD.textContent = getTime();
        const inp = el(inputId);   if (inp) inp.value = getTime();
    }
    function syncFromInput() {
        const val = el(inputId)?.value;
        if (val) { const parts = val.split(':').map(Number); h = parts[0]; m = parts[1]; }
        updateDisplay();
    }
    function setTime(timeStr) {
        if (!timeStr) return;
        const parts = timeStr.split(':').map(Number);
        h = parts[0]; m = parts[1];
        updateDisplay();
    }
    function buildColumns() {
        buildCol(`${popupId}-hours`, 24, h, v => { h = v; updateDisplay(); });
        buildCol(`${popupId}-mins`,  60, m, v => { m = v; updateDisplay(); });
    }
    function buildCol(listId, count, selected, onChange) {
        const list = el(listId);
        if (!list) return;
        list.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const item = document.createElement('div');
            item.className    = 'time-col-item' + (i === selected ? ' selected' : '');
            item.dataset.val  = i;
            item.textContent  = pad(i);
            item.addEventListener('click', () => selectItem(list, i, onChange));
            list.appendChild(item);
        }
        scrollTo(list, selected, false);
        list.addEventListener('wheel', e => {
            e.preventDefault();
            const cur  = +list.querySelector('.selected')?.dataset.val ?? 0;
            const next = Math.max(0, Math.min(count - 1, cur + (e.deltaY > 0 ? 1 : -1)));
            if (next !== cur) selectItem(list, next, onChange);
        }, { passive: false });
    }
    function selectItem(list, idx, onChange) {
        onChange(idx);
        list.querySelectorAll('.time-col-item').forEach((el, i) => el.classList.toggle('selected', i === idx));
        scrollTo(list, idx, true);
    }
    function scrollTo(list, idx, animate) {
        requestAnimationFrame(() => list.scrollTo({ top: idx * ITEM_H, behavior: animate ? 'smooth' : 'auto' }));
    }
    function open() {
        closeAllPopups();
        const btn = el(btnId);
        const pop = el(popupId);
        if (!btn || !pop) return;
        btn.closest('.glass-card')?.classList.add('z-elevated');
        const rect       = btn.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceRight = window.innerWidth  - rect.left;
        pop.classList.toggle('open-up',     spaceBelow < 250);
        pop.classList.toggle('align-right', spaceRight < 200);
        btn.classList.add('open');
        pop.classList.add('open');
        buildColumns();
    }
    function close() {
        el(btnId)?.classList.remove('open');
        el(popupId)?.classList.remove('open');
    }
    function toggle() { el(popupId)?.classList.contains('open') ? close() : open(); }
    function setNow() {
        const d = new Date(); h = d.getHours(); m = d.getMinutes();
        updateDisplay(); buildColumns();
    }
    function init() {
        const b = el(btnId);
        const w = b?.closest('.custom-time-wrapper');
        const p = el(popupId);
        if (!b || !p) return;
        if (!p.querySelector('.time-picker-footer')) {
            const footer = document.createElement('div');
            footer.className = 'time-picker-footer';
            footer.innerHTML = `<button type="button" class="time-now-btn">AGORA</button>`;
            footer.querySelector('.time-now-btn').addEventListener('click', e => { e.stopPropagation(); setNow(); setTimeout(close, 200); });
            p.appendChild(footer);
        }
        b.addEventListener('click', e => { e.stopPropagation(); toggle(); });
        document.addEventListener('click', e => { if (!w?.contains(e.target)) close(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
        syncFromInput();
    }

    return { init, open, close, syncFromInput, setTime, getTime, setNow };
}

// ─── Initialisation ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    updateCurrentDate();
    UI.renderCategoryManager();
    initCustomSelect();
    DashboardModule.initChart();
    UI.renderEntries();
    setDefaultDate();
    setupSearch();
    UI.renderQuickFills();
    setupKeyboardShortcuts();
    requestAnimationFrame(initPillIndicator);

    CyberDatePicker.init();
    CyberTimePickers.start = createTimePicker('form-start', 'time-start-btn', 'time-start-display', 'time-start-popup');
    CyberTimePickers.end   = createTimePicker('form-end',   'time-end-btn',   'time-end-display',   'time-end-popup');
    CyberTimePickers.start.init();
    CyberTimePickers.end.init();

    if (AppState.timer.secondsElapsed > 0) {
        $('timer-text').innerText = formatTime(AppState.timer.secondsElapsed);
    }

    Terminal.log('SISTEMA OPERACIONAL INICIALIZADO', 'success');
});
