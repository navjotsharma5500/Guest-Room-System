import HostelData from "../models/HostelData.js";

export const getDashboardStats = async (req, res) => {
  try {
    const doc = await HostelData.findById("hosteldata");

    if (!doc) return res.json({ total: 0, occupied: 0 });

    const data = doc.data;

    let total = 0;
    let occupied = 0;

    Object.values(data).forEach(hostel => {
      hostel.rooms.forEach(room => {
        total++;
        if (room.bookings.length > 0) occupied++;
      });
    });

    res.json({ total, occupied, available: total - occupied });

  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Dashboard failed" });
  }
};
