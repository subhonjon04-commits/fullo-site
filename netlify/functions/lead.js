const TELEGRAM_API_BASE = 'https://api.telegram.org'

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildMessage(fields) {
  const lines = ['<b>Новая заявка с сайта FULLO</b>', '']
  const labels = {
    name: 'Имя',
    contact: 'Телефон / Telegram',
    company: 'Компания',
    platform: 'Площадка',
    message: 'Сообщение',
  }

  for (const [key, label] of Object.entries(labels)) {
    const value = fields[key]
    if (value) {
      lines.push(`<b>${label}:</b> ${escapeHtml(value)}`)
    }
  }

  return lines.join('\n')
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variable')
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: 'Server is not configured to send this message.' }),
    }
  }

  let fields
  try {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || ''
    if (contentType.includes('application/json')) {
      fields = JSON.parse(event.body || '{}')
    } else {
      fields = Object.fromEntries(new URLSearchParams(event.body || ''))
    }
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Invalid request body.' }) }
  }

  if (!fields.name || !fields.contact) {
    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false, error: 'Name and contact fields are required.' }),
    }
  }

  const text = buildMessage(fields)

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Telegram API error:', errText)
      return { statusCode: 502, body: JSON.stringify({ ok: false, error: 'Failed to send lead to Telegram.' }) }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (err) {
    console.error('Error sending Telegram message:', err)
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Unexpected server error.' }) }
  }
}
