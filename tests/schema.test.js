import { validateQuiz } from '../src/schema.js';

const validQuiz = {
  week: '2026-W10',
  generated: '2026-03-06T21:00:00Z',
  questions: [
    {
      id: 1,
      question: 'What is the capital of Australia?',
      type: 'multiple_choice',
      options: ['Sydney', 'Canberra', 'Melbourne'],
      answer: 'Canberra'
    },
    {
      id: 2,
      question: 'How many sides does a hexagon have?',
      type: 'open_text',
      answer: 'Six'
    }
  ]
};

test('validates a correct quiz object', () => {
  expect(() => validateQuiz(validQuiz)).not.toThrow();
});

test('throws if week is missing', () => {
  const bad = { ...validQuiz, week: undefined };
  expect(() => validateQuiz(bad)).toThrow('week');
});

test('throws if questions array is empty', () => {
  const bad = { ...validQuiz, questions: [] };
  expect(() => validateQuiz(bad)).toThrow('questions');
});

test('throws if a multiple_choice question has no options', () => {
  const bad = {
    ...validQuiz,
    questions: [{ id: 1, question: 'Q?', type: 'multiple_choice', answer: 'A' }]
  };
  expect(() => validateQuiz(bad)).toThrow('options');
});

test('throws if answer is missing', () => {
  const bad = {
    ...validQuiz,
    questions: [{ id: 1, question: 'Q?', type: 'open_text' }]
  };
  expect(() => validateQuiz(bad)).toThrow('answer');
});
