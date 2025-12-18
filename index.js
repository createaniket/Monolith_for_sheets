const express = require("express");
const dotenv = require("dotenv");


// ✅ Load env BEFORE importing routes
dotenv.config();



const mergeRoutes = require("./src/routes/mergeRoutes.js");

const app = express();
const PORT = process.env.PORT || 5000;


app.use(express.json());
app.use("/api", mergeRoutes);


app.use((req, res, next) => {
  console.log("🔥 HIT:", req.method, req.originalUrl);
  next();
});


app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
