import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = join(__dirname, '..', 'ORCHESTRATOR_RULES.md');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateViaAPI(userInput, { projectContext, knownIssues } = {}) {
  let rules;
  try {
    rules = readFileSync(RULES_PATH, 'utf8');
  } catch (err) {
    throw { code: 'RULES_NOT_FOUND', message: err.message };
  }

  let contextBlock = '';
  if (projectContext) {
    contextBlock = `\n\n---\n\n${projectContext}\n`;
  }

  let knownIssuesBlock = '';
  if (knownIssues) {
    knownIssuesBlock = `\n\n---\n\n${knownIssues}\n`;
  }

  const systemPrompt = `${rules}${contextBlock}${knownIssuesBlock}`;

  console.log('Calling Claude API with system prompt length:', systemPrompt.length);

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `TASK:\n${userInput}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw { code: 'PARSE_ERROR', message: 'Expected text response from API' };
    }

    const text = content.text;
    console.log('API response length:', text.length);

    // Try to extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw {
        code: 'PARSE_ERROR',
        raw: text,
        message: 'No JSON found in response',
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('Successfully parsed JSON from API response');
    return parsed;
  } catch (err) {
    if (err.code === 'PARSE_ERROR' || err.code === 'RULES_NOT_FOUND') {
      throw err;
    }
    if (err.error?.code === 'api_error') {
      throw {
        code: 'API_ERROR',
        message: err.error.message,
        status: err.status,
      };
    }
    throw {
      code: 'API_ERROR',
      message: err.message || String(err),
    };
  }
}
