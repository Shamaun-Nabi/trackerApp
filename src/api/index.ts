import express from "express";
import mongoose from "mongoose";
import { TaskModel, TimeEntryModel } from "../../models.ts";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI;

// --- MONGODB SERVERLESS CONNECTION ---
let isConnected = false;

async function connectToDatabase() {
  if (isConnected) return;
  try {
    if (!MONGODB_URI) throw new Error("MONGODB_URI is missing");
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ DB Connection Error:", err);
    throw err;
  }
}

app.use(async (req, res, next) => {
  await connectToDatabase();
  next();
});

// --- API ROUTES ---

// 1. Get All Tasks
app.get("/api/tasks", async (req, res) => {
  const page = req.query.page ? parseInt(req.query.page as string) : null;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : null;
  const search = (req.query.search as string) || "";
  const skip = page && limit ? (page - 1) * limit : 0;

  try {
    const query: any = {};
    if (search) {
      query.$or = [{ name: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }];
    }
    const total = await TaskModel.countDocuments(query);
    const pipeline: any[] = [
      { $match: query },
      { $lookup: { from: "timeentries", localField: "_id", foreignField: "taskId", as: "entries" } },
      { $project: { name: 1, loe: 1, description: 1, createdAt: 1, totalBillable: { $sum: "$entries.billable" }, totalNonBillable: { $sum: "$entries.nonBillable" } } },
      { $sort: { createdAt: -1 } },
    ];
    if (page && limit) {
      pipeline.push({ $skip: skip }, { $limit: limit });
    }
    const tasks = await TaskModel.aggregate(pipeline);
    res.json(page && limit ? { tasks, total, page, limit } : tasks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// 2. Create Task
app.post("/api/tasks", async (req, res) => {
  try {
    const task = new TaskModel(req.body);
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: "Failed to create task" });
  }
});

// 3. Get Single Task
app.get("/api/tasks/:id", async (req, res) => {
  try {
    const task = await TaskModel.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

// 4. Update Task
app.put("/api/tasks/:id", async (req, res) => {
  try {
    const task = await TaskModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: "Failed to update task" });
  }
});

// 5. Delete Task
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    await TaskModel.findByIdAndDelete(req.params.id);
    await TimeEntryModel.deleteMany({ taskId: req.params.id });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// 6. Get Time Entries for Task
app.get("/api/tasks/:id/entries", async (req, res) => {
  const page = req.query.page ? parseInt(req.query.page as string) : null;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : null;
  const skip = page && limit ? (page - 1) * limit : 0;
  try {
    const total = await TimeEntryModel.countDocuments({ taskId: req.params.id });
    let queryBuilder = TimeEntryModel.find({ taskId: req.params.id }).sort({ date: -1 });
    if (page && limit) {
      queryBuilder = queryBuilder.skip(skip).limit(limit);
    }
    const entries = await queryBuilder;
    res.json(page && limit ? { entries, total, page, limit } : entries);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

// 7. Add Time Entry
app.post("/api/tasks/:id/entries", async (req, res) => {
  try {
    const entry = new TimeEntryModel({ ...req.body, taskId: req.params.id });
    await entry.save();
    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ error: "Failed to create entry" });
  }
});

// 8. Delete Time Entry
app.delete("/api/entries/:id", async (req, res) => {
  try {
    await TimeEntryModel.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

// --- ADDED BACK: Update Time Entry ---
app.put("/api/entries/:id", async (req, res) => {
  try {
    const entry = await TimeEntryModel.findByIdAndUpdate(req.params.id, { ...req.body }, { new: true });
    res.json(entry);
  } catch (err) {
    res.status(400).json({ error: "Failed to update entry" });
  }
});

// --- ADDED BACK: Monthly Report ---
app.get("/api/reports/monthly", async (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: "Month is required" });
  try {
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    const entries = await TimeEntryModel.find({
      date: { $gte: startDate, $lt: endDate },
    }).populate("taskId");
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

// 9. Report Summary
app.get("/api/reports/summary", async (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: "Month is required" });
  try {
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    const summary = await TaskModel.aggregate([
      { $lookup: { from: "timeentries", localField: "_id", foreignField: "taskId", as: "allEntries" } },
      { $addFields: { monthlyEntries: { $filter: { input: "$allEntries", as: "entry", cond: { $and: [{ $gte: ["$$entry.date", startDate] }, { $lt: ["$$entry.date", endDate] }] } } } } },
      {
        $project: {
          name: 1,
          loe: 1,
          description: 1,
          createdAt: 1,
          totalBillable: { $sum: "$allEntries.billable" },
          totalNonBillable: { $sum: "$allEntries.nonBillable" },
          monthlyBillable: { $sum: "$monthlyEntries.billable" },
          monthlyNonBillable: { $sum: "$monthlyEntries.nonBillable" },
        },
      },
      { $match: { $or: [{ monthlyBillable: { $gt: 0 } }, { monthlyNonBillable: { $gt: 0 } }] } },
      { $sort: { name: 1 } },
    ]);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch report summary" });
  }
});

export default app;
