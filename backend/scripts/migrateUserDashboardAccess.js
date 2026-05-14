import mongoose from "mongoose";
import "dotenv/config";
import User from "../models/User.js";
import { getFallbackDashboardAccess } from "../utils/dashboardAccess.js";

const run = async () => {
  await mongoose.connect(process.env.MONGO_URL);

  const users = await User.find({});

  for (const user of users) {
    const fallback = getFallbackDashboardAccess(user);
    user.isActive = user.isActive ?? true;
    user.dashboardAccess = {
      dashboards:
        user.dashboardAccess?.dashboards?.length > 0
          ? user.dashboardAccess.dashboards
          : fallback.dashboards,
      defaultDashboard:
        user.dashboardAccess?.defaultDashboard ?? fallback.defaultDashboard,
      skipSelectorWhenSingle:
        user.dashboardAccess?.skipSelectorWhenSingle ?? true,
    };
    await user.save();
  }

  await mongoose.disconnect();
  console.log("✅ User dashboard access migration completed");
};

run().catch((error) => {
  console.error("❌ User dashboard access migration failed:", error);
  process.exit(1);
});
