export function validateQuiz(quiz) {
  if (!quiz.week) throw new Error('week is required');
  if (!quiz.generated) throw new Error('generated is required');
  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    throw new Error('questions must be a non-empty array');
  }
  for (const q of quiz.questions) {
    if (!q.answer) throw new Error(`answer is required for question ${q.id}`);
    if (q.type === 'multiple_choice' && (!q.options || q.options.length < 2)) {
      throw new Error(`options required for multiple_choice question ${q.id}`);
    }
  }
}
