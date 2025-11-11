const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


console.log("🌐 Cloudinary Configured:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// -----------------------------
// Multer setup
// -----------------------------
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

// -----------------------------
// Detect platform from filename
// -----------------------------
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

// -----------------------------
// Improved Date Normalization
// -----------------------------
function normalizeDate(dateStr) {
  if (!dateStr) return "";

  // Excel numeric date (Blinkit or Shopify exports)
  if (!isNaN(dateStr) && Number(dateStr) > 40000) {
    const excelEpoch = new Date(1899, 11, 30);
    const days = Number(dateStr);
    const result = new Date(excelEpoch.getTime() + days * 86400000);
    return result.toISOString().split("T")[0]; // YYYY-MM-DD
  }

  dateStr = String(dateStr).trim();

  // 🟦 ISO / Shopify / Amazon: 2025-10-31T18:19:29+00:00  OR 2025-11-03 23:57:04 +0530
  if (dateStr.includes("T") || dateStr.includes("+")) {
    const date = new Date(dateStr);
    if (!isNaN(date)) return date.toISOString().split("T")[0];
  }

  // 🟩 Flipkart: 2025-10-28 00:00:00
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.split(" ")[0];
  }

  // 🟨 Zepto / Blinkit / Instamart: 27/10/25 or 27/10/2025
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split("/");
    const fullYear = y.length === 2 ? `20${y}` : y;
    const date = new Date(`${fullYear}-${m}-${d}`);
    if (!isNaN(date)) return date.toISOString().split("T")[0];
  }

  // 🟥 Instamart edge case: 17-10-25
  if (/^\d{1,2}-\d{1,2}-\d{2,4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split("-");
    const fullYear = y.length === 2 ? `20${y}` : y;
    const date = new Date(`${fullYear}-${m}-${d}`);
    if (!isNaN(date)) return date.toISOString().split("T")[0];
  }

  return dateStr;
}

// -----------------------------
// Clean and normalize Excel headers
// -----------------------------
function cleanKeys(row) {
  const cleaned = {};
  for (let key in row) {
    if (Object.hasOwn(row, key)) {
      const newKey = key.trim().replace(/\s+/g, " ").toLowerCase();
      cleaned[newKey] = row[key];
    }
  }
  return cleaned;
}

// -----------------------------
// Normalize Row Function
// -----------------------------
function normalizeRow(row, platform) {
  switch (platform) {
    // ✅ Flipkart
    case "Flipkart":
      return {
        Platform: "Flipkart",
        orderID: row["order id"],
        OrderDate: normalizeDate(row["order date"]),
        ProductName: row["product title/description"],
        Quantity: row["item quantity"],
        netAmount:
          (parseFloat(row["price before discount"]) || 0) -
          (parseFloat(row["total discount"]) || 0),
        PaymentMethod: row["order type"],
      };

    // ✅ Amazon
    case "Amazon":
      return {
        Platform: "Amazon",
        orderID: row["amazon-order-id"],
        OrderDate: normalizeDate(row["purchase-date"]),
        ProductName: row["product-name"],
        Quantity: row["quantity-purchased"],
        netAmount: parseFloat(row["item-price"]) || 0,
        PaymentMethod: row["payment-method"] || "COD",
      };

    // ✅ Shopify
    case "Shopify":
      return {
        Platform: "Shopify",
        orderID: row["name"],
        OrderDate: normalizeDate(row["created at"]),
        ProductName: row["lineitem name"],
        Quantity: row["lineitem quantity"],
        netAmount: parseFloat(row["lineitem price"]) || 0,
        PaymentMethod: row["financial status"],
      };

    // ✅ Zepto
    case "Zepto":
      return {
        Platform: "Zepto",
        orderID: row["sku number"],
        OrderDate: normalizeDate(row["date"]),
        ProductName: row["sku name"],
        Quantity: row["sales (qty) - units"],
        netAmount: parseFloat(row["gross merchandise value"]) || 0,
        PaymentMethod: "Online",
      };

    // ✅ Blinkit
    case "Blinkit":
      return {
        Platform: "Blinkit",
        orderID: row["item_id"],
        OrderDate: normalizeDate(row["date"]),
        ProductName: row["item_name"],
        Quantity: row["qty_sold"],
        netAmount: parseFloat(row["mrp"]) || 0,
        PaymentMethod: "Online",
      };

    // ✅ Instamart
    case "Instamart":
      return {
        Platform: "Instamart",
        orderID: row["item_code"],
        OrderDate: normalizeDate(row["ordered_date"]),
        ProductName: row["product_name"],
        Quantity: row["units_sold"],
        netAmount: parseFloat(row["gmv"]) || 0,
        PaymentMethod: "Online",
      };

    default:
      return null;
  }
}

// // -----------------------------
// // Route: POST /merge-sheets
// // -----------------------------
// router.post("/merge-sheets", upload.array("files", 10), (req, res) => {
//   try {
//     let mergedData = [];

//     req.files.forEach((file) => {
//       const platform = detectPlatform(file.originalname);
//       const workbook = XLSX.readFile(file.path);
//       const sheetName = workbook.SheetNames[0];
//       const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

//       if (!sheetData.length) {
//         console.warn(`⚠️ No data in ${file.originalname}`);
//         return;
//       }

//       const formatted = sheetData
//         .map((row) => {
//           const cleanRow = cleanKeys(row);
//           return normalizeRow(cleanRow, platform);
//         })
//         .filter(Boolean);

//       mergedData.push(...formatted);
//       fs.unlinkSync(file.path);
//       console.log(`✅ Processed ${file.originalname} (${platform})`);
//     });

//     if (!mergedData.length) {
//       return res.status(400).json({ message: "No valid data found in uploaded files" });
//     }

//     const newWorkbook = XLSX.utils.book_new();
//     const newSheet = XLSX.utils.json_to_sheet(mergedData);
//     XLSX.utils.book_append_sheet(newWorkbook, newSheet, "MasterSheet");

//     const timestamp = Date.now();
//     const outputFile = path.join("uploads", `master_sheet_${timestamp}.xlsx`);
//     XLSX.writeFile(newWorkbook, outputFile);

//     // Respond with file name so it can be downloaded later
//     res.json({ message: "Merged successfully", file: `master_sheet_${timestamp}.xlsx` });
//   } catch (error) {
//     console.error("❌ Error merging sheets:", error);
//     res.status(500).json({ message: "Error merging sheets", error });
//   }
// });

// // -----------------------------
// // Route: GET /download/:filename
// // -----------------------------
// router.get("/download/:filename", (req, res) => {
//   const filePath = path.join("uploads", req.params.filename);
//   if (!fs.existsSync(filePath)) {
//     return res.status(404).json({ message: "File not found" });
//   }
//   res.download(filePath, req.params.filename, (err) => {
//     if (err) console.error("❌ Download error:", err);
//   });
// });





// -----------------------------
// Route: POST /merge-sheets (with Cloudinary upload)
// -----------------------------
router.post("/merge-sheets", upload.array("files", 10), async (req, res) => {
  try {
    let mergedData = [];

    for (const file of req.files) {
      const platform = detectPlatform(file.originalname);
      const workbook = XLSX.readFile(file.path);
      const sheetName = workbook.SheetNames[0];
      const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      if (!sheetData.length) {
        console.warn(`⚠️ No data in ${file.originalname}`);
        continue;
      }

      const formatted = sheetData
        .map((row) => {
          const cleanRow = cleanKeys(row);
          return normalizeRow(cleanRow, platform);
        })
        .filter(Boolean);

      mergedData.push(...formatted);
      fs.unlinkSync(file.path); // delete uploaded input file
      console.log(`✅ Processed ${file.originalname} (${platform})`);
    }

    if (!mergedData.length) {
      return res.status(400).json({ message: "No valid data found in uploaded files" });
    }

    const newWorkbook = XLSX.utils.book_new();
    const newSheet = XLSX.utils.json_to_sheet(mergedData);
    XLSX.utils.book_append_sheet(newWorkbook, newSheet, "MasterSheet");

    const timestamp = Date.now();
    const outputFile = path.join("uploads", `master_sheet_${timestamp}.xlsx`);
    XLSX.writeFile(newWorkbook, outputFile);

    // 🟩 Upload merged file to Cloudinary
    const result = await cloudinary.uploader.upload(outputFile, {
      resource_type: "raw", // since it's an .xlsx file
      folder: "merged-sheets",
      public_id: `master_sheet_${timestamp}`,
    });

    // Delete local file after upload
    fs.unlinkSync(outputFile);

    // Respond with Cloudinary URL
    res.json({
      message: "Merged and uploaded successfully",
      cloudinaryUrl: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error("❌ Error merging/uploading sheets:", error);
    res.status(500).json({ message: "Error merging/uploading sheets", error });
  }
});

module.exports = router;
