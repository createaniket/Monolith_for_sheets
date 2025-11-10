
const express = require("express");
const mergeRoutes = require("./src/routes/mergeRoutes.js");

const app = express();
const PORT = 5000;

app.use(express.json());
app.use("/api", mergeRoutes);

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
