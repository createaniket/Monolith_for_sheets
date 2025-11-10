// const express = require("express");
// const multer = require("multer");
// const XLSX = require("xlsx");
// const fs = require("fs");
// const path = require("path");

// const router = express.Router();

// // Multer setup
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const uploadDir = "uploads/";
//     if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
//     cb(null, uploadDir);
//   },
//   filename: (req, file, cb) => {
//     cb(null, `${Date.now()}-${file.originalname}`);
//   },
// });
// const upload = multer({ storage });

// // Helper: Identify Platform from filename
// function detectPlatform(filename) {
//   const lower = filename.toLowerCase();
//   if (lower.includes("amazon")) return "Amazon";
//   if (lower.includes("flipkart")) return "Flipkart";
//   if (lower.includes("shopify")) return "Shopify";
//   return "Unknown";
// }

// // Helper: Map different columns to a unified format
// function normalizeRow(row, platform) {
//   switch (platform) {
//     case "Flipkart":
//       return {
//         Platform: "Flipkart",
//         orderID: row["Order ID"],
//         OrderDate: row["Order Date"],
//         ProductName: row["Product Title/Description"],
//         Quantity: row["Item Quantity"],
//         netAmount:
//           (parseFloat(row["Price before discount"]) || 0) -
//           (parseFloat(row["Total discount"]) || 0),
//         PaymentMethod: row["Order Type"], // Postpaid / Prepaid
//       };

//     case "Amazon":
//       return {
//         Platform: "Amazon",
//         orderID: row["order-id"],
//         OrderDate: row["purchase-date"],
//         ProductName: row["product-name"],
//         Quantity: row["quantity-purchased"],
//         netAmount: row["item-price"], // or any other amount column
//         PaymentMethod:
//           row["payment-method"] && row["payment-method"].trim() !== ""
//             ? row["payment-method"]
//             : "COD",
//       };

//     case "Shopify":
//       return {
//         Platform: "Shopify",
//         orderID: row["Name"],
//         OrderDate: row["Created at"],
//         ProductName: row["Lineitem name"],
//         Quantity: row["Lineitem quantity"],
//         netAmount: row["Lineitem price"],
//         PaymentMethod: row["Financial Status"],
//       };

//     default:
//       return null;
//   }
// }

// // Route: POST /merge-sheets
// router.post("/merge-sheets", upload.array("files", 3), (req, res) => {
//   try {
//     let mergedData = [];

//     req.files.forEach((file) => {
//       const platform = detectPlatform(file.originalname);
//       const workbook = XLSX.readFile(file.path);
//       const sheetName = workbook.SheetNames[0];
//       const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

//       // Normalize all rows for this platform
//       const formatted = sheetData
//         .map((row) => normalizeRow(row, platform))
//         .filter(Boolean);

//       mergedData.push(...formatted);

//       // Delete temp upload
//       fs.unlinkSync(file.path);
//     });

//     // Write merged data to Excel
//     const newWorkbook = XLSX.utils.book_new();
//     const newSheet = XLSX.utils.json_to_sheet(mergedData);
//     XLSX.utils.book_append_sheet(newWorkbook, newSheet, "MasterSheet");

//     const outputFile = path.join("uploads", "master_sheet.xlsx");
//     XLSX.writeFile(newWorkbook, outputFile);

//     // Return file to client
//     res.download(outputFile, "master_sheet.xlsx", (err) => {
//       if (err) console.error("Download error:", err);
//       // Optional cleanup:
//       // fs.unlinkSync(outputFile);
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Error merging sheets", error });
//   }
// });

// module.exports = router;




const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Helper: Identify Platform from filename
function detectPlatform(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes("amazon")) return "Amazon";
  if (lower.includes("flipkart")) return "Flipkart";
  if (lower.includes("shopify")) return "Shopify";
  if (lower.includes("zepto")) return "Zepto";
  if (lower.includes("blinkit")) return "Blinkit";
  if (lower.includes("instamart")) return "Instamart";
  return "Unknown";
}

// Helper: Map different columns to a unified format
function normalizeRow(row, platform) {
  switch (platform) {
    case "Flipkart":
      return {
        Platform: "Flipkart",
        orderID: row["Order ID"],
        OrderDate: row["Order Date"],
        ProductName: row["Product Title/Description"],
        Quantity: row["Item Quantity"],
        netAmount:
          (parseFloat(row["Price before discount"]) || 0) -
          (parseFloat(row["Total discount"]) || 0),
        PaymentMethod: row["Order Type"], // Postpaid / Prepaid
      };

    case "Amazon":
      return {
        Platform: "Amazon",
        orderID: row["order-id"],
        OrderDate: row["purchase-date"],
        ProductName: row["product-name"],
        Quantity: row["quantity-purchased"],
        netAmount: row["item-price"],
        PaymentMethod:
          row["payment-method"] && row["payment-method"].trim() !== ""
            ? row["payment-method"]
            : "COD",
      };

    case "Shopify":
      return {
        Platform: "Shopify",
        orderID: row["Name"],
        OrderDate: row["Created at"],
        ProductName: row["Lineitem name"],
        Quantity: row["Lineitem quantity"],
        netAmount: row["Lineitem price"],
        PaymentMethod: row["Financial Status"],
      };

    case "Zepto":
      return {
        Platform: "Zepto",
        orderID: row["SKU Number"],
        OrderDate: row["Date"],
        ProductName: row["SKU Name"],
        Quantity: row["Sales (Qty) - Units"],
        netAmount: row["Gross Merchandise Value"],
        PaymentMethod: row["Financial Status"],
      };

    case "Blinkit":
      return {
        Platform: "Blinkit",
        orderID: row["item_id"],
        OrderDate: row["date"],
        ProductName: row["item_name"],
        Quantity: row["qty_sold"],
        netAmount: row["mrp"],
        PaymentMethod: row["Financial Status"],
      };

    case "Instamart":
      return {
        Platform: "Instamart",
        orderID: row["ITEM_CODE"],
        OrderDate: row["ORDERED_DATE"],
        ProductName: row["PRODUCT_NAME"],
        Quantity: row["UNITS_SOLD"],
        netAmount: row["GMV"],
        PaymentMethod: row["Financial Status"],
      };

    default:
      return null;
  }
}

// Route: POST /merge-sheets
router.post("/merge-sheets", upload.array("files", 6), (req, res) => {
  try {
    let mergedData = [];

    req.files.forEach((file) => {
      const platform = detectPlatform(file.originalname);
      const workbook = XLSX.readFile(file.path);
      const sheetName = workbook.SheetNames[0];
      const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      // Normalize all rows for this platform
      const formatted = sheetData
        .map((row) => normalizeRow(row, platform))
        .filter(Boolean);

      mergedData.push(...formatted);

      // Delete temp upload
      fs.unlinkSync(file.path);
    });

    // Write merged data to Excel
    const newWorkbook = XLSX.utils.book_new();
    const newSheet = XLSX.utils.json_to_sheet(mergedData);
    XLSX.utils.book_append_sheet(newWorkbook, newSheet, "MasterSheet");

    const outputFile = path.join("uploads", "master_sheet.xlsx");
    XLSX.writeFile(newWorkbook, outputFile);

    // Return file to client
    res.download(outputFile, "master_sheet.xlsx", (err) => {
      if (err) console.error("Download error:", err);
      // Optional cleanup:
      // fs.unlinkSync(outputFile);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error merging sheets", error });
  }
});

module.exports = router;
