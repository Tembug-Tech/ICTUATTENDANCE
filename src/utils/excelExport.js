/**
 * Excel Export Utility
 * Handles generation and download of Excel files with attendance data
 */

/**
 * Generate CSV content from attendance data
 * CSV format for Excel compatibility
 */
export const generateAttendanceCSV = (data, filename = 'attendance.csv') => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Define CSV headers
  const headers = [
    'Student Name',
    'Student ID',
    'Course Code',
    'Course Name',
    'Class',
    'Session Date',
    'Session Time',
    'Status'
  ];

  // Convert data rows
  const rows = data.map(row => [
    escapeCSV(row.studentName || ''),
    escapeCSV(row.studentId || ''),
    escapeCSV(row.course || ''),
    escapeCSV(row.courseName || ''),
    escapeCSV(row.class || ''),
    escapeCSV(row.sessionDate || ''),
    escapeCSV(row.sessionTime || ''),
    escapeCSV(row.status || '')
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create blob and download
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
};

/**
 * Generate Excel-style TSV (Tab-Separated Values)
 * Better compatibility with Excel
 */
export const generateAttendanceTSV = (data, filename = 'attendance.xlsx') => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Define headers
  const headers = [
    'Student Name',
    'Student ID',
    'Course Code',
    'Course Name',
    'Class',
    'Session Date',
    'Session Time',
    'Status'
  ];

  // Convert data rows
  const rows = data.map(row => [
    row.studentName || '',
    row.studentId || '',
    row.course || '',
    row.courseName || '',
    row.class || '',
    row.sessionDate || '',
    row.sessionTime || '',
    row.status || ''
  ]);

  // Combine with tabs
  const tsvContent = [
    headers.join('\t'),
    ...rows.map(row => row.join('\t'))
  ].join('\n');

  // Download with .xlsx extension (Excel recognizes TSV)
  downloadFile(tsvContent, filename, 'application/vnd.ms-excel;charset=utf-8;');
};

/**
 * Generate HTML table and open in new window for Excel copy/paste
 * Useful as fallback if file download restricted
 */
export const exportToHTML = (data, filename = 'attendance') => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const headers = [
    'Student Name',
    'Student ID',
    'Course Code',
    'Course Name',
    'Class',
    'Session Date',
    'Session Time',
    'Status'
  ];

  let html = `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #4CAF50; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          tr:hover { background-color: #ddd; }
          h1 { color: #333; }
        </style>
      </head>
      <body>
        <h1>Attendance Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                <td>${row.studentName || ''}</td>
                <td>${row.studentId || ''}</td>
                <td>${row.course || ''}</td>
                <td>${row.courseName || ''}</td>
                <td>${row.class || ''}</td>
                <td>${row.sessionDate || ''}</td>
                <td>${row.sessionTime || ''}</td>
                <td style="font-weight: bold; color: ${row.status === 'Present' ? '#4CAF50' : '#f44336'};">
                  ${row.status || ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const newWindow = window.open();
  newWindow.document.write(html);
  newWindow.document.title = `${filename} - Attendance Report`;
};

/**
 * Generate summary statistics report
 */
export const generateSummaryReport = (data, filename = 'attendance_summary.csv') => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Calculate statistics
  const courseStats = {};
  const studentStats = {};

  data.forEach(row => {
    // Course statistics
    const courseKey = `${row.course} - ${row.courseName}`;
    if (!courseStats[courseKey]) {
      courseStats[courseKey] = {
        course: row.course,
        courseName: row.courseName,
        totalSessions: 0,
        presentCount: 0,
        absentCount: 0,
        percentage: 0
      };
    }
    courseStats[courseKey].totalSessions++;
    if (row.status === 'Present') {
      courseStats[courseKey].presentCount++;
    } else {
      courseStats[courseKey].absentCount++;
    }

    // Student statistics
    const studentKey = `${row.studentName} (${row.studentId})`;
    if (!studentStats[studentKey]) {
      studentStats[studentKey] = {
        studentName: row.studentName,
        studentId: row.studentId,
        totalSessions: 0,
        presentCount: 0,
        absentCount: 0,
        overallPercentage: 0
      };
    }
    studentStats[studentKey].totalSessions++;
    if (row.status === 'Present') {
      studentStats[studentKey].presentCount++;
    } else {
      studentStats[studentKey].absentCount++;
    }
  });

  // Calculate percentages
  Object.values(courseStats).forEach(stat => {
    stat.percentage = stat.totalSessions > 0 
      ? Math.round((stat.presentCount / stat.totalSessions) * 100)
      : 0;
  });

  Object.values(studentStats).forEach(stat => {
    stat.overallPercentage = stat.totalSessions > 0
      ? Math.round((stat.presentCount / stat.totalSessions) * 100)
      : 0;
  });

  // Create CSV content
  let csvContent = 'ATTENDANCE SUMMARY REPORT\n';
  csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;

  csvContent += 'COURSE STATISTICS\n';
  csvContent += 'Course Code,Course Name,Total Sessions,Present,Absent,Attendance %\n';
  Object.values(courseStats).forEach(stat => {
    csvContent += `${stat.course},${stat.courseName},${stat.totalSessions},${stat.presentCount},${stat.absentCount},${stat.percentage}%\n`;
  });

  csvContent += '\n\nSTUDENT STATISTICS\n';
  csvContent += 'Student Name,Student ID,Total Sessions,Present,Absent,Overall Attendance %\n';
  Object.values(studentStats).forEach(stat => {
    csvContent += `${stat.studentName},${stat.studentId},${stat.totalSessions},${stat.presentCount},${stat.absentCount},${stat.overallPercentage}%\n`;
  });

  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
};

/**
 * Helper function to escape CSV values
 */
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Helper function to download file
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format date string for use in filenames
 */
export const getFormattedDateForFilename = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}_${hours}${minutes}`;
};

/**
 * Validate date range
 */
export const isValidDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end;
};
