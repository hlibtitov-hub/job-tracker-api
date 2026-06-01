require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')

const authRoutes = require('./routes/auth')
const jobRoutes = require('./routes/jobs')
const aiRoutes = require('./routes/ai')
const uploadRoutes = require('./routes/upload')

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({
  origin: (origin, callback) => {
    const allowed = process.env.FRONTEND_URL || ''
    if (!origin || origin === allowed || origin.endsWith('.vercel.app') || origin === 'http://localhost:3000') {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Job Tracker API is running 🚀' })
})

app.use('/api/auth', authRoutes)
app.use('/api/jobs', jobRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/upload', uploadRoutes)

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected')
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message)
    process.exit(1)
  })
