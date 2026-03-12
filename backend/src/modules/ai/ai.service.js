const { AppError } = require('../../shared/errors');

class AiService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.endpoint = 'https://api.openai.com/v1/chat/completions';
  }

  buildPrompt(taskText) {
    return [
      {
        role: 'system',
        content: 'You create clear, actionable task breakdowns. Return JSON only.'
      },
      {
        role: 'user',
        content: `Task: "${taskText}"\nReturn JSON with a "subtasks" array of 3-6 short items.`
      }
    ];
  }

  normalizeSubtasks(items) {
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0)
      .slice(0, 6);
  }

  async generateSubtasks(taskText) {
    if (!taskText || typeof taskText !== 'string' || !taskText.trim()) {
      throw new AppError('Task description is required', 400);
    }

    if (!this.apiKey) {
      throw new AppError('OpenAI API key not configured', 500);
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.4,
        max_tokens: 200,
        messages: this.buildPrompt(taskText)
      })
    });

    let payload;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const message = payload?.error?.message || 'Failed to generate subtasks';
      throw new AppError(message, response.status);
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (!content) {
      throw new AppError('Empty AI response', 502);
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = null;
    }

    const subtasks = this.normalizeSubtasks(parsed?.subtasks || []);
    if (!subtasks.length) {
      throw new AppError('AI did not return subtasks', 502);
    }

    return { subtasks };
  }
}

module.exports = AiService;
