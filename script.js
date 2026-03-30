/**
 * Registro de Horas - Core Logic
 * Handles Timer, CRUD, Persistence, and Dashboard
 */

// State Management
let entries = JSON.parse(localStorage.getItem('timeEntries')) || [
    { id: 1, date: '2024-05-20', desc: 'Estudos de Programação', total: '02:00' },
    { id: 2, date: '2024-05-20', desc: 'Leitura', total: '00:30' },
    { id: 3, date: '2024-05-19', desc: 'Projetos Pessoais', total: '04:00' }
];

let timerRunning = false;
let timerInterval;
let secondsElapsed = parseInt(localStorage.getItem('timerSeconds')) || 0;
let editId = null;

const motivationalQuotes = [
    "\"Lembre-se de fazer pausas regulares. A consistência vale mais do que a exaustão.\"",
    "\"Não se trata de ter tempo, mas sim de criar tempo para o que importa.\"",
    "\"Fazer um pouco todos a cada dia é mais efetivo do que exaustão em um dia.\"",
    "\"A jornada é tão importante quanto o destino. Celebre as pequenas vitórias.\"",
    "\"Organização não é sobre perfeição, é sobre consistência e eficiência.\"",
    "\"Um passo de cada vez. Mantenha o foco no momento presente.\"",
    "\"O tempo de descanso não é tempo perdido; é recarga para a próxima etapa.\""
];
let currentQuoteIndex = 0;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    updateCurrentDate();
    initQuotesCarousel();
    renderEntries();
    setDefaultDate();
    setupSearch();
    
    // Resume timer if it was running (optional - requires start timestamp)
    if (secondsElapsed > 0) {
        document.getElementById('timer-text').innerText = formatTime(secondsElapsed);
    }
});

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
    const btnLabel = document.getElementById('timer-btn-label');
    const btnIcon = document.getElementById('timer-icon');
    const timerEl = document.getElementById('timer-text');
    const btnToggle = document.getElementById('btn-timer-toggle');

    if (!timerRunning) {
        // Start
        timerRunning = true;
        btnLabel.innerText = 'Parar';
        btnToggle.classList.replace('bg-accent', 'bg-danger');
        btnToggle.classList.replace('hover:bg-purple-600', 'hover:bg-red-600');
        btnIcon.innerHTML = `<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd"/>`;
        timerEl.classList.add('animate-pulse-subtle', 'text-accent');

        timerInterval = setInterval(() => {
            secondsElapsed++;
            timerEl.innerText = formatTime(secondsElapsed);
            localStorage.setItem('timerSeconds', secondsElapsed);
        }, 1000);
    } else {
        stopTimer();
    }
}

function stopTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    
    const btnLabel = document.getElementById('timer-btn-label');
    const btnIcon = document.getElementById('timer-icon');
    const timerEl = document.getElementById('timer-text');
    const btnToggle = document.getElementById('btn-timer-toggle');

    btnLabel.innerText = 'Iniciar';
    btnToggle.classList.replace('bg-danger', 'bg-accent');
    btnToggle.classList.replace('hover:bg-red-600', 'hover:bg-purple-600');
    btnIcon.innerHTML = `<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>`;
    timerEl.classList.remove('animate-pulse-subtle', 'text-accent');
}

function saveTimerToForm() {
    if (secondsElapsed === 0) return;
    const h = Math.floor(secondsElapsed / 3600).toString().padStart(2, '0');
    const m = Math.floor((secondsElapsed % 3600) / 60).toString().padStart(2, '0');
    document.getElementById('form-total').value = `${h}:${m}`;
    document.getElementById('entry-form').scrollIntoView({ behavior: 'smooth' });
}

function resetTimer() {
    stopTimer();
    secondsElapsed = 0;
    localStorage.removeItem('timerSeconds');
    document.getElementById('timer-text').innerText = "00:00:00";
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
    const descInput = document.getElementById('form-desc');
    const totalInput = document.getElementById('form-total');

    const total = totalInput.value;

    if (editId) {
        // Update
        const index = entries.findIndex(ent => ent.id === editId);
        entries[index] = { ...entries[index], 
            date: dateInput.value, 
            desc: descInput.value, 
            total 
        };
        editId = null;
        document.querySelector('button[type="submit"]').innerText = 'Salvar Registro';
    } else {
        // Create
        const newEntry = {
            id: Date.now(),
            date: dateInput.value,
            desc: descInput.value,
            total
        };
        entries.unshift(newEntry);
    }

    persist();
    renderEntries();
    e.target.reset();
    setDefaultDate();
}

function editEntry(id) {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    document.getElementById('form-date').value = entry.date;
    document.getElementById('form-desc').value = entry.desc;
    document.getElementById('form-total').value = entry.total;
    
    editId = id;
    document.querySelector('button[type="submit"]').innerText = 'Atualizar Registro';
    document.getElementById('entry-form').scrollIntoView({ behavior: 'smooth' });
}

function deleteEntry(id) {
    if(confirm('Tem certeza que deseja remover este registro?')) {
        entries = entries.filter(e => e.id !== id);
        persist();
        renderEntries();
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
            <td class="px-6 py-5 whitespace-nowrap text-sm font-medium text-violet-300">${formatDateBR(entry.date)}</td>
            <td class="px-6 py-5">
                <div class="text-sm font-semibold text-violet-100">${entry.desc}</div>
                <div class="text-xs text-violet-400">Categoria Pessoal</div>
            </td>
            <td class="px-6 py-5 whitespace-nowrap text-right">
                <span class="text-sm font-bold text-accent">${entry.total}h</span>
            </td>
            <td class="px-6 py-5 whitespace-nowrap text-center actions-cell">
                <div class="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="editEntry(${entry.id})" class="p-2 text-violet-300 hover:text-accent transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onclick="deleteEntry(${entry.id})" class="p-2 text-violet-300 hover:text-danger transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </td>
        `;
        list.appendChild(row);
    });

    updateDashboard();
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
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Day Total
    const dayTotal = entries
        .filter(e => e.date === todayStr)
        .reduce((sum, e) => sum + timeToMin(e.total), 0);
    
    // Week Total (Rough estimation)
    const weekTotal = entries.reduce((sum, e) => sum + timeToMin(e.total), 0);

    document.getElementById('card-day').innerText = minToTime(dayTotal) + 'h';
    document.getElementById('card-week').innerText = minToTime(weekTotal) + 'h';
    document.getElementById('card-month').innerText = minToTime(weekTotal) + 'h'; // Scaling for demo
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

function initQuotesCarousel() {
    const quoteEl = document.getElementById('motivational-quote');
    if (!quoteEl) return;
    
    setInterval(() => {
        quoteEl.style.opacity = 0;
        
        setTimeout(() => {
            currentQuoteIndex = (currentQuoteIndex + 1) % motivationalQuotes.length;
            quoteEl.innerText = motivationalQuotes[currentQuoteIndex];
            quoteEl.style.opacity = 1;
        }, 500); // Espera o fade out
        
    }, 8000); // Troca a mensagem a cada 8 segundos
}
