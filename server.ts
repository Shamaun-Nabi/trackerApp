import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { TaskModel, TimeEntryModel } from "./models.ts";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fallback to local only if .env is missing; however, your error
// confirms process.env.MONGODB_URI was undefined.
const MONGODB_URI = process.env.MONGODB_URI;
console.log("MongoDB URI:", MONGODB_URI ? "Loaded from environment" : "Not found in environment");

async function startServer() {
  try {
    // 1. Establish Database Connection
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI as string);
    console.log("✅ Connected to MongoDB successfully");

    const app = express();
    const PORT = 3000;

    app.use(express.json());

    // --- API ROUTES ---

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
          {
            $lookup: {
              from: "timeentries",
              localField: "_id",
              foreignField: "taskId",
              as: "entries",
            },
          },
          {
            $project: {
              name: 1,
              loe: 1,
              description: 1,
              createdAt: 1,
              totalBillable: { $sum: "$entries.billable" },
              totalNonBillable: { $sum: "$entries.nonBillable" },
            },
          },
          { $sort: { createdAt: -1 } },
        ];

        if (page && limit) {
          pipeline.push({ $skip: skip });
          pipeline.push({ $limit: limit });
        }

        const tasks = await TaskModel.aggregate(pipeline);

        if (page && limit) {
          res.json({ tasks, total, page, limit });
        } else {
          res.json(tasks);
        }
      } catch (err) {
        console.error("Failed to fetch tasks:", err);
        res.status(500).json({ error: "Failed to fetch tasks" });
      }
    });

    app.post("/api/tasks", async (req, res) => {
      try {
        const task = new TaskModel(req.body);
        await task.save();
        res.status(201).json(task);
      } catch (err) {
        res.status(400).json({ error: "Failed to create task" });
      }
    });

    app.get("/api/tasks/:id", async (req, res) => {
      try {
        const task = await TaskModel.findById(req.params.id);
        if (!task) return res.status(404).json({ error: "Task not found" });
        res.json(task);
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch task" });
      }
    });

    app.put("/api/tasks/:id", async (req, res) => {
      try {
        const task = await TaskModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(task);
      } catch (err) {
        res.status(400).json({ error: "Failed to update task" });
      }
    });

    app.delete("/api/tasks/:id", async (req, res) => {
      try {
        await TaskModel.findByIdAndDelete(req.params.id);
        await TimeEntryModel.deleteMany({ taskId: req.params.id });
        res.status(204).end();
      } catch (err) {
        res.status(500).json({ error: "Failed to delete task" });
      }
    });

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

        if (page && limit) {
          res.json({ entries, total, page, limit });
        } else {
          res.json(entries);
        }
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch entries" });
      }
    });

    app.post("/api/tasks/:id/entries", async (req, res) => {
      try {
        const entry = new TimeEntryModel({ ...req.body, taskId: req.params.id });
        await entry.save();
        res.status(201).json(entry);
      } catch (err) {
        res.status(400).json({ error: "Failed to create entry" });
      }
    });

    app.delete("/api/entries/:id", async (req, res) => {
      try {
        await TimeEntryModel.findByIdAndDelete(req.params.id);
        res.status(204).end();
      } catch (err) {
        res.status(500).json({ error: "Failed to delete entry" });
      }
    });

    app.put("/api/entries/:id", async (req, res) => {
      try {
        const entry = await TimeEntryModel.findByIdAndUpdate(req.params.id, { ...req.body }, { new: true });
        res.json(entry);
      } catch (err) {
        res.status(400).json({ error: "Failed to update entry" });
      }
    });

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

    app.get("/api/reports/summary", async (req, res) => {
      const { month } = req.query;
      if (!month) return res.status(400).json({ error: "Month is required" });

      try {
        const startDate = new Date(`${month}-01`);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);

        const summary = await TaskModel.aggregate([
          {
            $lookup: {
              from: "timeentries",
              localField: "_id",
              foreignField: "taskId",
              as: "allEntries",
            },
          },
          {
            $addFields: {
              monthlyEntries: {
                $filter: {
                  input: "$allEntries",
                  as: "entry",
                  cond: {
                    $and: [{ $gte: ["$$entry.date", startDate] }, { $lt: ["$$entry.date", endDate] }],
                  },
                },
              },
            },
          },
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
          {
            $match: {
              $or: [{ monthlyBillable: { $gt: 0 } }, { monthlyNonBillable: { $gt: 0 } }],
            },
          },
          { $sort: { name: 1 } },
        ]);

        res.json(summary);
      } catch (err) {
        console.error("Failed to fetch report summary:", err);
        res.status(500).json({ error: "Failed to fetch report summary" });
      }
    });

    // --- VITE / FRONTEND MIDDLEWARE ---

    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    // 2. Start the Express Server
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Critical error during server startup:", err);
    process.exit(1);
  }
}

startServer();
