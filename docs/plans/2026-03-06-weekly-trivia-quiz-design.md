# Weekly AI Trivia Quiz — Design Document

**Date:** 2026-03-06

## Overview

A weekly general knowledge trivia quiz in the style of a pub/newspaper quiz. A quiz master reads questions aloud to a group, and one person enters the final answer. Questions are automatically generated each Friday using the Claude API and archived for future reference. The quiz is hosted as a static website via GitHub Pages.

## Goals

- Auto-generate 25 trivia questions every Friday at 7am AEST
- Mix of question topics: world events, Australian events, Melbourne/Victoria events, and general knowledge
- Mix of question formats: multiple choice and open text
- Simple right/wrong scoring (1 point per correct answer, running total displayed)
- Archive of all past weekly quizzes, browsable from the UI
- Accessible on any device via a public GitHub Pages URL

## Architecture

```
trivia-quiz/ (GitHub repo)
├── .github/
│   └── workflows/
│       └── generate-quiz.yml  ← GitHub Actions, runs every Friday 7am AEST
├── quizzes/
│   ├── 2026-W10.json          ← one file per week, committed by GitHub Actions
│   └── ...
├── index.html                 ← quiz UI, hosted on GitHub Pages
└── generate.js                ← Node.js script called by GitHub Actions
```

## Components

### generate.js
- Called by GitHub Actions each Friday
- Calls Claude API with a prompt requesting 25 questions
- Prompt specifies: mix of world events, Australian/Melbourne/Victoria events, and general knowledge
- Prompt specifies: mix of multiple choice (with 2-3 options) and open text questions
- Output is a JSON file saved to `quizzes/YYYY-Www.json`
- Script commits and pushes the file to the repo

### quizzes/YYYY-Www.json
Each quiz file contains:
```json
{
  "week": "2026-W10",
  "generated": "2026-03-06T21:00:00Z",
  "questions": [
    {
      "id": 1,
      "question": "Question text here?",
      "type": "multiple_choice",
      "options": ["Option A", "Option B", "Option C"],
      "answer": "Option A"
    },
    {
      "id": 2,
      "question": "Question text here?",
      "type": "open_text",
      "answer": "Expected answer"
    }
  ]
}
```

### index.html
- Single HTML file with embedded CSS and JavaScript
- Loads available quiz files from `quizzes/` directory
- Default view: current week's quiz
- Archive view: list of all past weeks, clickable to replay
- Quiz flow: one question at a time, answer input (text field or MC buttons), submit, reveal correct answer, next question
- Score tracked throughout, final score shown at end

### .github/workflows/generate-quiz.yml
- Scheduled trigger: every Friday at 9pm UTC (= 7am AEST Saturday — adjusted for AEST)
- Runs `node generate.js`
- Commits the new quiz JSON to the repo
- Uses GitHub Secrets for the Anthropic API key

## Question Mix (per week, 25 questions)

| Category | Count | Format |
|---|---|---|
| General knowledge | 12 | Mix of MC and open text |
| World current events | 6 | Mix of MC and open text |
| Australian events/facts | 4 | Mix of MC and open text |
| Melbourne/Victoria events/facts | 3 | Mix of MC and open text |

## Requirements

- GitHub account (free)
- Anthropic API key
- No local server or always-on machine needed
