const express = require('express')
const Job = require('../models/Job')
const authMiddleware = require('../middleware/auth')

const router = express.Router()

router.use(authMiddleware)

router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query
    const query = { user: req.user._id }
    if (status && status !== 'all') query.status = status
    if (search) {
      query.$or = [
        { company: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ]
    }
    const jobs = await Job.find(query).sort({ createdAt: -1 })
    res.json({ jobs })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { company, role, status, location, salary, url, notes } = req.body
    if (!company || !role) {
      return res.status(400).json({ message: 'Company and role are required' })
    }
    const job = await Job.create({
      user: req.user._id,
      company, role,
      status: status || 'Applied',
      location: location || '',
      salary: salary || '',
      url: url || '',
      notes: notes || '',
    })
    res.status(201).json({ job })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, user: req.user._id })
    if (!job) return res.status(404).json({ message: 'Job not found' })
    const allowed = ['company', 'role', 'status', 'location', 'salary', 'url', 'notes']
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) job[field] = req.body[field]
    })
    await job.save()
    res.json({ job })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({ _id: req.params.id, user: req.user._id })
    if (!job) return res.status(404).json({ message: 'Job not found' })
    res.json({ message: 'Job deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/stats', async (req, res) => {
  try {
    const stats = await Job.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])
    const result = { Applied: 0, Interview: 0, Offer: 0, Rejected: 0, total: 0 }
    stats.forEach(({ _id, count }) => {
      result[_id] = count
      result.total += count
    })
    res.json({ stats: result })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
