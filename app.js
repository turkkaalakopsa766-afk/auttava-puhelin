
import express from "express";
const app = express();
app.get("/", (req, res) => res.send("AI Voice MVP Server Running"));
app.listen(process.env.PORT || 3000, () => console.log("Server started."));
