/**
 * Google Sheets Dashboard Sync Configuration
 * 
 * Edit this file directly in AI Studio to connect your Google Sheet permanently.
 * No login popups or OAuth setup is needed if using Google Apps Script!
 * 
 * Simply update the values in under SHEETS_CONFIG below.
 */

export const SHEETS_CONFIG = {
  // 1. YOUR GOOGLE SPREADSHEET ID
  // Paste your physical Google Spreadsheet ID below.
  // It is the long code found in your browser URL bar between "/d/" and "/edit":
  // e.g. "1vm0QcEvXniTJhLZEhegemqncddZgaExsyP6ONlJKyK8"
  spreadsheetId: '1vm0QcEvXniTJhLZEhegemqncddZgaExsyP6ONlJKyK8',

  // 2. YOUR GOOGLE APPS SCRIPT WEB APP URL (Deploy Link)
  // Paste your deployed "/exec" URL here:
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbwUrDnuL5XfaRfB6pd-tw2xGyFnjPDzQxr_yPV41f2xcsyu25VLfl9qG1MdVO1KSAjwww/exec',

  // 3. YOUR GOOGLE SHEET TAB NAMES (Case-Sensitive)
  // If your sheets have custom names, change them here:
  tabs: {
    mrf: 'MRF',
    candidates: 'Candidates',
    interviews: 'Interviews',
    check: 'Check'
  }
};

/**
 * =========================================================================
 *             ULTIMATE GOOGLE APPS SCRIPT CODE (Paste in Google Sheets)
 * =========================================================================
 * 
 * To set up custom sync that connects fast without CORS or OAuth restrictions:
 * 
 * 1. Open your Google Spreadsheet.
 * 2. Go to: Extensions -> Apps Script.
 * 3. Delete any default code, and paste the code below:
 * 
 * -------------------------------------------------------------------------
 * 
 * function doGet(e) {
 *   // 1. Default Spreadsheet ID
 *   var defaultSpreadsheetId = "1vm0QcEvXniTJhLZEhegemqncddZgaExsyP6ONlJKyK8"; 
 *   var spreadsheetId = defaultSpreadsheetId;
 *   
 *   // Allow overriding via query parameters if passed from web app
 *   if (e && e.parameter && e.parameter.spreadsheetId) {
 *     spreadsheetId = e.parameter.spreadsheetId;
 *   }
 *   
 *   // 2. Get expected tab names
 *   var tabMRF = (e && e.parameter && e.parameter.tabMRF) || "MRF";
 *   var tabCandidates = (e && e.parameter && e.parameter.tabCandidates) || "Candidates";
 *   var tabInterviews = (e && e.parameter && e.parameter.tabInterviews) || "Interviews";
 *   var tabCheck = (e && e.parameter && e.parameter.tabCheck) || "Check";
 *   
 *   var ss;
 *   try {
 *     ss = SpreadsheetApp.openById(spreadsheetId);
 *   } catch (err) {
 *     return ContentService.createTextOutput(JSON.stringify({ 
 *       error: "Could not open spreadsheet ID '" + spreadsheetId + "'. Please ensure: (1) Anyone with the link is set as 'Viewer' on the Google Sheet. (2) You deployed the Apps Script as 'Web App', executing as 'Me', with access set to 'Anyone'."
 *     })).setMimeType(ContentService.MimeType.JSON);
 *   }
 *   
 *   // Case-insensitive tab resolver helper
 *   var getSheetValues = function(expectedName) {
 *     var sheet = ss.getSheetByName(expectedName);
 *     if (!sheet) {
 *       // Look for case-insensitive match
 *       var allSheets = ss.getSheets();
 *       for (var i = 0; i < allSheets.length; i++) {
 *         if (allSheets[i].getName().toLowerCase() === expectedName.toLowerCase()) {
 *           sheet = allSheets[i];
 *           break;
 *         }
 *       }
 *     }
 *     if (!sheet) return [];
 *     var range = sheet.getDataRange();
 *     if (!range) return [];
 *     return range.getValues();
 *   };
 *   
 *   // Compile synchronized response
 *   var data = {
 *     MRF: getSheetValues(tabMRF),
 *     Candidates: getSheetValues(tabCandidates),
 *     Interviews: getSheetValues(tabInterviews),
 *     check: getSheetValues(tabCheck),
 *     syncedAt: new Date().toISOString()
 *   };
 *   
 *   // Return JSON payload with CORS-enabled headers for direct browser fetch
 *   return ContentService.createTextOutput(JSON.stringify(data))
 *     .setMimeType(ContentService.MimeType.JSON);
 * }
 * 
 * -------------------------------------------------------------------------
 * 
 * 4. Click the "Save" disk icon.
 * 5. Click "Deploy" button (top right) -> "New Deployment".
 * 6. Click the gear icon and select "Web App".
 * 7. Set:
 *    - Description: "HR Dashboard Sync API"
 *    - Execute As: "Me (your-email@gmail.com)"
 *    - Who has access: "Anyone"   <--- (CRITICAL: Do not select "Only myself")
 * 8. Click "Deploy". Give permissions to access Google Sheets.
 * 9. Copy the generated "Web App URL" (it ends in "/exec").
 * 10. Paste that Web App URL in your settings menu or appsScriptUrl config!
 */
