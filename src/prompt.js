export function buildPrompt(week) {
  return `You are generating a weekly pub-style trivia quiz for the week ${week}.

Generate exactly 25 trivia questions as a JSON object with this exact structure:
{
  "week": "${week}",
  "generated": "<current ISO timestamp>",
  "questions": [ ...25 question objects... ]
}

Each question object must have:
- "id": number (1-25)
- "question": string
- "type": either "multiple_choice" or "open_text"
- "options": array of 2-3 strings (ONLY for multiple_choice questions)
- "answer": string (the correct answer)

Question mix (must follow this breakdown):
- 12 general knowledge questions (mix of multiple_choice and open_text)
- 6 world current events questions relevant to the past week (mix of types)
- 4 Australian news or general Australian knowledge questions (mix of types)
- 3 Melbourne or Victoria specific questions (mix of types)

Style guide:
- Vary difficulty: some easy, some medium, some hard
- Questions should be fun and interesting, like a newspaper or pub quiz
- Multiple choice options should be plausible (not obviously wrong)
- Answers should be concise (1-5 words)
- Do NOT include question numbers in the question text

Return ONLY the JSON object, no markdown, no explanation.`;
}
