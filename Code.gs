/**
 * =========================================================================================
 *                   ROHI SOFTWARE TECHNOLOGY PARK (STP) - LMS INTEGRATION
 * =========================================================================================
 * 
 * Google Apps Script Web App Connection Script - RELATIONAL UNIFIED CENTRAL DATABASE ENGINE
 * 
 * This Apps Script serves as a high-speed unified database coordinator, binding
 * your React STP platform to a single Google Spreadsheet. It manages ALL system
 * modules (Enrolments, Employees, Batches, HallBookings, Startups, Inventory,
 * Attendance Logs, and Courses) to keep all client devices fully synchronized in real-time.
 * 
 * -----------------------------------------------------------------------------------------
 * 🚀 QUICK DEPLOYMENT INSTRUCTIONS:
 * -----------------------------------------------------------------------------------------
 * 1. Open the Google Sheet where you want to sync student application records and system files.
 * 2. Click "Extensions" -> "Apps Script" in the top menu bar.
 * 3. Delete any default code in the editor and paste this entire code block.
 * 4. Save the project (click the floppy disk icon or press Ctrl+S / Cmd+S).
 * 5. Click "Deploy" (top right corner) -> "New deployment".
 * 6. Under "Select type" (gear icon), choose "Web app".
 * 7. Configure the settings EXACTLY as follows:
 *    - Description: "Rohi STP Comprehensive Relational DBMS V3"
 *    - Execute as: "Me" (your-email@gmail.com)
 *    - Who has access: "Anyone" (CRITICAL: Required so that all client browsers can read/write data)
 * 8. Click "Deploy".
 * 9. Google will prompt you to "Authorize access". Grant the required permissions.
 * 10. Copy the generated "Web app URL" (ends in "/exec").
 * 11. Navigate to your app -> "Developer Sync Tools" panel, paste this URL
 *     into the endpoint input, and turn on "Live Sheets Synchronization".
 * 12. Use "Run Full Cloud Backup" or "Fetch All Datasets" to populate all devices!
 * 
 * -----------------------------------------------------------------------------------------
 */

// Headers structure to match the student React EnrolmentRecord data objects 
const HEADERS = [
  "Registration ID",
  "Enrolment Date",
  "Course Title",
  "First Name",
  "Last Name",
  "Father's Name",
  "CNIC / ID Number",
  "Mobile Number",
  "Email Address",
  "Home Address",
  "Gender",
  "Civil Status",
  "Laptop Required",
  "Payment Plan",
  "Base Fee (PKR)",
  "Subsidy / Discount (PKR)",
  "Laptop Security (PKR)",
  "Net Payable (PKR)",
  "Installment Due Date",
  "Verification Status",
  "Auxiliary Data JSON" // Extra/new/nested fields stored as JSON
];

// Hex primary branding colors matching the STP logo profile
const THEME = {
  headerBg: "#004173",      // Deep Navy
  headerText: "#FFFFFF",    // Absolute White
  zebraLight: "#F8FAFC",    // Crisp light background
  emeraldTint: "#D1FAE5",   // Light green for Enrolled/Verified
  emeraldText: "#065F46",   // Deep green for enrolled label text
  statusPendingBg: "#FEF3C7", // Yellow warm
  statusPendingText: "#92400E" // Amber dark
};

/**
 * Handle HTTP GET Requests.
 * Supports:
 * - Handshake status check (default GET)
 * - Fetching employees dynamically with: /exec?action=getEmployees
 * - Fetching ALL relational tables in one payload with: /exec?action=getAllData (Allows zero-config instant multi-device sync!)
 */
function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : null;
  
  if (action === "getAllData") {
    try {
      const data = getAllDatabaseTables();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: data, timestamp: new Date().toISOString() }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  if (action === "getEmployees") {
    try {
      const emps = getEmployeesList();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", employees: emps, timestamp: new Date().toISOString() }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // General Status Check
  const output = {
    status: "success",
    timestamp: new Date().toISOString(),
    message: "Handshake operational! Rohi STP Central Database Server V3 is ready.",
    sheetConfigured: getActiveSheet() !== null
  };
  
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle HTTP POST Requests for bulk sync and write operations.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createErrorResponse("No post data payload identified in the HTTP pipeline.");
    }
    
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    
    if (action === "syncAllData") {
      // MASTER POST TO OVERWRITE ALL TABLES AT ONCE (Push entire system backup)
      syncAllDatabaseTables(payload);
      return createSuccessResponse("All system database sheets synced and formatted successfully!");
      
    } else if (action === "getAllData") {
      // Backup POST for fetching everything
      const data = getAllDatabaseTables();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: data }))
        .setMimeType(ContentService.MimeType.JSON);
        
    } else if (action === "addRecord") {
      const sheet = getOrCreateEnrolmentSheet();
      const record = payload.record;
      if (!record) {
        return createErrorResponse("No record dataset passed with addRecord task.");
      }
      addOrUpdateRecordOnSheet(sheet, record);
      return createSuccessResponse("Student record synchronized successfully.");
      
    } else if (action === "deleteRecord") {
      const regId = payload.regId;
      if (!regId) {
        return createErrorResponse("No registration ID specified for deleteRecord action.");
      }
      const sheet = getOrCreateEnrolmentSheet();
      deleteRecordFromSheet(sheet, regId);
      return createSuccessResponse("Student record deleted from spreadsheet.");

    } else if (action === "bulkSync") {
      const sheet = getOrCreateEnrolmentSheet();
      const records = payload.records;
      if (!records || !Array.isArray(records)) {
        return createErrorResponse("No registry list records passed with bulkSync task.");
      }
      repopulateDatabaseRows(sheet, records);
      return createSuccessResponse("Sheet repopulated and formatted with " + records.length + " student records.");
      
    } else if (action === "getEmployees") {
      const emps = getEmployeesList();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", employees: emps }))
        .setMimeType(ContentService.MimeType.JSON);

    } else if (action === "addEmployee") {
      const emp = payload.employee;
      if (!emp) {
        return createErrorResponse("No employee items found under addEmployee action.");
      }
      const empSheet = getOrCreateEmployeesSheet();
      addOrUpdateEmployeeOnSheet(empSheet, emp);
      return createSuccessResponse("Employee synced successfully.");

    } else if (action === "deleteEmployee") {
      const empId = payload.employeeId;
      if (!empId) {
        return createErrorResponse("No employee ID specified for deleteEmployee action.");
      }
      const empSheet = getOrCreateEmployeesSheet();
      deleteEmployeeFromSheet(empSheet, empId);
      return createSuccessResponse("Employee profile deleted.");

    } else if (action === "bulkSyncEmployees") {
      const emps = payload.employees;
      if (!emps || !Array.isArray(emps)) {
        return createErrorResponse("No employees list present for bulkSyncEmployees.");
      }
      const empSheet = getOrCreateEmployeesSheet();
      if (empSheet.getLastRow() > 1) {
        empSheet.getRange(2, 1, empSheet.getLastRow() - 1, 5).clearContent();
      }
      if (emps.length > 0) {
        const rows = emps.map(mapEmployeeToRow);
        empSheet.getRange(2, 1, emps.length, 5).setValues(rows);
        for (let i = 0; i < emps.length; i++) {
          formatEmployeeRow(empSheet, 2 + i);
        }
      }
      return createSuccessResponse("Employees synced beautifully.");

    } else {
      return createErrorResponse("Unsupported action verb '" + action + "' parsed.");
    }
    
  } catch (err) {
    return createErrorResponse(err.toString());
  }
}

/**
 * FETCHES ALL TABLES AT ONCE FROM GOOGLE SHEET
 */
function getAllDatabaseTables() {
  const enrolments = getRecordsFromSheet("Enrolments", HEADERS, mapRowToRecord);
  const employees = getRecordsFromSheet("Employees", ["Employee ID", "Username", "Password", "Role", "Assigned Course"], mapRowToEmployee);
  const courses = getRecordsFromSheet("Courses", ["Course ID", "Name", "Category", "Base Fee", "Min Fee", "Instructor Name", "Class Room"], mapRowToCourse);
  const batches = getRecordsFromSheet("Batches", ["Batch ID", "Name", "Start Date", "End Date", "Morning Courses JSON", "Noon Courses JSON", "Evening Courses JSON"], mapRowToBatch);
  const hallBookings = getRecordsFromSheet("HallBookings", ["Booking ID", "Company Name", "Person Name", "Booking For", "Price", "Duration", "Event Type", "Seating Capacity", "Event Date", "Time Slot", "Venue Room", "Created At"], mapRowToBooking);
  const attendanceLogs = getRecordsFromSheet("AttendanceLogs", ["Log ID", "Course Name", "Batch ID", "Date", "Records JSON", "Created At"], mapRowToAttendance);
  const startups = getRecordsFromSheet("Startups", ["Startup ID", "Name", "Founder", "Desk Number", "Monthly Rent", "Joined Date"], mapRowToStartup);
  const inventory = getRecordsFromSheet("Inventory", ["Item ID", "Serial Number", "Name", "Custodian", "Status"], mapRowToInventory);

  return {
    enrolments: enrolments,
    employees: employees,
    courses: courses,
    batches: batches,
    hallBookings: hallBookings,
    attendanceLogs: attendanceLogs,
    startups: startups,
    inventory: inventory
  };
}

/**
 * OVERWRITES ALL TABLES AT ONCE FROM PUSH ALL SYSTEM BACKUP DUMP
 */
function syncAllDatabaseTables(payload) {
  if (payload.enrolments) {
    overwriteSheetData("Enrolments", HEADERS, payload.enrolments, mapRecordToRow, formatDataRow);
  }
  if (payload.employees) {
    overwriteSheetData("Employees", ["Employee ID", "Username", "Password", "Role", "Assigned Course"], payload.employees, mapEmployeeToRow, formatEmployeeRow);
  }
  if (payload.courses) {
    overwriteSheetData("Courses", ["Course ID", "Name", "Category", "Base Fee", "Min Fee", "Instructor Name", "Class Room"], payload.courses, mapCourseToRow, null);
  }
  if (payload.batches) {
    overwriteSheetData("Batches", ["Batch ID", "Name", "Start Date", "End Date", "Morning Courses JSON", "Noon Courses JSON", "Evening Courses JSON"], payload.batches, mapBatchToRow, null);
  }
  if (payload.hallBookings) {
    overwriteSheetData("HallBookings", ["Booking ID", "Company Name", "Person Name", "Booking For", "Price", "Duration", "Event Type", "Seating Capacity", "Event Date", "Time Slot", "Venue Room", "Created At"], payload.hallBookings, mapBookingToRow, null);
  }
  if (payload.attendanceLogs) {
    overwriteSheetData("AttendanceLogs", ["Log ID", "Course Name", "Batch ID", "Date", "Records JSON", "Created At"], payload.attendanceLogs, mapAttendanceToRow, null);
  }
  if (payload.startups) {
    overwriteSheetData("Startups", ["Startup ID", "Name", "Founder", "Desk Number", "Monthly Rent", "Joined Date"], payload.startups, mapStartupToRow, null);
  }
  if (payload.inventory) {
    overwriteSheetData("Inventory", ["Item ID", "Serial Number", "Name", "Custodian", "Status"], payload.inventory, mapInventoryToRow, null);
  }
}

/**
 * GENERAL HELPER TO EXTRACT DATA FROM ANY SHEET TAB
 */
function getRecordsFromSheet(sheetName, headers, rowMapper) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold")
               .setFontSize(10)
               .setFontFamily("Inter")
               .setBackground(THEME.headerBg)
               .setFontColor(THEME.headerText)
               .setHorizontalAlignment("center")
               .setVerticalAlignment("middle");
    sheet.setRowHeight(1, 35);
    sheet.setFrozenRows(1);
    autoFitColumns(sheet);
    return [];
  }
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return [];
  }
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values.map(rowMapper);
}

/**
 * GENERAL HELPER TO OVERWRITE ALL DATA FOR ANY DATASET
 */
function overwriteSheetData(sheetName, headers, items, itemSerializer, rowFormatter) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  // Clear entirely
  sheet.clear();
  
  // Append headers
  sheet.appendRow(headers);
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold")
             .setFontSize(10)
             .setFontFamily("Inter")
             .setBackground(THEME.headerBg)
             .setFontColor(THEME.headerText)
             .setHorizontalAlignment("center")
             .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 35);
  sheet.setFrozenRows(1);
  
  if (items && items.length > 0) {
    const matrix = items.map(itemSerializer);
    sheet.getRange(2, 1, items.length, headers.length).setValues(matrix);
    
    if (rowFormatter) {
      for (let i = 0; i < items.length; i++) {
        rowFormatter(sheet, 2 + i);
      }
    } else {
      for (let i = 0; i < items.length; i++) {
        const rowNum = 2 + i;
        const rowRange = sheet.getRange(rowNum, 1, 1, headers.length);
        rowRange.setFontFamily("Inter").setFontSize(9.5).setVerticalAlignment("middle");
        sheet.setRowHeight(rowNum, 26);
        if (rowNum % 2 === 0) {
          rowRange.setBackground(THEME.zebraLight);
        } else {
          rowRange.setBackground("#FFFFFF");
        }
        rowRange.setBorder(true, true, true, true, true, true, "#E2E8F0", SpreadsheetApp.BorderStyle.SOLID);
      }
    }
  }
  autoFitColumns(sheet);
}

/**
 * Appends or updates a student record.
 */
function addOrUpdateRecordOnSheet(sheet, record) {
  const lastRow = sheet.getLastRow();
  let existingRowIndex = -1;
  if (lastRow > 1) {
    const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < values.length; i++) {
      if (values[i][0].toString() === record.regId.toString()) {
        existingRowIndex = i + 2;
        break;
      }
    }
  }
  
  const rowData = mapRecordToRow(record);
  if (existingRowIndex > -1) {
    sheet.getRange(existingRowIndex, 1, 1, HEADERS.length).setValues([rowData]);
    formatDataRow(sheet, existingRowIndex);
  } else {
    sheet.appendRow(rowData);
    formatDataRow(sheet, sheet.getLastRow());
  }
  autoFitColumns(sheet);
}

/**
 * Deletes a student record by registration ID.
 */
function deleteRecordFromSheet(sheet, regId) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < values.length; i++) {
      if (values[i][0].toString() === regId.toString()) {
        sheet.deleteRow(i + 2);
        break;
      }
    }
  }
}

/**
 * Clears and populates students.
 */
function repopulateDatabaseRows(sheet, records) {
  overwriteSheetData("Enrolments", HEADERS, records, mapRecordToRow, formatDataRow);
}

/**
 * Map Student models to columns.
 */
function mapRecordToRow(record) {
  const aux = {
    city: record.city || "",
    dob: record.dob || "",
    milCategory: record.milCategory || "",
    milRank: record.milRank || "",
    milUnit: record.milUnit || "",
    milName: record.milName || "",
    milStation: record.milStation || "",
    milRelation: record.milRelation || "",
    createdByUsername: record.createdByUsername || "",
    createdByRole: record.createdByRole || "",
    paidAmount: record.paidAmount || 0,
    paymentHistory: record.paymentHistory || [],
    batchId: record.batchId || "",
    batchName: record.batchName || ""
  };
  return [
    record.regId || "",
    record.createdAtFormatted || (record.createdAt ? new Date(record.createdAt).toLocaleString("en-US") : ""),
    record.course || "",
    record.firstName || "",
    record.lastName || "",
    record.fatherName || "",
    record.cnic || "",
    record.mobile || "",
    record.email || "",
    record.address || "",
    record.gender || "",
    record.civilStatus || "",
    record.laptop || "No",
    record.paymentPlan || "Full",
    Number(record.baseFee) || 0,
    Number(record.discount) || 0,
    Number(record.laptopFee) || 0,
    Number(record.totalFee) || 0,
    record.nextDueDate || "N/A",
    record.status || "Pending",
    JSON.stringify(aux) // Column 21: Auxiliary Data JSON
  ];
}

function mapRowToRecord(row) {
  let record = {
    regId: String(row[0] || ""),
    createdAt: row[1] ? new Date(row[1]).getTime() : Date.now(),
    createdAtFormatted: String(row[1] || ""),
    course: String(row[2] || ""),
    firstName: String(row[3] || ""),
    lastName: String(row[4] || ""),
    fatherName: String(row[5] || ""),
    cnic: String(row[6] || ""),
    mobile: String(row[7] || ""),
    email: String(row[8] || ""),
    address: String(row[9] || ""),
    gender: String(row[10] || "Male"),
    civilStatus: String(row[11] || "Civil"),
    laptop: String(row[12] || "No"),
    paymentPlan: String(row[13] || "Full"),
    baseFee: Number(row[14]) || 0,
    discount: Number(row[15]) || 0,
    laptopFee: Number(row[16]) || 0,
    totalFee: Number(row[17]) || 0,
    nextDueDate: String(row[18] || "N/A"),
    status: String(row[19] || "Pending")
  };
  
  if (row[20]) {
    try {
      const aux = JSON.parse(row[20]);
      if (aux) {
        if (aux.city) record.city = aux.city;
        if (aux.dob) record.dob = aux.dob;
        if (aux.milCategory) record.milCategory = aux.milCategory;
        if (aux.milRank) record.milRank = aux.milRank;
        if (aux.milUnit) record.milUnit = aux.milUnit;
        if (aux.milName) record.milName = aux.milName;
        if (aux.milStation) record.milStation = aux.milStation;
        if (aux.milRelation) record.milRelation = aux.milRelation;
        if (aux.createdByUsername) record.createdByUsername = aux.createdByUsername;
        if (aux.createdByRole) record.createdByRole = aux.createdByRole;
        if (aux.paidAmount !== undefined) record.paidAmount = aux.paidAmount;
        if (aux.paymentHistory) record.paymentHistory = aux.paymentHistory;
        if (aux.batchId) record.batchId = aux.batchId;
        if (aux.batchName) record.batchName = aux.batchName;
      }
    } catch(e) {
      console.warn("Failed to parse auxiliary column:", e);
    }
  }
  return record;
}

/**
 * Fetch spreadsheet safely.
 */
function getActiveSheet() {
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (err) {
    return null;
  }
}

/**
 * Get or create student tab.
 */
function getOrCreateEnrolmentSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("No active Spreadsheet context found.");
  }
  let sheet = ss.getSheetByName("Enrolments");
  if (!sheet) {
    sheet = ss.insertSheet("Enrolments");
    initializeSheetHeaders(sheet);
  } else if (sheet.getLastRow() === 0) {
    initializeSheetHeaders(sheet);
  }
  return sheet;
}

function initializeSheetHeaders(sheet) {
  sheet.appendRow(HEADERS);
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setFontWeight("bold")
             .setFontSize(10)
             .setFontFamily("Inter")
             .setBackground(THEME.headerBg)
             .setFontColor(THEME.headerText)
             .setHorizontalAlignment("center")
             .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 35);
  sheet.setFrozenRows(1);
}

/**
 * Style data rows.
 */
function formatDataRow(sheet, rowNum) {
  const rowRange = sheet.getRange(rowNum, 1, 1, HEADERS.length);
  rowRange.setFontFamily("Inter")
          .setFontSize(9.5)
          .setVerticalAlignment("middle");
  sheet.setRowHeight(rowNum, 26);
  
  if (rowNum % 2 === 0) {
    rowRange.setBackground(THEME.zebraLight);
  } else {
    rowRange.setBackground("#FFFFFF");
  }
  
  const financialRange = sheet.getRange(rowNum, 15, 1, 4);
  financialRange.setNumberFormat("#,##0\" PKR\"")
                .setHorizontalAlignment("right")
                .setFontFamily("Courier New")
                .setFontWeight("bold");
                
  const centerCols = [1, 2, 7, 8, 11, 12, 13, 14, 19];
  centerCols.forEach(function(colIndex) {
    sheet.getRange(rowNum, colIndex).setHorizontalAlignment("center");
  });
  
  const statusCell = sheet.getRange(rowNum, 20);
  const statusVal = "" + statusCell.getValue();
  statusCell.setFontWeight("bold").setHorizontalAlignment("center");
  if (statusVal === "Enrolled" || statusVal === "Verified") {
    statusCell.setBackground(THEME.emeraldTint).setFontColor(THEME.emeraldText);
  } else if (statusVal === "Pending") {
    statusCell.setBackground(THEME.statusPendingBg).setFontColor(THEME.statusPendingText);
  } else {
    statusCell.setBackground("#E2E8F0").setFontColor("#334155");
  }
  rowRange.setBorder(true, true, true, true, true, true, "#E2E8F0", SpreadsheetApp.BorderStyle.SOLID);
}

/**
 * Employees sub-system sheet management.
 */
function getOrCreateEmployeesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Employees");
  if (!sheet) {
    sheet = ss.insertSheet("Employees");
    const headers = ["Employee ID", "Username", "Password", "Role", "Assigned Course"];
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold")
               .setFontSize(10)
               .setFontFamily("Inter")
               .setBackground(THEME.headerBg)
               .setFontColor(THEME.headerText)
               .setHorizontalAlignment("center")
               .setVerticalAlignment("middle");
    sheet.setRowHeight(1, 35);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function mapEmployeeToRow(emp) {
  return [
    emp.id || "",
    emp.username || "",
    emp.passwordInput || "",
    emp.role || "",
    emp.course || ""
  ];
}

function mapRowToEmployee(rowValues) {
  return {
    id: String(rowValues[0] || ""),
    username: String(rowValues[1] || ""),
    passwordInput: String(rowValues[2] || ""),
    role: String(rowValues[3] || ""),
    course: rowValues[4] ? String(rowValues[4]) : undefined
  };
}

function addOrUpdateEmployeeOnSheet(sheet, emp) {
  const lastRow = sheet.getLastRow();
  let existingRowIndex = -1;
  if (lastRow > 1) {
    const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < values.length; i++) {
      if (values[i][0].toString() === emp.id.toString()) {
        existingRowIndex = i + 2;
        break;
      }
    }
  }
  
  if (existingRowIndex > -1) {
    sheet.getRange(existingRowIndex, 1, 1, 5).setValues([mapEmployeeToRow(emp)]);
    formatEmployeeRow(sheet, existingRowIndex);
  } else {
    sheet.appendRow(mapEmployeeToRow(emp));
    formatEmployeeRow(sheet, sheet.getLastRow());
  }
}

function deleteEmployeeFromSheet(sheet, empId) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < values.length; i++) {
      if (values[i][0].toString() === empId.toString()) {
        sheet.deleteRow(i + 2);
        break;
      }
    }
  }
}

function formatEmployeeRow(sheet, rowNum) {
  const rowRange = sheet.getRange(rowNum, 1, 1, 5);
  rowRange.setFontFamily("Inter").setFontSize(9.5).setVerticalAlignment("middle");
  sheet.setRowHeight(rowNum, 26);
  if (rowNum % 2 === 0) {
    rowRange.setBackground(THEME.zebraLight);
  } else {
    rowRange.setBackground("#FFFFFF");
  }
  rowRange.setBorder(true, true, true, true, true, true, "#E2E8F0", SpreadsheetApp.BorderStyle.SOLID);
}

function getEmployeesList() {
  const sheet = getOrCreateEmployeesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return [];
  }
  const values = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  return values.map(mapRowToEmployee);
}

// Relational mappers for metadata sheets
function mapCourseToRow(c) {
  return [
    c.id || "",
    c.name || "",
    c.category || "Technical",
    Number(c.baseFee) || 0,
    Number(c.minFee) || 0,
    c.instructorName || "",
    c.classRoom || ""
  ];
}
function mapRowToCourse(row) {
  return {
    id: String(row[0] || ""),
    name: String(row[1] || ""),
    category: String(row[2] || "Technical"),
    baseFee: Number(row[3]) || 0,
    minFee: Number(row[4]) || 0,
    instructorName: String(row[5] || ""),
    classRoom: String(row[6] || "")
  };
}

function mapBatchToRow(b) {
  return [
    b.id || "",
    b.name || "",
    b.startDate || "",
    b.endDate || "",
    JSON.stringify(b.morningCourses || []),
    JSON.stringify(b.noonCourses || []),
    JSON.stringify(b.eveningCourses || [])
  ];
}
function mapRowToBatch(row) {
  let morning = [];
  let noon = [];
  let evening = [];
  try { morning = JSON.parse(row[4] || "[]"); } catch(e) {}
  try { noon = JSON.parse(row[5] || "[]"); } catch(e) {}
  try { evening = JSON.parse(row[6] || "[]"); } catch(e) {}
  return {
    id: String(row[0] || ""),
    name: String(row[1] || ""),
    startDate: String(row[2] || ""),
    endDate: String(row[3] || ""),
    morningCourses: morning,
    noonCourses: noon,
    eveningCourses: evening
  };
}

function mapBookingToRow(hb) {
  return [
    hb.id || "",
    hb.companyName || "",
    hb.personName || "",
    hb.bookingFor || "Seminar Hall",
    Number(hb.price) || 0,
    hb.duration || "",
    hb.eventType || "",
    Number(hb.seatingCapacity) || 0,
    hb.eventDate || "",
    hb.timeSlot || "",
    hb.venueRoom || "",
    hb.createdAt || ""
  ];
}
function mapRowToBooking(row) {
  return {
    id: String(row[0] || ""),
    companyName: String(row[1] || ""),
    personName: String(row[2] || ""),
    bookingFor: String(row[3] || "Seminar Hall"),
    price: Number(row[4]) || 0,
    duration: String(row[5] || ""),
    eventType: String(row[6] || ""),
    seatingCapacity: Number(row[7]) || 0,
    eventDate: String(row[8] || ""),
    timeSlot: String(row[9] || ""),
    venueRoom: String(row[10] || ""),
    createdAt: String(row[11] || "")
  };
}

function mapAttendanceToRow(log) {
  return [
    log.id || "",
    log.courseName || "",
    log.batchId || "",
    log.date || "",
    JSON.stringify(log.records || {}),
    log.createdAt || ""
  ];
}
function mapRowToAttendance(row) {
  let recs = {};
  try { recs = JSON.parse(row[4] || "{}"); } catch(e) {}
  return {
    id: String(row[0] || ""),
    courseName: String(row[1] || ""),
    batchId: String(row[2] || ""),
    date: String(row[3] || ""),
    records: recs,
    createdAt: String(row[5] || "")
  };
}

function mapStartupToRow(s) {
  return [
    s.id || "",
    s.name || "",
    s.founder || "",
    s.deskNumber || "",
    Number(s.monthlyRent) || 0,
    s.joinedDate || ""
  ];
}
function mapRowToStartup(row) {
  return {
    id: String(row[0] || ""),
    name: String(row[1] || ""),
    founder: String(row[2] || ""),
    deskNumber: String(row[3] || ""),
    monthlyRent: Number(row[4]) || 0,
    joinedDate: String(row[5] || "")
  };
}

function mapInventoryToRow(item) {
  return [
    item.id || "",
    item.serial || "",
    item.name || "",
    item.custodian || "",
    item.status || "Available"
  ];
}
function mapRowToInventory(row) {
  return {
    id: String(row[0] || ""),
    serial: String(row[1] || ""),
    name: String(row[2] || ""),
    custodian: String(row[3] || ""),
    status: String(row[4] || "Available")
  };
}

function autoFitColumns(sheet) {
  const colCount = sheet.getLastColumn();
  if (colCount > 0) {
    sheet.autoResizeColumns(1, colCount);
    for (let c = 1; c <= colCount; c++) {
      const currentWidth = sheet.getColumnWidth(c);
      sheet.setColumnWidth(c, Math.max(currentWidth + 15, 80));
    }
  }
}

function createSuccessResponse(msg) {
  const response = { status: "success", message: msg, timestamp: new Date().toISOString() };
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function createErrorResponse(errorDesc) {
  const response = { status: "error", error: errorDesc, timestamp: new Date().toISOString() };
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}
