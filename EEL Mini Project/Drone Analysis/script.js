let chart;

document.addEventListener("DOMContentLoaded", function () {
    const ctx = document.getElementById("chart").getContext("2d");
    chart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Orders", "Deliveries", "Revenue ($K)"],
            datasets: [
                {
                    label: "Statistics",
                    data: [0, 0, 0],
                    backgroundColor: ["#FF6384", "#36A2EB", "#4CAF50"],
                    borderWidth: 1,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: "bottom" },
            },
        },
    });

    const modal = document.getElementById("modal");
    const analysisModal = document.getElementById("analysis-modal");
    modal.style.display = "none";
    analysisModal.style.display = "none";

    document.getElementById("open-modal").addEventListener("click", function () {
        modal.style.display = "flex";
    });

    document.getElementById("close-modal").addEventListener("click", function () {
        modal.style.display = "none";
    });

    document.getElementById("open-analysis").addEventListener("click", function () {
        analysisModal.style.display = "flex";
        fetchAnalysisGraphs();
    });

    document.getElementById("close-analysis-modal").addEventListener("click", function () {
        analysisModal.style.display = "none";
    });

    window.addEventListener("click", function (event) {
        if (event.target === modal) modal.style.display = "none";
        if (event.target === analysisModal) analysisModal.style.display = "none";
    });

    document.getElementById("delete-all").addEventListener("click", deleteAllOrders);

    document.getElementById("search-bar").addEventListener("input", function () {
        const searchValue = this.value.toLowerCase();
        const rows = document.querySelectorAll("#orders-table tr");
        rows.forEach((row) => {
            const droneID = row.cells[2]?.innerText.toLowerCase();
            row.style.display = droneID && droneID.includes(searchValue) ? "" : "none";
        });
    });
});
function fetchAnalysisGraphs() {
    const rows = document.querySelectorAll("#orders-table tr");
    const orders = Array.from(rows)
        .map(row => {
            if (row.cells.length < 5) return null;
            return [
                row.cells[0]?.innerText.trim(), // Date
                row.cells[1]?.innerText.trim(), // ID
                row.cells[2]?.innerText.trim(), // Drone ID
                row.cells[3]?.innerText.trim(), // Status
                row.cells[4]?.innerText.trim()  // Amount
            ];
        })
        .filter(order => order !== null);

    console.log('🚀 Orders prepared for backend:', orders);

    if (orders.length === 0) {
        document.getElementById('bar-chart-container').innerHTML = '<p>No data available</p>';
        document.getElementById('line-chart-container').innerHTML = '<p>No data available</p>';
        document.getElementById('total-orders').textContent = 0;
        document.getElementById('pending-orders').textContent = 0;
        document.getElementById('delivered-orders').textContent = 0;
        document.getElementById('avg-amount').textContent = 0;
        return;
    }

    fetch('http://localhost:5000/generate-graphs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders })
    })
    .then(response => {
        console.log('📡 Response received, status:', response.status, response.statusText);
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}, Message: ${err.message || 'Unknown'}`);
            }).catch(() => {
                throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('✅ Backend data:', data);
        if (data.status === 'success') {
            // Inject chart images
            document.getElementById('bar-chart-container').innerHTML = data.bar_chart;
            document.getElementById('line-chart-container').innerHTML = data.line_chart;

            // Update summary stats
            document.getElementById('total-orders').textContent = data.summary.total_orders;
            document.getElementById('pending-orders').textContent = data.summary.pending_orders;
            document.getElementById('delivered-orders').textContent = data.summary.delivered_orders;
            document.getElementById('avg-amount').textContent = data.summary.avg_amount;
        } else {
            throw new Error(data.message || 'Unknown error from backend');
        }
    })
    .catch(error => {
        console.error('❌ Fetch error:', error);
        alert('Analysis failed: ' + error.message);

        // Fallback message
        document.getElementById('bar-chart-container').innerHTML = '<p>Failed to load chart</p>';
        document.getElementById('line-chart-container').innerHTML = '<p>Failed to load chart</p>';

        document.getElementById('total-orders').textContent = orders.length;
        document.getElementById('pending-orders').textContent = 1;
        document.getElementById('delivered-orders').textContent = 1;
        document.getElementById('avg-amount').textContent = 'N/A';
    });
}

function updateChart() {
    const rows = document.querySelectorAll("#orders-table tr");
    let orders = rows.length;
    let deliveries = 0;
    let revenue = 0;

    rows.forEach((row) => {
        const status = row.cells[3]?.innerText.trim();
        const amount = parseFloat(row.cells[4]?.innerText.replace("$", "")) || 0;
        if (status.toLowerCase() === "delivered") deliveries++;
        revenue += amount;
    });

    document.getElementById("orders-count").textContent = orders;
    document.getElementById("deliveries-count").textContent = deliveries;
    document.getElementById("revenue-count").textContent = revenue.toFixed(2);

    chart.data.datasets[0].data = [orders, deliveries, revenue];
    chart.update();
}

function addOrder() {
    const table = document.getElementById("orders-table");
    const row = table.insertRow();
    const id = table.rows.length;
    const date = document.getElementById("date-input").value;
    const customer = document.getElementById("customer-input").value.trim();
    const status = document.getElementById("status-input").value.trim();
    const amount = document.getElementById("amount-input").value || 0;

    if (!date || !customer) {
        alert("Please enter a date and Drone ID.");
        return;
    }

    row.innerHTML = `
        <td>${formatDate(date)}</td>
        <td>${id}</td>
        <td>${customer}</td>
        <td>${status || "Pending"}</td>
        <td>$${parseFloat(amount).toFixed(2)}</td>
        <td><button class="delete-btn" onclick="deleteOrder(this)">Delete</button></td>
    `;

    document.getElementById("modal").style.display = "none";
    updateChart();
}

function deleteOrder(button) {
    const row = button.parentElement.parentElement;
    row.remove();
    updateChart();
}

function deleteAllOrders() {
    document.getElementById("orders-table").innerHTML = "";
    updateChart();
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
        let jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const table = document.getElementById("orders-table");
        table.innerHTML = "";

        let headers = jsonData[0];
        let dateIndex = headers.indexOf("Date");
        let droneIdIndex = headers.indexOf("Drone ID");
        let statusIndex = headers.indexOf("Status");
        let amountIndex = headers.indexOf("Amount");

        if (dateIndex === -1 || droneIdIndex === -1) {
            alert("Invalid Excel format. Please check column names.");
            return;
        }

        jsonData.slice(1).forEach((row, index) => {
            const newRow = table.insertRow();
            const date = row[dateIndex] ? formatDate(row[dateIndex]) : formatDate(new Date());
            const droneID = row[droneIdIndex] || "Unknown";
            const status = row[statusIndex] || "Pending";
            const amount = parseFloat(row[amountIndex] || 0).toFixed(2);

            newRow.innerHTML = `
                <td>${date}</td>
                <td>${index + 1}</td>
                <td>${droneID}</td>
                <td>${status}</td>
                <td>$${amount}</td>
                <td><button class="delete-btn" onclick="deleteOrder(this)">Delete</button></td>
            `;
        });

        updateChart();
    };
    reader.readAsArrayBuffer(file);
}

function exportToExcel() {
    const table = document.getElementById("orders-table");
    const rows = table.querySelectorAll("tr");

    if (rows.length === 0) {
        alert("No data available to export.");
        return;
    }

    let data = [["Date", "Order ID", "Drone ID", "Status", "Amount"]];
    rows.forEach((row) => {
        let rowData = [];
        let cells = row.querySelectorAll("td");
        if (cells.length < 5) return;
        for (let i = 0; i < 5; i++) {
            rowData.push(cells[i].innerText.replace("$", "").trim());
        }
        data.push(rowData);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, "DroneOrders.xlsx");
}

function formatDate(inputDate) {
    if (!inputDate) return "Invalid Date";
    let date = new Date(inputDate);
    if (isNaN(date)) {
        const parts = inputDate.split(/[-\/]/);
        if (parts.length === 3) {
            if (parts[0].length === 4) {
                date = new Date(parts[0], parts[1] - 1, parts[2]);
            } else {
                date = new Date(parts[2], parts[1] - 1, parts[0]);
            }
        }
    }
    return isNaN(date) ? "Invalid Date" : date.toLocaleDateString("en-GB");
}