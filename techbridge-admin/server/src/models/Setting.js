import mongoose from 'mongoose';

// Key-value store for company settings (cached by SettingsService)
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model('Setting', settingSchema);