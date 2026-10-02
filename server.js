const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("AURIX Backend is running 🚀");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    project: "AURIX"
  });
});

app.listen(PORT, () => {
  console.log(`AURIX Backend running on port ${PORT}`);
});
