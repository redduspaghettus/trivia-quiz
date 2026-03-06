import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { buildPrompt } from './src/prompt.js';
import { validateQuiz } from './src/schema.js';

function getWeekLabel(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function main() {
  const client = new Anthropic();
  const week = getWeekLabel(new Date());
  const filename = `quizzes/${week}.json`;
  const manifestPath = 'quizzes/manifest.json';

  console.log(`Generating quiz for ${week}...`);

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildPrompt(week) }]
  });

  const raw = message.content[0].text.trim();
  const quiz = JSON.parse(raw);
  validateQuiz(quiz);

  mkdirSync('quizzes', { recursive: true });
  writeFileSync(filename, JSON.stringify(quiz, null, 2));
  console.log(`Quiz saved to ${filename}`);

  // Update manifest
  const existing = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, 'utf8'))
    : [];
  if (!existing.includes(week)) {
    const updated = [week, ...existing].sort().reverse();
    writeFileSync(manifestPath, JSON.stringify(updated, null, 2));
    console.log(`Manifest updated: ${updated.length} quizzes`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
