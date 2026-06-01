const express = require('express')

const router = express.Router()

router.post('/analyze', async (req, res) => {
  const { resume, jobDescription } = req.body

  if (!resume || !jobDescription) {
    return res.status(400).json({ message: 'Resume and job description are required' })
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ message: 'AI service not configured' })
  }

  const prompt = `You are an expert resume analyst and career coach. Analyze this resume against the job description and return a JSON response ONLY (no markdown, no extra text).

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

Return this exact JSON structure:
{
  "matchScore": <number 0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "missingSkills": ["<skill 1>", "<skill 2>", "<skill 3>"],
  "improvements": ["<improvement suggestion 1>", "<improvement suggestion 2>", "<improvement suggestion 3>"],
  "keywords": ["<keyword to add 1>", "<keyword to add 2>", "<keyword to add 3>", "<keyword to add 4>", "<keyword to add 5>"]
}`

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || 'Groq API error')
    }

    const data = await response.json()
    const text = data.choices[0].message.content.trim()

    // Strip markdown code blocks if present
    const jsonText = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
    const result = JSON.parse(jsonText)

    res.json(result)
  } catch (err) {
    console.error('AI analyze error:', err.message)
    if (err.message.includes('JSON')) {
      res.status(500).json({ message: 'Failed to parse AI response. Try again.' })
    } else {
      res.status(500).json({ message: err.message })
    }
  }
})

module.exports = router
