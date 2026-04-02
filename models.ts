import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITask extends Document {
  name: string;
  loe: number;
  description?: string;
  createdAt: Date;
}

const TaskSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  loe: { type: Number, required: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const TaskModel: Model<ITask> = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);

export interface ITimeEntry extends Document {
  taskId: mongoose.Types.ObjectId;
  billable: number;
  nonBillable: number;
  date: Date;
  notes?: string;
}

const TimeEntrySchema: Schema = new Schema({
  taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
  billable: { type: Number, required: true },
  nonBillable: { type: Number, required: true },
  date: { type: Date, required: true },
  notes: { type: String },
});

export const TimeEntryModel: Model<ITimeEntry> = mongoose.models.TimeEntry || mongoose.model<ITimeEntry>('TimeEntry', TimeEntrySchema);
