// Bowhead PLM Dashboard JS
// Data keys and initial data
const DATA_KEY = 'bowhead_plm_data';
const members = ['Brian Burrer', 'Chase Cole', 'Gavin Lasater', 'Holocom', 'Open Slot'];

async function initData() {
    let data = localStorage.getItem(DATA_KEY);
    if (!data) {
        // fetch initial data from data.json
        const response = await fetch('data.json');
        data = await response.json();
        localStorage.setItem(DATA_KEY, JSON.stringify(data));
    }
    return JSON.parse(localStorage.getItem(DATA_KEY));
}

function saveData(data) {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

function generateId(array) {
    return array.length ? Math.max(...array.map(item => item.id)) + 1 : 1;
}

// Initialization
window.addEventListener('DOMContentLoaded', async () => {
    const data = await initData();
    initTheme();
    initNavigation();
    populateSelectOptions();
    renderDashboard(data);
    renderTasks(data);
    renderRisks(data);
    renderTagUps(data);
    renderDeliverables(data);
    renderMetrics(data);
    initForms(data);
});

function initTheme() {
    const toggle = document.getElementById('themeToggle');
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    toggle.checked = currentTheme === 'dark';
    toggle.addEventListener('change', () => {
        const theme = toggle.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    });
}

function initNavigation() {
    const navItems = document.querySelectorAll('#sidebar li');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const view = item.getAttribute('data-view');
            document.querySelectorAll('main .view').forEach(v => v.classList.remove('active'));
            document.getElementById(`${view}View`).classList.add('active');
            if (view === 'dashboard') {
                updateCharts();
            }
        });
    });
}

function populateSelectOptions() {
    const ownerSelects = document.querySelectorAll('#taskOwner, #riskOwner, #deliverableOwner');
    ownerSelects.forEach(select => {
        members.forEach(member => {
            const option = document.createElement('option');
            option.value = member;
            option.textContent = member;
            select.appendChild(option);
        });
    });
}

function initForms(data) {
    // Task form
    document.getElementById('taskForm').addEventListener('submit', event => {
        event.preventDefault();
        const title = document.getElementById('taskTitle').value;
        const owner = document.getElementById('taskOwner').value;
        const dueDate = document.getElementById('taskDueDate').value;
        const priority = document.getElementById('taskPriority').value;
        const status = parseInt(document.getElementById('taskStatus').value);
        const newTask = {
            id: generateId(data.tasks),
            title,
            owner,
            dueDate,
            priority,
            status,
            timestamp: new Date().toISOString()
        };
        data.tasks.push(newTask);
        saveData(data);
        renderTasks(data);
        renderDashboard(data);
        renderMetrics(data);
        updateCharts();
        event.target.reset();
    });

    // Risk form
    document.getElementById('riskForm').addEventListener('submit', event => {
        event.preventDefault();
        const title = document.getElementById('riskTitle').value;
        const owner = document.getElementById('riskOwner').value;
        const severity = document.getElementById('riskSeverity').value;
        const description = document.getElementById('riskDescription').value;
        const status = document.getElementById('riskStatus').value;
        const newRisk = {
            id: generateId(data.risks),
            title,
            owner,
            severity,
            description,
            status,
            timestamp: new Date().toISOString()
        };
        data.risks.push(newRisk);
        saveData(data);
        renderRisks(data);
        renderDashboard(data);
        event.target.reset();
    });

    // Deliverable form
    document.getElementById('deliverableForm').addEventListener('submit', event => {
        event.preventDefault();
        const name = document.getElementById('deliverableName').value;
        const owner = document.getElementById('deliverableOwner').value;
        const dueDate = document.getElementById('deliverableDueDate').value;
        const progress = parseInt(document.getElementById('deliverableProgress').value);
        const notes = document.getElementById('deliverableNotes').value;
        const newDeliverable = {
            id: generateId(data.deliverables),
            name,
            owner,
            dueDate,
            progress,
            notes,
            timestamp: new Date().toISOString()
        };
        data.deliverables.push(newDeliverable);
        saveData(data);
        renderDeliverables(data);
        renderDashboard(data);
        renderMetrics(data);
        updateCharts();
        event.target.reset();
    });

    // Tag-Up forms will be created per member
}

function renderDashboard(data) {
    const openTasksCount = data.tasks.filter(t => t.status < 100).length;
    const closedTasksCount = data.tasks.filter(t => t.status === 100).length;
    document.getElementById('openTasksCount').textContent = openTasksCount;
    document.getElementById('closedTasksCount').textContent = closedTasksCount;

    const openRisksCount = data.risks.filter(r => r.status === 'Open').length;
    const mitigatedRisksCount = data.risks.filter(r => r.status === 'Mitigated').length;
    document.getElementById('openRisksCount').textContent = openRisksCount;
    document.getElementById('mitigatedRisksCount').textContent = mitigatedRisksCount;

    const deliverablesInProgressCount = data.deliverables.filter(d => d.progress < 100).length;
    const deliverablesCompleteCount = data.deliverables.filter(d => d.progress === 100).length;
    document.getElementById('deliverablesInProgressCount').textContent = deliverablesInProgressCount;
    document.getElementById('deliverablesCompleteCount').textContent = deliverablesCompleteCount;

    // Tag-Up Participation: count members with tag-up for current day
    const today = new Date().toISOString().split('T')[0];
    let participation = 0;
    members.forEach(member => {
        const entries = data.tagups[member] || [];
        if (entries.some(e => e.date.startsWith(today))) {
            participation++;
        }
    });
    document.getElementById('tagupParticipationCount').textContent = participation;
}

function renderTasks(data) {
    const tbody = document.querySelector('#tasksTable tbody');
    tbody.innerHTML = '';
    data.tasks.forEach(task => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${task.id}</td>
            <td>${task.title}</td>
            <td>${task.owner}</td>
            <td>${task.dueDate}</td>
            <td>${task.priority}</td>
            <td><span class="status-chip" style="background-color:${getStatusColor(task.status)}">${task.status}%</span></td>
        `;
        tbody.appendChild(tr);
    });
    // sorting
    document.querySelectorAll('#tasksTable th').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.getAttribute('data-sort');
            data.tasks.sort((a, b) => {
                if (sortKey === 'dueDate') {
                    return new Date(a[sortKey]) - new Date(b[sortKey]);
                }
                if (a[sortKey] < b[sortKey]) return -1;
                if (a[sortKey] > b[sortKey]) return 1;
                return 0;
            });
            renderTasks(data);
        });
    });
}

function getStatusColor(status) {
    if (status === 100) return 'var(--success)';
    if (status > 0) return 'var(--primary)';
    return 'var(--bg-color)';
}

function renderRisks(data) {
    const tbody = document.querySelector('#risksTable tbody');
    tbody.innerHTML = '';
    data.risks.forEach(risk => {
        const severityClass = risk.severity.toLowerCase();
        const statusDot = risk.status === 'Open' ? '🔴' : '🟢';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${risk.id}</td>
            <td>${risk.title}</td>
            <td>${risk.owner}</td>
            <td><span class="risk-${severityClass}">${risk.severity}</span></td>
            <td>${statusDot}</td>
            <td>${new Date(risk.timestamp).toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
    // Sorting
    document.querySelectorAll('#risksTable th').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.getAttribute('data-sort');
            data.risks.sort((a, b) => {
                if (sortKey === 'timestamp') {
                    return new Date(a[sortKey]) - new Date(b[sortKey]);
                }
                if (a[sortKey] < b[sortKey]) return -1;
                if (a[sortKey] > b[sortKey]) return 1;
                return 0;
            });
            renderRisks(data);
        });
    });
}

function renderTagUps(data) {
    const formsContainer = document.getElementById('tagupFormsContainer');
    const entriesContainer = document.getElementById('tagupEntriesContainer');
    formsContainer.innerHTML = '';
    entriesContainer.innerHTML = '';
    members.forEach(member => {
        // Form for each member
        const form = document.createElement('form');
        form.classList.add('tagup-form');
        form.innerHTML = `
            <h3>${member}</h3>
            <textarea placeholder="What I did today" required></textarea>
            <textarea placeholder="Issues/Blockers" required></textarea>
            <textarea placeholder="Next Steps" required></textarea>
            <button type="submit">Add Tag-Up</button>
        `;
        form.addEventListener('submit', event => {
            event.preventDefault();
            const [whatDid, blockers, nextSteps] = Array.from(form.querySelectorAll('textarea')).map(t => t.value);
            const entry = {
                date: new Date().toISOString(),
                whatDid,
                blockers,
                nextSteps
            };
            if (!data.tagups[member]) data.tagups[member] = [];
            data.tagups[member].push(entry);
            saveData(data);
            renderTagUps(data);
            renderDashboard(data);
        });
        formsContainer.appendChild(form);
        // List of entries (last 7 days)
        const entries = data.tagups[member] || [];
        const recentEntries = entries.filter(e => {
            const entryDate = new Date(e.date);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return entryDate >= sevenDaysAgo;
        });
        const section = document.createElement('div');
        section.classList.add('tagup-entries-section');
        section.innerHTML = `<h4>${member} - Last 7 Days</h4>`;
        recentEntries.forEach(e => {
            const div = document.createElement('div');
            div.classList.add('tagup-entry');
            div.innerHTML = `
                <strong>${new Date(e.date).toLocaleDateString()}</strong><br>
                <em>What I did:</em> ${e.whatDid}<br>
                <em>Blockers:</em> ${e.blockers}<br>
                <em>Next Steps:</em> ${e.nextSteps}
            `;
            section.appendChild(div);
        });
        entriesContainer.appendChild(section);
    });
}

function renderDeliverables(data) {
    const tbody = document.querySelector('#deliverablesTable tbody');
    tbody.innerHTML = '';
    data.deliverables.forEach(del => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${del.id}</td>
            <td>${del.name}</td>
            <td>${del.owner}</td>
            <td>${del.dueDate}</td>
            <td>
                <div class="progress-bar"><div class="progress-bar-inner" style="width:${del.progress}%"></div></div>
            </td>
            <td>${del.notes || ''}</td>
        `;
        tbody.appendChild(tr);
    });
    // Sorting
    document.querySelectorAll('#deliverablesTable th').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.getAttribute('data-sort');
            data.deliverables.sort((a, b) => {
                if (sortKey === 'dueDate') {
                    return new Date(a[sortKey]) - new Date(b[sortKey]);
                }
                if (sortKey === 'progress') {
                    return a.progress - b.progress;
                }
                if (a[sortKey] < b[sortKey]) return -1;
                if (a[sortKey] > b[sortKey]) return 1;
                return 0;
            });
            renderDeliverables(data);
        });
    });
}

function renderMetrics(data) {
    // Workload saturation metrics: tasks per member
    const tasksPerMember = members.map(member => data.tasks.filter(t => t.owner === member).length);
    const workloadMetricChartCtx = document.getElementById('workloadMetricChart').getContext('2d');
    if (window.workloadMetricChart) window.workloadMetricChart.destroy();
    window.workloadMetricChart = new Chart(workloadMetricChartCtx, {
        type: 'bar',
        data: {
            labels: members,
            datasets: [{
                label: 'Open Tasks',
                data: tasksPerMember,
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function renderMetricsPage(data) {
    // Additional metrics page if needed in future
}

// Charts for dashboard
let tasksPerMemberChart;
let workloadSaturationChart;
let deliverableCompletionChart;

function updateCharts() {
    const data = JSON.parse(localStorage.getItem(DATA_KEY));
    // Tasks per member chart
    const tasksPerMemberData = members.map(member => data.tasks.filter(t => t.owner === member).length);
    const ctx1 = document.getElementById('tasksPerMemberChart').getContext('2d');
    if (tasksPerMemberChart) tasksPerMemberChart.destroy();
    tasksPerMemberChart = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: members,
            datasets: [{
                label: 'Tasks per Member',
                data: tasksPerMemberData,
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    // Workload saturation chart (same as tasks per member for now)
    const ctx2 = document.getElementById('workloadSaturationChart').getContext('2d');
    if (workloadSaturationChart) workloadSaturationChart.destroy();
    workloadSaturationChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: members,
            datasets: [{
                label: 'Open Tasks',
                data: tasksPerMemberData,
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    // Deliverable completion chart
    const completionData = [
        data.deliverables.filter(d => d.progress === 100).length,
        data.deliverables.filter(d => d.progress < 100).length
    ];
    const ctx3 = document.getElementById('deliverableCompletionChart').getContext('2d');
    if (deliverableCompletionChart) deliverableCompletionChart.destroy();
    deliverableCompletionChart = new Chart(ctx3, {
        type: 'doughnut',
        data: {
            labels: ['Complete', 'In Progress'],
            datasets: [{
                data: completionData,
            }]
        },
        options: {
            responsive: true,
        }
    });
}

// Settings: Export/Import/Reset
const exportBtn = document.getElementById('exportData');
const importInput = document.getElementById('importData');
const resetBtn = document.getElementById('resetData');

if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        const dataStr = localStorage.getItem(DATA_KEY);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bowhead_plm_data_backup.json';
        a.click();
        URL.revokeObjectURL(url);
    });
}

if (importInput) {
    importInput.addEventListener('change', event => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            const importedData = JSON.parse(e.target.result);
            localStorage.setItem(DATA_KEY, JSON.stringify(importedData));
            location.reload();
        };
        reader.readAsText(file);
    });
}

if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset the dashboard? This will clear all data.')) {
            localStorage.removeItem(DATA_KEY);
            location.reload();
        }
    });
}
