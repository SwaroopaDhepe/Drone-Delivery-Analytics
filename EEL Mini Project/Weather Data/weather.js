let chart;

document.addEventListener("DOMContentLoaded", function () {
    const ctx = document.getElementById("chart").getContext("2d");
    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [
                {
                    label: "Wind Speed (km/h)",
                    data: [],
                    borderColor: "#3498DB",
                    fill: false,
                    tension: 0.1,
                },
                {
                    label: "Rainfall (mm)",
                    data: [],
                    borderColor: "#2ECC71",
                    fill: false,
                    tension: 0.1,
                },
                {
                    label: "Visibility (km)",
                    data: [],
                    borderColor: "#F39C12",
                    fill: false,
                    tension: 0.1,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    display: true,
                    title: { display: true, text: "Date", font: { size: 14 } },
                    ticks: {
                        maxTicksLimit: 10, // Limit to 10 ticks
                        autoSkip: true,
                        maxRotation: 45,
                        minRotation: 45,
                        font: { size: 12 },
                    },
                },
                y: {
                    display: true,
                    title: { display: true, text: "Value", font: { size: 14 } },
                    ticks: { font: { size: 12 } },
                },
            },
            plugins: {
                legend: { position: "bottom", labels: { font: { size: 12 } } },
                tooltip: {
                    callbacks: {
                        title: function (tooltipItems) {
                            // Show full date+time in tooltip
                            return tooltipItems[0].label;
                        },
                    },
                },
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

    document.getElementById("delete-all").addEventListener("click", deleteAllRecords);
    document.getElementById("search-bar").addEventListener("input", searchRecords);
});

function fetchAnalysisGraphs() {
    const rows = document.querySelectorAll("#weather-table tr");
    const records = Array.from(rows)
        .map(row => {
            if (row.cells.length < 5) return null;
            return [
                row.cells[0]?.innerText.trim(),
                row.cells[1]?.innerText.trim(),
                row.cells[2]?.innerText.trim(),
                row.cells[3]?.innerText.trim(),
                row.cells[4]?.innerText.trim()
            ];
        })
        .filter(record => record !== null);

    console.log('🚀 Records prepared for backend:', records);

    if (records.length === 0) {
        document.getElementById('bar-chart-container').innerHTML = '<p>No data available</p>';
        document.getElementById('line-chart-container').innerHTML = '<p>No data available</p>';
        document.getElementById('total-records').textContent = 0;
        document.getElementById('avg-wind-speed').textContent = 0;
        document.getElementById('total-rainfall').textContent = 0;
        document.getElementById('avg-visibility').textContent = 0;
        return;
    }

    fetch('http://localhost:5000/generate-graphs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records })
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
            document.getElementById('bar-chart-container').innerHTML = data.bar_chart;
            document.getElementById('line-chart-container').innerHTML = data.line_chart;
            document.getElementById('total-records').textContent = data.summary.total_records;
            document.getElementById('avg-wind-speed').textContent = data.summary.avg_wind_speed;
            document.getElementById('total-rainfall').textContent = data.summary.total_rainfall;
            document.getElementById('avg-visibility').textContent = data.summary.avg_visibility;
            // Verify images loaded
            const barImg = document.querySelector('#bar-chart-container img');
            const lineImg = document.querySelector('#line-chart-container img');
            if (barImg) barImg.onerror = () => console.error('Bar chart image failed to load');
            if (lineImg) lineImg.onerror = () => console.error('Line chart image failed to load');
        } else {
            throw new Error(data.message || 'Unknown error from backend');
        }
    })
    .catch(error => {
        console.error('❌ Fetch error:', error);
        alert('Analysis failed: ' + error.message);
        document.getElementById('bar-chart-container').innerHTML = '<p>Failed to load chart</p>';
        document.getElementById('line-chart-container').innerHTML = '<p>Failed to load chart</p>';
        document.getElementById('total-records').textContent = records.length;
        document.getElementById('avg-wind-speed').textContent = 'N/A';
        document.getElementById('total-rainfall').textContent = 'N/A';
        document.getElementById('avg-visibility').textContent = 'N/A';
    });
}

function updateChart() {
    const rows = document.querySelectorAll("#weather-table tr");
    let records = rows.length;
    let windSpeedTotal = 0;
    let rainfallTotal = 0;
    let visibilityTotal = 0;

    const labels = [];
    const windSpeedData = [];
    const rainfallData = [];
    const visibilityData = [];

    rows.forEach((row) => {
        const date = row.cells[0]?.innerText.trim();
        const time = row.cells[1]?.innerText.trim();
        const windSpeed = parseFloat(row.cells[2]?.innerText) || 0;
        const rainfall = parseFloat(row.cells[3]?.innerText) || 0;
        const visibility = parseFloat(row.cells[4]?.innerText) || 0;

        // Use date only for x-axis labels, keep full label for tooltip
        labels.push({ display: formatDate(date, true), full: date + " " + time });
        windSpeedData.push(windSpeed);
        rainfallData.push(rainfall);
        visibilityData.push(visibility);

        windSpeedTotal += windSpeed;
        rainfallTotal += rainfall;
        visibilityTotal += visibility;
    });

    const windSpeedAvg = records > 0 ? (windSpeedTotal / records).toFixed(2) : 0;
    const visibilityAvg = records > 0 ? (visibilityTotal / records).toFixed(2) : 0;

    document.getElementById("records-count").textContent = records;
    document.getElementById("wind-speed-avg").textContent = windSpeedAvg;
    document.getElementById("rainfall-total").textContent = rainfallTotal.toFixed(2);

    chart.data.labels = labels.map(label => label.display);
    chart.data.datasets[0].data = windSpeedData;
    chart.data.datasets[1].data = rainfallData;
    chart.data.datasets[2].data = visibilityData;

    // Update tooltip to show full date+time
    chart.options.plugins.tooltip.callbacks.title = function (tooltipItems) {
        return labels[tooltipItems[0].dataIndex].full;
    };

    chart.update();
}

function addRecord() {
    const date = document.getElementById("date-input").value;
    const time = document.getElementById("time-input").value;
    const windSpeed = parseFloat(document.getElementById("wind-speed-input").value) || 0;
    const rainfall = parseFloat(document.getElementById("rainfall-input").value) || 0;
    const visibility = parseFloat(document.getElementById("visibility-input").value) || 0;

    if (!date || !time) {
        alert("Please enter a date and time.");
        return;
    }
    if (windSpeed < 0 || rainfall < 0 || visibility < 0) {
        alert("Values cannot be negative.");
        return;
    }

    const table = document.getElementById("weather-table");
    const row = table.insertRow();
    row.innerHTML = `
        <td>${formatDate(date)}</td>
        <td>${time}</td>
        <td>${windSpeed.toFixed(2)}</td>
        <td>${rainfall.toFixed(2)}</td>
        <td>${visibility.toFixed(2)}</td>
        <td><button class="delete-btn" onclick="deleteRecord(this)">Delete</button></td>
    `;

    document.getElementById("modal").style.display = "none";
    updateChart();
}

function deleteRecord(button) {
    button.closest("tr").remove();
    updateChart();
}

function deleteAllRecords() {
    document.getElementById("weather-table").innerHTML = "";
    updateChart();
}

function searchRecords() {
    const searchValue = this.value.toLowerCase();
    const rows = document.querySelectorAll("#weather-table tr");

    rows.forEach((row) => {
        const dateTime = (row.cells[0]?.innerText + " " + row.cells[1]?.innerText).toLowerCase();
        row.style.display = dateTime.includes(searchValue) ? "" : "none";
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
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: "array", cellDates: true });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            let jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: 'dd/mm/yyyy' });

            console.log('Parsed Excel data:', jsonData);

            if (jsonData.length < 2) {
                alert("The Excel file is empty or contains no data rows.");
                return;
            }

            const headers = jsonData[0].map(header => header ? header.toString().trim().toLowerCase().replace(/\s+/g, ' ') : '');
            console.log('Headers:', headers);

            const headerMap = {
                date: headers.findIndex(h => h.includes('date')),
                time: headers.findIndex(h => h.includes('time')),
                windSpeed: headers.findIndex(h => h.includes('wind speed') || h.includes('windspeed')),
                rainfall: headers.findIndex(h => h.includes('rainfall') || h.includes('rain')),
                visibility: headers.findIndex(h => h.includes('visibility') || h.includes('vis'))
            };

            console.log('Header indices:', headerMap);

            if (Object.values(headerMap).includes(-1)) {
                alert("Invalid Excel format. Expected columns: Date, Time, Wind Speed, Rainfall, Visibility.");
                return;
            }

            const table = document.getElementById("weather-table");
            table.innerHTML = "";
            let addedRows = 0;
            let skippedRows = 0;

            jsonData.slice(1).forEach((row, index) => {
                const date = row[headerMap.date];
                const time = row[headerMap.time];
                const windSpeed = parseFloat(row[headerMap.windSpeed]) || 0;
                const rainfall = parseFloat(row[headerMap.rainfall]) || 0;
                const visibility = parseFloat(row[headerMap.visibility]) || 0;

                if (!date || !time) {
                    console.log(`Skipping row ${index + 2}: Missing date or time`, { date, time });
                    skippedRows++;
                    return;
                }
                if (windSpeed < 0 || rainfall < 0 || visibility < 0) {
                    console.log(`Skipping row ${index + 2}: Negative values`, { windSpeed, rainfall, visibility });
                    skippedRows++;
                    return;
                }

                const formattedDate = formatDate(date);
                if (formattedDate === "Invalid Date") {
                    console.log(`Skipping row ${index + 2}: Invalid date`, { date });
                    skippedRows++;
                    return;
                }

                const newRow = table.insertRow();
                newRow.innerHTML = `
                    <td>${formattedDate}</td>
                    <td>${time}</td>
                    <td>${windSpeed.toFixed(2)}</td>
                    <td>${rainfall.toFixed(2)}</td>
                    <td>${visibility.toFixed(2)}</td>
                    <td><button class="delete-btn" onclick="deleteRecord(this)">Delete</button></td>
                `;
                addedRows++;
            });

            console.log(`Upload complete: ${addedRows} rows added, ${skippedRows} rows skipped`);
            if (addedRows === 0) {
                alert("No valid rows were added. Check the Excel file for valid data.");
            } else {
                alert(`Successfully added ${addedRows} rows. ${skippedRows} rows were skipped due to invalid data.`);
            }

            updateChart();
        } catch (error) {
            console.error('Error processing Excel file:', error);
            alert("Failed to process Excel file: " + error.message);
        }
    };

    reader.onerror = function (event) {
        console.error('FileReader error:', event);
        alert("Error reading file. Please ensure it's a valid Excel file.");
    };

    reader.readAsArrayBuffer(file);
}

function exportToExcel() {
    const table = document.getElementById("weather-table");
    const rows = table.querySelectorAll("tr");

    if (rows.length === 0) {
        alert("No data available to export.");
        return;
    }

    let data = [["Date", "Time", "Wind Speed", "Rainfall", "Visibility"]];

    rows.forEach(row => {
        let rowData = Array.from(row.querySelectorAll("td")).map(td => td.innerText.trim());
        if (rowData.length === 5) data.push(rowData);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WeatherData");
    XLSX.writeFile(wb, "WeatherData.xlsx");
}

function formatDate(inputDate, shortFormat = false) {
    if (!inputDate) return "Invalid Date";
    let date;
    if (typeof inputDate === 'number') {
        // Excel date serial number
        const excelEpoch = new Date(1899, 11, 30);
        date = new Date(excelEpoch.getTime() + inputDate * 24 * 60 * 60 * 1000);
    } else if (inputDate instanceof Date) {
        date = inputDate;
    } else {
        // String date
        const cleanedDate = inputDate.toString().trim();
        date = new Date(cleanedDate);
        if (isNaN(date)) {
            const parts = cleanedDate.split(/[-\/]/);
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    date = new Date(parts[0], parts[1] - 1, parts[2]);
                } else {
                    date = new Date(parts[2], parts[1] - 1, parts[0]);
                }
            }
        }
    }
    if (isNaN(date)) return "Invalid Date";
    const options = shortFormat
        ? { day: "2-digit", month: "2-digit", year: "2-digit" }
        : { day: "2-digit", month: "2-digit", year: "numeric" };
    return date.toLocaleDateString("en-GB", options).split("/").join("/");
}