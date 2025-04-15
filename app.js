const express = require("express");
const cors = require("cors");
const treeRoutes = require("./Routes/treeRoutes");
const authRoutes = require("./Routes/authRoutes");
const sponsorRoutes = require("./Routes/sponsorRoutes");
const commissionsRoutes = require("./Routes/commissionRoutes");
const epinRoutes = require("./Routes/epinRoutes");
const epinHistoryRoutes = require("./Routes/epinHistoryRoutes"); // ✅ Correct import
const rewardRoutes = require("./Routes/rewardRoutes"); // ✅ Correct import
const upgradeRoutes = require("./Routes/upgradeRoutes")
const ProfileRoutes = require("./Routes/profileRoutes")
const payoutRoutes = require("./Routes/payoutRoutes")

const app = express();
const path = require('path');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.use("/api/auth", authRoutes);
app.use("/api", treeRoutes);
app.use("/api/users", sponsorRoutes);
app.use("/api/commissions", commissionsRoutes);
app.use("/api/epins", epinRoutes);
app.use("/api/epins", epinHistoryRoutes); // ✅ Correct usage
app.use("/api/rewards", rewardRoutes);
app.use("/api/upgrade", upgradeRoutes);
app.use("/api/profile", ProfileRoutes); // this is my file for the bankdetails
app.use("/api/payout", payoutRoutes); // this is my file for the bankdetails

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

