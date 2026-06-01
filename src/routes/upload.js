const express = require('express')
const multer = require('multer')
const pdfParse = require('pdf-parse')
const mammoth = require('mammoth')

const router = express.Router()

const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ]
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Unsupported file type. Use PDF, DOCX, JPG, or PNG.'))
    }
  },
})

router.post('/extract-text', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' })
  }

  const { mimetype, buffer } = req.file

  try {
    let text = ''

    // PDF
    if (mimetype === 'application/pdf') {
      const data = await pdfParse(buffer)
      text = data.text

    // DOCX
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer })
      text = result.value

    // Images — use Groq vision
    } else if (['image/jpeg', 'image/jpg', 'image/png'].includes(mimetype)) {
      if (!process.env.GROQ_API_KEY) {
        return res.status(500).json({ message: 'AI service not configured for image extraction' })
      }

      const base64 = buffer.toString('base64')
      const mimeForGroq = mimetype === 'image/jpg' ? 'image/jpeg' : mimetype

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract all text from this resume image. Return only the extracted text, no commentary, no markdown formatting.',
                },
                {
                  type: 'image_url',
                  image_url: { url: `data:${mimeForGroq};base64,${base64}` },
                },
              ],
            },
          ],
          max_tokens: 2000,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error?.message || 'Image extraction failed')
      }

      const data = await response.json()
      text = data.choices[0].message.content.trim()
    }

    if (!text.trim()) {
      return res.status(422).json({ message: 'Could not extract text from file. Try a different file.' })
    }

    res.json({ text: text.trim() })
  } catch (err) {
    console.error('Extract text error:', err.message)
    res.status(500).json({ message: err.message || 'Failed to extract text from file' })
  }
})

module.exports = router
