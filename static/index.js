// Add this inside the <script> tags in your HTML
document.addEventListener('DOMContentLoaded', function () {
    // Elements
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const fileDetails = document.getElementById('file-details');
    const fileNameText = document.getElementById('file-name-text');
    const fileSizeText = document.getElementById('file-size-text');
    const removeFileBtn = document.getElementById('remove-file');
    const calculateBtn = document.getElementById('calculate-btn');
    const loadingContainer = document.getElementById('loading-container');
    const resultsContainer = document.getElementById('results-container') || document.createElement('div');

    if (!document.getElementById('results-container')) {
        resultsContainer.id = 'results-container';
        document.querySelector('.calculator-card').appendChild(resultsContainer);
    }

    // Initially hide file details and loading
    fileDetails.style.display = 'none';
    loadingContainer.style.display = 'none';

    // Make upload area clickable to trigger file input
    uploadArea.addEventListener('click', function () {
        fileInput.click();
    });

    // Handle drag and drop
    uploadArea.addEventListener('dragover', function (e) {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', function () {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', function (e) {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');

        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect();
        }
    });

    // Handle file selection via click
    fileInput.addEventListener('change', handleFileSelect);

    function handleFileSelect() {
        if (fileInput.files.length) {
            const file = fileInput.files[0];

            // Check if it's a CSV file
            if (!file.name.endsWith('.csv')) {
                alert('Please select a CSV file.');
                return;
            }

            // Display file details
            fileNameText.textContent = file.name;
            fileSizeText.textContent = formatFileSize(file.size);

            uploadArea.style.display = 'none';
            fileDetails.style.display = 'block';
        }
    }

    // Remove selected file
    removeFileBtn.addEventListener('click', function () {
        fileInput.value = '';
        uploadArea.style.display = 'flex';
        fileDetails.style.display = 'none';
        resultsContainer.innerHTML = '';
    });

    // Calculate CGPA
    calculateBtn.addEventListener('click', function () {
        if (!fileInput.files.length) {
            alert('Please select a CSV file first.');
            return;
        }

        // Show loading state
        loadingContainer.style.display = 'flex';
        resultsContainer.innerHTML = '';

        // Create form data
        const formData = new FormData();
        formData.append('cgpa_file', fileInput.files[0]);

        // Get CSRF token if it exists
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;

        // Send AJAX request
        fetch('/calculate-cgpa/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                ...(csrfToken && { 'X-CSRFToken': csrfToken })
            }
        })
            .then(response => response.json())
            .then(data => {
                // Hide loading
                loadingContainer.style.display = 'none';

                if (data.error) {
                    showError(data.error);
                    return;
                }

                // Display results
                displayResults(data);
            })
            .catch(error => {
                loadingContainer.style.display = 'none';
                showError('An error occurred while processing your request.');
                console.error('Error:', error);
            });
    });

    // Sample CSV button
    document.getElementById('sample-btn').addEventListener('click', function (e) {
        // If the button isn't an <a> tag with href, handle manually
        if (!e.currentTarget.getAttribute('href')) {
            e.preventDefault();
            window.location.href = '/download-sample/';
        }
    });

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' bytes';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function showError(message) {
        resultsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                ${message}
            </div>
        `;
    }

    function displayResults(data) {
        // Create results HTML
        let resultsHTML = `
            <h2 class="results-title">CGPA Results</h2>
            <div class="results-summary">
                <p>Processed ${data.students.length} student records</p>
            </div>
            <div class="students-table">
                <table>
                    <thead>
                        <tr>
                            <th>Student ID</th>
                            <th>Name</th>
                            <th>Total Units</th>
                            <th>Total Grade Points</th>
                            <th>CGPA</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        data.students.forEach(student => {
            // Format CGPA with appropriate color based on value
            let cgpaClass = 'cgpa';
            if (student.cgpa >= 4.5) cgpaClass += ' excellent';
            else if (student.cgpa >= 3.5) cgpaClass += ' good';
            else if (student.cgpa >= 2.5) cgpaClass += ' average';
            else if (student.cgpa >= 1.5) cgpaClass += ' pass';
            else cgpaClass += ' fail';

            resultsHTML += `
                <tr class="student-row" data-student-id="${student.student_id}">
                    <td>${student.student_id}</td>
                    <td>${student.name}</td>
                    <td>${student.total_units}</td>
                    <td>${student.total_grade_points}</td>
                    <td class="${cgpaClass}">${student.cgpa}</td>
                </tr>
            `;
        });

        resultsHTML += `
                    </tbody>
                </table>
            </div>
            <div class="download-results">
                <button class="btn btn-primary" id="download-btn">
                    <i class="fas fa-download"></i> Download Results
                </button>
                <button class="btn btn-outline" id="detailed-btn">
                    <i class="fas fa-list"></i> View Detailed Report
                </button>
            </div>
        `;

        resultsContainer.innerHTML = resultsHTML;

        // Store data for detailed view
        resultsContainer.dataset.studentsData = JSON.stringify(data.students);

        // Handle download results button
        document.getElementById('download-btn').addEventListener('click', function () {
            downloadResults(data);
        });

        // Handle detailed view button
        document.getElementById('detailed-btn').addEventListener('click', function () {
            showDetailedView(data.students);
        });

        // Make rows clickable for detailed student view
        document.querySelectorAll('.student-row').forEach(row => {
            row.addEventListener('click', function () {
                const studentId = this.dataset.studentId;
                const student = data.students.find(s => s.student_id === studentId);
                showStudentDetails(student);
            });
        });
    }

    function showDetailedView(students) {
        let detailedHTML = `
            <h2 class="results-title">Detailed CGPA Report</h2>
            <button class="btn btn-outline back-btn" id="back-to-summary">
                <i class="fas fa-arrow-left"></i> Back to Summary
            </button>
            <div class="detailed-table">
                <table>
                    <thead>
                        <tr>
                            <th>Student ID</th>
                            <th>Name</th>
                            <th>Course</th>
                            <th>Score</th>
                            <th>Grade</th>
                            <th>Units</th>
                            <th>Grade Points</th>
                            <th>Weighted Points</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        students.forEach(student => {
            let rowspan = student.courses.length;

            student.courses.forEach((course, index) => {
                detailedHTML += '<tr>';

                // Only include student info in first row of each student's courses
                if (index === 0) {
                    detailedHTML += `
                        <td rowspan="${rowspan}">${student.student_id}</td>
                        <td rowspan="${rowspan}">${student.name}</td>
                    `;
                }

                detailedHTML += `
                    <td>${course.code}</td>
                    <td>${course.raw_grade}</td>
                    <td>${course.grade_letter}</td>
                    <td>${course.unit}</td>
                    <td>${course.grade_point}</td>
                    <td>${course.weighted_grade}</td>
                </tr>
                `;
            });

            // Add summary row for each student
            detailedHTML += `
                <tr class="summary-row">
                    <td colspan="5" class="text-right"><strong>Total:</strong></td>
                    <td><strong>${student.total_units}</strong></td>
                    <td></td>
                    <td><strong>${student.total_grade_points}</strong></td>
                </tr>
                <tr class="cgpa-row">
                    <td colspan="7" class="text-right"><strong>CGPA:</strong></td>
                    <td><strong>${student.cgpa}</strong></td>
                </tr>
                <tr class="spacer"><td colspan="8"></td></tr>
            `;
        });

        detailedHTML += `
                    </tbody>
                </table>
            </div>
            <div class="download-results">
                <button class="btn btn-primary" id="download-detailed">
                    <i class="fas fa-download"></i> Download Detailed Report
                </button>
            </div>
        `;

        resultsContainer.innerHTML = detailedHTML;

        // Handle back button
        document.getElementById('back-to-summary').addEventListener('click', function () {
            const studentsData = JSON.parse(resultsContainer.dataset.studentsData);
            displayResults({ students: studentsData });
        });

        // Handle download detailed button
        document.getElementById('download-detailed').addEventListener('click', function () {
            downloadDetailedResults(students);
        });
    }

    function showStudentDetails(student) {
        let detailsHTML = `
            <h2 class="results-title">Student Report: ${student.name}</h2>
            <button class="btn btn-outline back-btn" id="back-to-summary">
                <i class="fas fa-arrow-left"></i> Back to Summary
            </button>
            
            <div class="student-info">
                <p><strong>Student ID:</strong> ${student.student_id}</p>
                <p><strong>Name:</strong> ${student.name}</p>
                <p><strong>CGPA:</strong> <span class="highlight">${student.cgpa}</span></p>
            </div>
            
            <div class="courses-table">
                <h3>Course Breakdown</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Course Code</th>
                            <th>Score</th>
                            <th>Grade</th>
                            <th>Units</th>
                            <th>Grade Points</th>
                            <th>Weighted Points</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        student.courses.forEach(course => {
            detailsHTML += `
                <tr>
                    <td>${course.code}</td>
                    <td>${course.raw_grade}</td>
                    <td>${course.grade_letter}</td>
                    <td>${course.unit}</td>
                    <td>${course.grade_point}</td>
                    <td>${course.weighted_grade}</td>
                </tr>
            `;
        });

        detailsHTML += `
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3" class="text-right"><strong>Total:</strong></td>
                            <td><strong>${student.total_units}</strong></td>
                            <td></td>
                            <td><strong>${student.total_grade_points}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="calculation">
                <h3>CGPA Calculation</h3>
                <p>CGPA = Total Grade Points / Total Units</p>
                <p>CGPA = ${student.total_grade_points} / ${student.total_units} = <span class="highlight">${student.cgpa}</span></p>
            </div>
            
            <div class="download-results">
                <button class="btn btn-primary" id="download-student">
                    <i class="fas fa-download"></i> Download Student Report
                </button>
            </div>
        `;

        resultsContainer.innerHTML = detailsHTML;

        // Handle back button
        document.getElementById('back-to-summary').addEventListener('click', function () {
            const studentsData = JSON.parse(resultsContainer.dataset.studentsData);
            displayResults({ students: studentsData });
        });

        // Handle download student report button
        document.getElementById('download-student').addEventListener('click', function () {
            downloadStudentReport(student);
        });
    }

    function downloadResults(data) {
        // Create CSV content
        let csvContent = "Student ID,Name,Total Units,Total Grade Points,CGPA\n";

        data.students.forEach(student => {
            csvContent += `${student.student_id},${student.name},${student.total_units},${student.total_grade_points},${student.cgpa}\n`;
        });

        // Create download link
        downloadCSV(csvContent, 'cgpa_results.csv');
    }

    function downloadDetailedResults(students) {
        // Create CSV content
        let csvContent = "Student ID,Name,Course Code,Score,Grade,Units,Grade Points,Weighted Points\n";

        students.forEach(student => {
            student.courses.forEach(course => {
                csvContent += `${student.student_id},${student.name},${course.code},${course.raw_grade},${course.grade_letter},${course.unit},${course.grade_point},${course.weighted_grade}\n`;
            });

            // Add empty row between students
            csvContent += `\n`;
        });

        // Create download link
        downloadCSV(csvContent, 'detailed_cgpa_results.csv');
    }

    function downloadStudentReport(student) {
        // Create CSV content
        let csvContent = `Student Report\n`;
        csvContent += `Student ID,${student.student_id}\n`;
        csvContent += `Name,${student.name}\n`;
        csvContent += `CGPA,${student.cgpa}\n\n`;

        csvContent += `Course Code,Score,Grade,Units,Grade Points,Weighted Points\n`;

        student.courses.forEach(course => {
            csvContent += `${course.code},${course.raw_grade},${course.grade_letter},${course.unit},${course.grade_point},${course.weighted_grade}\n`;
        });

        csvContent += `\nTotal,,,,${student.total_units},${student.total_grade_points}\n`;

        // Create download link
        downloadCSV(csvContent, `student_report_${student.student_id}.csv`);
    }

    function downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', filename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
});