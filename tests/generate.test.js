import { buildPrompt } from '../src/prompt.js';
import { validateQuiz } from '../src/schema.js';

test('buildPrompt returns a non-empty string', () => {
  const prompt = buildPrompt('2026-W10');
  expect(typeof prompt).toBe('string');
  expect(prompt.length).toBeGreaterThan(100);
});

test('buildPrompt mentions Melbourne', () => {
  const prompt = buildPrompt('2026-W10');
  expect(prompt).toMatch(/Melbourne/i);
});

test('buildPrompt asks for 25 questions', () => {
  const prompt = buildPrompt('2026-W10');
  expect(prompt).toMatch(/25/);
});

test('validateQuiz accepts the expected question mix', () => {
  const quiz = {
    week: '2026-W10',
    generated: new Date().toISOString(),
    questions: [
      ...Array.from({ length: 12 }, (_, i) => ({
        id: i + 1, question: 'Q?', type: 'open_text', answer: 'A'
      })),
      ...Array.from({ length: 13 }, (_, i) => ({
        id: i + 13, question: 'Q?', type: 'multiple_choice',
        options: ['A', 'B', 'C'], answer: 'A'
      }))
    ]
  };
  expect(() => validateQuiz(quiz)).not.toThrow();
});
