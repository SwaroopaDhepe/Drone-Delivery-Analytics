let chart;

document.addEventListener("DOMContentLoaded", function () {
    initializeChart();
    setupEventListeners();
});

function initializeChart() {
    const ctx = document.getElementById("chart")?.getContext("2d");
    if (!ctx) {
        console.error("Canvas context not found for #chart");
        return;
    }
    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [
                {
                    label: "Cost per Delivery ($)",
                    data: [],
                    borderColor: "#FF9800",
                    fill: false,
                },
                {
                    label: "Fuel Consumption (L)",
                    data: [],
                    borderColor: "#4CAF50",
                    fill: false,
                },
                {
                    label: "Electricity Consumption (kWh)",
                    data: [],
                    borderColor: "#2196F3",
                    fill: false,
                },
                {
                    label: "Maintenance Cost ($)",
                    data: [],
                    borderColor: "#9C27B0",
                    fill: false,
                }
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: 'Time Taken (mins)' } },
                y: { title: { display: true, text: 'Value' } }
            },
            plugins: { legend: { position: "bottom" } },
        },
    });

    const modal = document.getElementById("modal");
    const analysisModal = document.getElementById("analysis-modal");
    if (modal && analysisModal) {
        modal.style.display = "none";
        analysisModal.style.display = "none";
    } else {
        console.error("Modal elements not found");
    }
}

function setupEventListeners() {
    const openModalBtn = document.getElementById("open-modal");
    const closeModalBtn = document.getElementById("close-modal");
    const openAnalysisBtn = document.getElementById("open-analysis");
    const closeAnalysisBtn = document.getElementById("close-analysis-modal");
    const deleteAllBtn = document.getElementById("delete-all");
    const searchBar = document.getElementById("search-bar");

    if (openModalBtn) openModalBtn.addEventListener("click", () => {
        document.getElementById("modal").style.display = "flex";
    });
    if (closeModalBtn) closeModalBtn.addEventListener("click", () => {
        document.getElementById("modal").style.display = "none";
        resetModalInputs();
    });
    if (openAnalysisBtn) openAnalysisBtn.addEventListener("click", () => {
        document.getElementById("analysis-modal").style.display = "flex";
        fetchAnalysisGraphs();
    });
    if (closeAnalysisBtn) closeAnalysisBtn.addEventListener("click", () => {
        document.getElementById("analysis-modal").style.display = "none";
    });
    if (deleteAllBtn) deleteAllBtn.addEventListener("click", deleteAllRecords);
    if (searchBar) searchBar.addEventListener("input", searchTable);

    window.addEventListener("click", function (event) {
        const modal = document.getElementById("modal");
        const analysisModal = document.getElementById("analysis-modal");
        if (event.target === modal) modal.style.display = "none";
        if (event.target === analysisModal) analysisModal.style.display = "none";
    });
}

function resetModalInputs() {
    document.querySelectorAll("#modal input").forEach(input => input.value = "");
}

function fetchAnalysisGraphs() {
    const rows = document.querySelectorAll("#delivery-table tr");
    const deliveries = Array.from(rows)
        .map(row => {
            if (row.cells.length < 5) {
                console.warn("Row with insufficient cells:", row.cells);
                return null;
            }
            return [
                row.cells[0]?.innerText.trim(),
                row.cells[1]?.innerText.trim(),
                row.cells[2]?.innerText.trim(),
                row.cells[3]?.innerText.trim(),
                row.cells[4]?.innerText.trim()
            ];
        })
        .filter(delivery => delivery !== null && delivery.every(val => val !== undefined && val !== ''));

    console.log('🚀 Deliveries sent to backend:', deliveries);

    const barContainer = document.getElementById('bar-chart-container');
    const lineContainer = document.getElementById('line-chart-container');
    if (!barContainer || !lineContainer) {
        console.error("Chart containers not found");
        alert("Error: Chart containers missing in modal");
        return;
    }

    if (deliveries.length === 0) {
        barContainer.innerHTML = '<p>No data available</p>';
        lineContainer.innerHTML = '<p>No data available</p>';
        document.getElementById('total-deliveries').textContent = 0;
        document.getElementById('avg-cost').textContent = 0;
        document.getElementById('total-fuel').textContent = 0;
        document.getElementById('total-electricity').textContent = 0;
        document.getElementById('total-maintenance').textContent = 0;
        console.warn("No deliveries to analyze");
        return;
    }

    // Calculate summary stats locally as fallback
    const totalDeliveries = deliveries.length;
    const avgCost = deliveries.reduce((sum, d) => sum + (parseFloat(d[1]) || 0), 0) / totalDeliveries || 0;
    const totalFuel = deliveries.reduce((sum, d) => sum + (parseFloat(d[2]) || 0), 0) || 0;
    const totalElectricity = deliveries.reduce((sum, d) => sum + (parseFloat(d[3]) || 0), 0) || 0;
    const totalMaintenance = deliveries.reduce((sum, d) => sum + (parseFloat(d[4]) || 0), 0) || 0;

    // Set fallback stats
    document.getElementById('total-deliveries').textContent = totalDeliveries;
    document.getElementById('avg-cost').textContent = avgCost.toFixed(2);
    document.getElementById('total-fuel').textContent = totalFuel.toFixed(2);
    document.getElementById('total-electricity').textContent = totalElectricity.toFixed(2);
    document.getElementById('total-maintenance').textContent = totalMaintenance.toFixed(2);

    // Show loading spinner
    barContainer.innerHTML = '<div class="spinner"></div>';
    lineContainer.innerHTML = '<div class="spinner"></div>';

    fetch('http://localhost:5000/generate-graphs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveries })
    })
    .then(response => {
        console.log('📡 Response status:', response.status, response.statusText);
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(`HTTP error: ${response.status} ${response.statusText}, Message: ${err.message || 'Unknown'}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('✅ Backend response:', data);
        if (data.status === 'success') {
            barContainer.innerHTML = data.bar_chart || '<p>No bar chart available</p>';
            lineContainer.innerHTML = data.line_chart || '<p>No line chart available</p>';
            // Update stats with backend data if available
            document.getElementById('total-deliveries').textContent = data.summary.total_deliveries || totalDeliveries;
            document.getElementById('avg-cost').textContent = data.summary.avg_cost || avgCost.toFixed(2);
            document.getElementById('total-fuel').textContent = data.summary.total_fuel || totalFuel.toFixed(2);
            document.getElementById('total-electricity').textContent = data.summary.total_electricity || totalElectricity.toFixed(2);
            document.getElementById('total-maintenance').textContent = data.summary.total_maintenance || totalMaintenance.toFixed(2);
        } else {
            throw new Error(data.message || 'Unknown backend error');
        }
    })
    .catch(error => {
        console.error('❌ Fetch error:', error.message);
        // Fallback to local Chart.js charts
        barContainer.innerHTML = '<canvas id="fallback-bar" style="max-width:600px;"></canvas>';
        lineContainer.innerHTML = '<canvas id="fallback-line" style="max-width:600px;"></canvas>';

        // Bar chart
        new Chart(document.getElementById('fallback-bar').getContext('2d'), {
            type: 'bar',
            data: {
                labels: deliveries.map(d => d[0]),
                datasets: [{
                    label: 'Cost per Delivery ($)',
                    data: deliveries.map(d => parseFloat(d[1]) || 0),
                    backgroundColor: '#FF9800'
                }]
            },
            options: {
                responsive: true,
                plugins: { title: { display: true, text: 'Cost by Time Taken' } },
                scales: {
                    x: { title: { display: true, text: 'Time Taken (mins)' } },
                    y: { title: { display: true, text: 'Cost ($)' } }
                }
            }
        });

        // Line chart
        new Chart(document.getElementById('fallback-line').getContext('2d'), {
            type: 'line',
            data: {
                labels: deliveries.map(d => d[0]),
                datasets: [
                    { label: 'Cost ($)', data: deliveries.map(d => parseFloat(d[1]) || 0), borderColor: '#FF9800', fill: false },
                    { label: 'Fuel (L)', data: deliveries.map(d => parseFloat(d[2]) || 0), borderColor: '#4CAF50', fill: false },
                    { label: 'Electricity (kWh)', data: deliveries.map(d => parseFloat(d[3]) || 0), borderColor: '#2196F3', fill: false },
                    { label: 'Maintenance ($)', data: deliveries.map(d => parseFloat(d[4]) || 0), borderColor: '#9C27B0', fill: false }
                ]
            },
            options: {
                responsive: true,
                plugins: { title: { display: true, text: 'Metrics Over Time Taken' } },
                scales: {
                    x: { title: { display: true, text: 'Time Taken (mins)' } },
                    y: { title: { display: true, text: 'Value' } }
                }
            }
        });

        alert(`Analysis failed: ${error.message}. Showing local charts instead.`);
    });
}

function updateChart() {
    const rows = document.querySelectorAll("#delivery-table tr");
    let labels = [], costData = [], fuelData = [], electricityData = [], maintenanceData = [];
    let totalCost = 0, totalFuel = 0;

    rows.forEach(row => {
        if (row.cells.length > 1) {
            labels.push(row.cells[0].innerText);
            const cost = parseFloat(row.cells[1].innerText) || 0;
            const fuel = parseFloat(row.cells[2].innerText) || 0;
            costData.push(cost);
            fuelData.push(fuel);
            electricityData.push(parseFloat(row.cells[3].innerText) || 0);
            maintenanceData.push(parseFloat(row.cells[4].innerText) || 0);
            totalCost += cost;
            totalFuel += fuel;
        }
    });

    document.getElementById("deliveries-count").textContent = rows.length;
    document.getElementById("cost-avg").textContent = rows.length ? (totalCost / rows.length).toFixed(2) : 0;
    document.getElementById("fuel-total").textContent = totalFuel.toFixed(2);

    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = costData;
        chart.data.datasets[1].data = fuelData;
        chart.data.datasets[2].data = electricityData;
        chart.data.datasets[3].data = maintenanceData;
        chart.update();
    } else {
        console.error("Chart not initialized");
    }
}

function addRecord() {
    const table = document.getElementById("delivery-table");
    const inputs = document.querySelectorAll("#modal input");

    if (!inputs[0].value || isNaN(inputs[0].value)) {
        alert("Please enter a valid Time Taken.");
        return;
    }

    const values = Array.from(inputs).map(input => parseFloat(input.value) || 0);
    if (values.some(val => val < 0)) {
        alert("Values cannot be negative.");
        return;
    }

    const row = table.insertRow();
    row.innerHTML = `
        <td>${values[0]}</td>
        <td>${values[1]}</td>
        <td>${values[2]}</td>
        <td>${values[3]}</td>
        <td>${values[4]}</td>
        <td><button class="delete-btn" onclick="deleteRecord(this)">Delete</button></td>
    `;

    document.getElementById("modal").style.display = "none";
    resetModalInputs();
    updateChart();
}

function deleteRecord(button) {
    button.parentElement.parentElement.remove();
    updateChart();
}

function deleteAllRecords() {
    document.getElementById("delivery-table").innerHTML = "";
    updateChart();
}

function searchTable() {
    const searchValue = this.value.toLowerCase();
    document.querySelectorAll("#delivery-table tr").forEach(row => {
        row.style.display = row.cells[0].innerText.toLowerCase().includes(searchValue) ? "" : "none";
    });
}

function uploadExcel() {
    const fileInput = document.getElementById("excel-file");
    const file = fileInput.files[0];
    if (!file) {
        alert("Please select an Excel file.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (jsonData.length < 2) {
            alert("Invalid or empty Excel file.");
            return;
        }

        const expectedHeaders = ["Time Taken (mins)", "Cost per Delivery ($)", "Fuel Consumption (L)", "Electricity Consumption (kWh)", "Maintenance Cost ($)"];
        const headers = jsonData[0].map(h => h.toString().trim());
        if (!expectedHeaders.every((h, i) => headers[i] === h)) {
            alert("Invalid Excel format. Expected headers: " + expectedHeaders.join(", "));
            return;
        }

        const table = document.getElementById("delivery-table");
        table.innerHTML = "";
        jsonData.slice(1).forEach(row => {
            if (row.length >= 5) {
                const newRow = table.insertRow();
                newRow.innerHTML = row.slice(0, 5).map(value => `<td>${parseFloat(value) || 0}</td>`).join('') + '<td><button class="delete-btn" onclick="deleteRecord(this)">Delete</button></td>';
            }
        });
        updateChart();
    };
    reader.readAsArrayBuffer(file);
}

function exportToExcel() {
    const table = document.getElementById("delivery-table");
    const rows = table.querySelectorAll("tr");

    if (rows.length === 0) {
        alert("No data available to export.");
        return;
    }

    let data = [["Time Taken (mins)", "Cost per Delivery ($)", "Fuel Consumption (L)", "Electricity Consumption (kWh)", "Maintenance Cost ($)"]];
    rows.forEach(row => {
        let rowData = [];
        let cells = row.querySelectorAll("td");
        if (cells.length < 5) return;
        for (let i = 0; i < 5; i++) {
            rowData.push(cells[i].innerText.trim());
        }
        data.push(rowData);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DeliveryData");
    XLSX.writeFile(wb, "DeliveryData.xlsx");
}