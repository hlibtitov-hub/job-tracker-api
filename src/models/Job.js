const mongoose = require('mongoose')

const jobSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    status: { type: String, enum: ['Applied', 'Interview', 'Offer', 'Rejected'], default: 'Applied' },
    location: { type: String, trim: true, default: '' },
    salary: { type: String, trim: true, default: '' },
    url: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
)

jobSchema.index({ user: 1, createdAt: -1 })

module.exports = mongoose.model('Job', jobSchema)
