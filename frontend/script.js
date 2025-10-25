const form = document.getElementById('expense-form');
const tableBody = document.querySelector('#expense-table tbody');
const chartModeSelect = document.getElementById('chart-mode');
const filterModeSelect = document.getElementById('filter-mode');
const filterDateInput = document.getElementById('filter-date');
const filterMonthInput = document.getElementById('filter-month');
const categoryFilter = document.getElementById('category-filter');
const totalAmountCard = document.getElementById('total-amount');
const totalCountCard = document.getElementById('total-count');
const dailyAvgCard = document.getElementById('daily-average');
const monthlyAvgCard = document.getElementById('monthly-average');
const yearlyAvgCard = document.getElementById('yearly-average');

let expenseChartInstance = null;
let filteredChartInstance = null;
let allExpenses = [];

const user = JSON.parse(localStorage.getItem('user'));
if (!user) window.location.href = '/';

// Load expenses and render everything
function loadExpenses() {
  fetch(`/api/expenses?user_id=${user.id}`)
    .then(res => res.json())
    .then(data => {
      allExpenses = data;
      populateCategoryFilter(data);
      applyFilters();
    });
}

// Populate category dropdown
function populateCategoryFilter(data) {
  const categories = [...new Set(data.map(exp => exp.category))];
  categoryFilter.innerHTML = '<option value="all">All</option>';
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });
}

// Apply category filter and update everything
function applyFilters() {
  const selectedCategory = categoryFilter.value;
  let filtered = [...allExpenses];

  if (selectedCategory !== 'all') {
    filtered = filtered.filter(exp => exp.category === selectedCategory);
  }

  renderTable(filtered);
  renderChart(filtered, chartModeSelect.value);
  renderFilteredChart();
  updateSummaryCards(filtered);
}

// Render table
function renderTable(data) {
  tableBody.innerHTML = '';
  data.forEach(exp => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${exp.date}</td>
      <td>₱${exp.amount}</td>
      <td>${exp.category}</td>
      <td>${exp.description}</td>
      <td><button class="delete-btn" onclick="deleteExpense(${exp.id})">Delete</button></td>
    `;
    tableBody.appendChild(row);
  });
}

// Submit new expense
form.addEventListener('submit', e => {
  e.preventDefault();
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  data.user_id = user.id;

  fetch('/api/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(() => {
    form.reset();
    loadExpenses();
  });
});

// Delete expense
function deleteExpense(id) {
  fetch(`/api/expenses/${id}`, {
    method: 'DELETE'
  }).then(() => loadExpenses());
}

// Render full summary chart
function renderChart(data, mode) {
  const ctx = document.getElementById('expenseChart').getContext('2d');
  if (expenseChartInstance) expenseChartInstance.destroy();

  let labels = [];
  let totals = {};

  if (mode === 'daily') {
    data.forEach(exp => {
      if (!totals[exp.date]) totals[exp.date] = 0;
      totals[exp.date] += parseFloat(exp.amount);
    });
    labels = Object.keys(totals).sort();
  } else {
    data.forEach(exp => {
      const month = exp.date.slice(0, 7);
      if (!totals[month]) totals[month] = 0;
      totals[month] += parseFloat(exp.amount);
    });
    labels = Object.keys(totals).sort();
  }

  expenseChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: mode === 'daily' ? 'Expenses by Date' : 'Expenses by Month',
        data: labels.map(label => totals[label]),
        backgroundColor: '#00796b'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: mode === 'daily' ? 'Daily Expense Summary' : 'Monthly Expense Summary'
        }
      },
      scales: {
        x: { title: { display: true, text: mode === 'daily' ? 'Date' : 'Month' } },
        y: { title: { display: true, text: 'Amount (₱)' } }
      }
    }
  });
}

// Render filtered chart by selected date/month
function renderFilteredChart() {
  const mode = filterModeSelect.value;
  const selectedDate = filterDateInput.value;
  const selectedMonth = filterMonthInput.value;

  let filtered = [];

  if (mode === 'daily' && selectedDate) {
    filtered = allExpenses.filter(exp => exp.date === selectedDate);
  } else if (mode === 'monthly' && selectedMonth) {
    filtered = allExpenses.filter(exp => exp.date.startsWith(selectedMonth));
  }

  const categoryTotals = {};
  filtered.forEach(exp => {
    if (!categoryTotals[exp.category]) categoryTotals[exp.category] = 0;
    categoryTotals[exp.category] += parseFloat(exp.amount);
  });

  const ctx = document.getElementById('filteredChart').getContext('2d');
  if (filteredChartInstance) filteredChartInstance.destroy();

  filteredChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(categoryTotals),
      datasets: [{
        label: 'Filtered Expenses',
        data: Object.values(categoryTotals),
        backgroundColor: '#8e24aa'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: mode === 'daily' ? `Expenses on ${selectedDate}` : `Expenses in ${selectedMonth}`
        }
      },
      scales: {
        x: { title: { display: true, text: 'Category' } },
        y: { title: { display: true, text: 'Amount (₱)' } }
      }
    }
  });
}

// Update summary cards
function updateSummaryCards(data) {
  const total = data.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const count = data.length;

  const dateGroups = {};
  const monthGroups = {};
  const yearGroups = {};

  data.forEach(exp => {
    const date = exp.date;
    const month = exp.date.slice(0, 7);
    const year = exp.date.slice(0, 4);

    if (!dateGroups[date]) dateGroups[date] = 0;
    if (!monthGroups[month]) monthGroups[month] = 0;
    if (!yearGroups[year]) yearGroups[year] = 0;

    dateGroups[date] += parseFloat(exp.amount);
    monthGroups[month] += parseFloat(exp.amount);
    yearGroups[year] += parseFloat(exp.amount);
  });

  const dailyAvg = Object.keys(dateGroups).length > 0
    ? (total / Object.keys(dateGroups).length).toFixed(2)
    : 0;

  const monthlyAvg = Object.keys(monthGroups).length > 0
    ? (total / Object.keys(monthGroups).length).toFixed(2)
    : 0;

  const yearlyAvg = Object.keys(yearGroups).length > 0
    ? (total / Object.keys(yearGroups).length).toFixed(2)
    : 0;

  totalAmountCard.textContent = `Total: ₱${total.toFixed(2)}`;
  totalCountCard.textContent = `Entries: ${count}`;
  dailyAvgCard.textContent = `Daily Avg: ₱${dailyAvg}`;
  monthlyAvgCard.textContent = `Monthly Avg: ₱${monthlyAvg}`;
  yearlyAvgCard.textContent = `Yearly Avg: ₱${yearlyAvg}`;
}

// Toggle between date/month input
filterModeSelect.addEventListener('change', () => {
  filterDateInput.style.display = filterModeSelect.value === 'daily' ? 'inline' : 'none';
  filterMonthInput.style.display = filterModeSelect.value === 'monthly' ? 'inline' : 'none';
  renderFilteredChart();
});

// Re-render filtered chart on input change
filterDateInput.addEventListener('change', renderFilteredChart);
filterMonthInput.addEventListener('change', renderFilteredChart);

// Chart mode toggle
chartModeSelect.addEventListener('change', applyFilters);

// Category filter toggle
categoryFilter.addEventListener('change', applyFilters);

// Dark mode toggle
document.getElementById('dark-mode').addEventListener('change', function () {
  document.body.classList.toggle('dark-mode');
});

// Show welcome message
document.getElementById('welcome-user').textContent = `Welcome, ${user.name}!`;

// Logout button
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('user');
  window.location.href = '/';
});