const express = require("express");
const cors = require("cors");
const treeRoutes = require("./Routes/treeRoutes");
const authRoutes = require("./Routes/authRoutes");
const sponsorRoutes = require("./Routes/sponsorRoutes");
const commissionsRoutes = require("./Routes/commissionRoutes");
const epinRoutes = require("./Routes/epinRoutes");
const epinHistoryRoutes = require("./Routes/epinHistoryRoutes"); 
const rewardRoutes = require("./Routes/rewardRoutes"); 
const upgradeRoutes = require("./Routes/upgradeRoutes")
const ProfileRoutes = require("./Routes/profileRoutes")
const payoutRoutes = require("./Routes/payoutRoutes")
const userRoutes = require("./Routes/userRoutes")
const passwordRoutes = require("./Routes/pswrdRoutes")
const db = require('./Config/db'); 
const app = express();
const path = require('path');

const multer = require("multer");
const fs = require("fs");
const uploadsDir = path.join(__dirname, "uploads/profiles");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + "-" + file.fieldname + ext;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// ✅ Serve static images from /uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));
app.use(
  "/uploads/profiles",
  express.static(path.join(__dirname, "uploads", "profiles"))
);

app.use("/api/auth", authRoutes);
app.use("/api", treeRoutes);
app.use("/api/users", sponsorRoutes);
app.use("/api/commissions", commissionsRoutes);
app.use("/api/epins", epinRoutes);
app.use("/api/epins-history", epinHistoryRoutes); 
app.use("/api/rewards", rewardRoutes);
app.use("/api/upgrade", upgradeRoutes);
app.use("/api/profile", ProfileRoutes); 
app.use("/api/payout", payoutRoutes); 
app.use("/api/plan", userRoutes);
app.use("/api/pswrd", passwordRoutes);
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});


const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

