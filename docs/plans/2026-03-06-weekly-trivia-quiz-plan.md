# Weekly Trivia Quiz Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a weekly general knowledge trivia quiz app that auto-generates 25 questions every Friday using Claude AI, archives all past quizzes, and is hosted for free on GitHub Pages.

**Architecture:** A Node.js script (`generate.js`) calls the Claude API each Friday via GitHub Actions, saves the quiz as a JSON file in `quizzes/`, and commits it to the repo. A single `index.html` file served via GitHub Pages fetches the quiz JSON and runs the quiz UI.

**Tech Stack:** Node.js 20, @anthropic-ai/sdk, Jest, Vanilla HTML/CSS/JS, GitHub Actions, GitHub Pages

---

## Prerequisites (human steps before starting)

1. Create a new GitHub repository named `trivia-quiz` (public, so GitHub Pages works for free)
2. Clone it locally and open in Claude Code
3. Have your Anthropic API key ready (get one at console.anthropic.com if needed)
4. Add your Anthropic API key to the GitHub repo as a secret named `ANTHROPIC_API_KEY`:
   - Go to repo → Settings → Secrets and variables → Actions → New repository secret

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.nvmrc`

**Step 1: Initialize package.json**

```bash
npm init -y
```

Then edit `package.json` to look like this:

```json
{
  "name": "trivia-quiz",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "generate": "node generate.js",
    "test": "node --experimental-vm-modules node_modules/.bin/jest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.55.0"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  },
  "jest": {
    "transform": {}
  }
}
```

**Step 2: Install dependencies**

```bash
npm install
```

**Step 3: Create .gitignore**

```
node_modules/
.env
```

**Step 4: Create .nvmrc**

```
20
```

**Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore .nvmrc
git commit -m "chore: project setup"
```

---

## Task 2: Quiz JSON Schema and Validator

**Files:**
- Create: `src/schema.js`
- Create: `tests/schema.test.js`

This defines what a valid quiz JSON looks like and gives us a validator we'll use in the generator.

**Step 1: Write the failing test**

Create `tests/schema.test.js`:

```js
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
```

**Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../src/schema.js'`

**Step 3: Write minimal implementation**

Create `src/schema.js`:

```js
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
```

**Step 4: Run test to verify it passes**

```bash
npm test
```

Expected: PASS — all 5 tests green

**Step 5: Commit**

```bash
git add src/schema.js tests/schema.test.js
git commit -m "feat: add quiz JSON schema and validator"
```

---

## Task 3: Question Generator (generate.js)

**Files:**
- Create: `generate.js`
- Create: `tests/generate.test.js`
- Create: `src/prompt.js`

**Step 1: Write the failing test**

Create `tests/generate.test.js`:

```js
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
```

**Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../src/prompt.js'`

**Step 3: Write minimal implementation**

Create `src/prompt.js`:

```js
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
```

**Step 4: Run test to verify it passes**

```bash
npm test
```

Expected: PASS — all 4 tests green

**Step 5: Write generate.js**

Create `generate.js`:

```js
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, mkdirSync } from 'fs';
import { buildPrompt } from './src/prompt.js';
import { validateQuiz } from './src/schema.js';

function getWeekLabel(date) {
  const d = new Date(date);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - yearStart) / 86400000 + yearStart.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function main() {
  const client = new Anthropic();
  const week = getWeekLabel(new Date());
  const filename = `quizzes/${week}.json`;

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
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

**Step 6: Test generate.js manually (requires ANTHROPIC_API_KEY)**

```bash
ANTHROPIC_API_KEY=your_key_here npm run generate
```

Expected output:
```
Generating quiz for 2026-W10...
Quiz saved to quizzes/2026-W10.json
```

Check the file was created:
```bash
cat quizzes/2026-W10.json
```

Expected: Valid JSON with 25 questions.

**Step 7: Commit**

```bash
git add generate.js src/prompt.js tests/generate.test.js
git commit -m "feat: add quiz generator with Claude API"
```

---

## Task 4: Quiz UI (index.html)

**Files:**
- Create: `index.html`

This is a single self-contained HTML file. No framework, no build step.

**Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Trivia Quiz</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, serif;
      background: #f5f0e8;
      color: #2c2c2c;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem;
    }
    h1 { font-size: 2rem; margin-bottom: 0.25rem; }
    .subtitle { color: #666; font-style: italic; margin-bottom: 2rem; }
    .card {
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 2rem;
      max-width: 640px;
      width: 100%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .progress { color: #888; font-size: 0.9rem; margin-bottom: 1rem; }
    .question { font-size: 1.2rem; font-weight: bold; margin-bottom: 1.5rem; line-height: 1.4; }
    .options { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; }
    .option-btn {
      padding: 0.75rem 1rem;
      border: 2px solid #ccc;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      font-size: 1rem;
      font-family: Georgia, serif;
      text-align: left;
      transition: border-color 0.15s;
    }
    .option-btn:hover { border-color: #666; }
    .option-btn.selected { border-color: #3366cc; background: #eef2ff; }
    .option-btn.correct { border-color: #2a9d2a; background: #efffef; }
    .option-btn.wrong { border-color: #cc3333; background: #fff0f0; }
    .text-input {
      width: 100%;
      padding: 0.75rem;
      font-size: 1rem;
      font-family: Georgia, serif;
      border: 2px solid #ccc;
      border-radius: 6px;
      margin-bottom: 1.5rem;
    }
    .text-input:focus { outline: none; border-color: #3366cc; }
    .feedback {
      padding: 0.75rem 1rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      font-weight: bold;
      display: none;
    }
    .feedback.correct { background: #efffef; color: #2a9d2a; display: block; }
    .feedback.wrong { background: #fff0f0; color: #cc3333; display: block; }
    .btn {
      padding: 0.75rem 1.5rem;
      background: #2c2c2c;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-family: Georgia, serif;
      cursor: pointer;
    }
    .btn:hover { background: #444; }
    .btn:disabled { background: #aaa; cursor: default; }
    .score-display { font-size: 1rem; color: #555; margin-top: 1rem; text-align: right; }
    .final-score { text-align: center; padding: 1rem 0; }
    .final-score h2 { font-size: 2rem; margin-bottom: 0.5rem; }
    .final-score p { color: #555; margin-bottom: 1.5rem; }
    .archive { max-width: 640px; width: 100%; margin-top: 2rem; }
    .archive h2 { font-size: 1.1rem; margin-bottom: 0.75rem; color: #555; }
    .archive-list { list-style: none; display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .archive-list a {
      padding: 0.4rem 0.8rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      text-decoration: none;
      color: #333;
      font-size: 0.9rem;
      background: white;
    }
    .archive-list a:hover { background: #f0f0f0; }
    .archive-list a.active { border-color: #3366cc; color: #3366cc; font-weight: bold; }
    .error { color: #cc3333; text-align: center; padding: 2rem; }
  </style>
</head>
<body>
  <h1>THE QUIZ</h1>
  <p class="subtitle">Weekly General Knowledge</p>

  <div class="card" id="quiz-card">
    <p style="text-align:center; color:#888;">Loading quiz...</p>
  </div>

  <div class="archive" id="archive-section" style="display:none;">
    <h2>Past Quizzes</h2>
    <ul class="archive-list" id="archive-list"></ul>
  </div>

  <script>
    // ---- State ----
    let quiz = null;
    let current = 0;
    let score = 0;
    let answered = false;

    // ---- Utilities ----
    function getWeekLabel(date) {
      const d = new Date(date);
      const yearStart = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(((d - yearStart) / 86400000 + yearStart.getDay() + 1) / 7);
      return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
    }

    function normalise(str) {
      return str.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function isCorrect(userAnswer, correctAnswer) {
      return normalise(userAnswer) === normalise(correctAnswer);
    }

    // ---- Quiz file discovery ----
    // We maintain a manifest file for GitHub Pages (no directory listing)
    async function loadManifest() {
      try {
        const r = await fetch('quizzes/manifest.json');
        if (!r.ok) return [];
        return await r.json(); // array of week strings e.g. ["2026-W10", "2026-W09"]
      } catch {
        return [];
      }
    }

    async function loadQuiz(week) {
      const r = await fetch(`quizzes/${week}.json`);
      if (!r.ok) throw new Error(`Quiz not found: ${week}`);
      return await r.json();
    }

    // ---- Render ----
    function renderQuestion() {
      const card = document.getElementById('quiz-card');
      const q = quiz.questions[current];
      answered = false;

      let optionsHtml = '';
      if (q.type === 'multiple_choice') {
        optionsHtml = `<div class="options" id="options">
          ${q.options.map(o => `<button class="option-btn" onclick="selectOption(this, '${o.replace(/'/g, "\\'")}', '${q.answer.replace(/'/g, "\\'")}')">${o}</button>`).join('')}
        </div>`;
      } else {
        optionsHtml = `<input class="text-input" id="text-answer" type="text" placeholder="Type your answer..." onkeydown="if(event.key==='Enter') submitText('${q.answer.replace(/'/g, "\\'")}')">`;
      }

      card.innerHTML = `
        <div class="progress">Question ${current + 1} of ${quiz.questions.length}</div>
        <div class="question">${current + 1}. ${q.question}</div>
        ${optionsHtml}
        <div class="feedback" id="feedback"></div>
        ${q.type === 'open_text' ? `<button class="btn" onclick="submitText('${q.answer.replace(/'/g, "\\'")}')">Submit</button>` : ''}
        <div class="score-display">Score: ${score} / ${current}</div>
      `;

      if (q.type === 'open_text') {
        document.getElementById('text-answer').focus();
      }
    }

    function selectOption(btn, chosen, answer) {
      if (answered) return;
      answered = true;
      const correct = isCorrect(chosen, answer);
      if (correct) score++;

      document.querySelectorAll('.option-btn').forEach(b => {
        if (isCorrect(b.textContent, answer)) b.classList.add('correct');
        else if (b === btn && !correct) b.classList.add('wrong');
      });

      showFeedback(correct, answer);
    }

    function submitText(answer) {
      if (answered) return;
      const input = document.getElementById('text-answer');
      const userAnswer = input.value;
      if (!userAnswer.trim()) return;
      answered = true;
      const correct = isCorrect(userAnswer, answer);
      if (correct) score++;
      input.disabled = true;
      showFeedback(correct, answer);
    }

    function showFeedback(correct, answer) {
      const fb = document.getElementById('feedback');
      fb.className = `feedback ${correct ? 'correct' : 'wrong'}`;
      fb.innerHTML = correct
        ? 'Correct!'
        : `Wrong — the answer was: <strong>${answer}</strong>`;

      const nextBtn = document.createElement('button');
      nextBtn.className = 'btn';
      nextBtn.style.marginTop = '1rem';
      nextBtn.style.display = 'block';
      nextBtn.textContent = current + 1 < quiz.questions.length ? 'Next Question' : 'See Results';
      nextBtn.onclick = () => {
        current++;
        if (current < quiz.questions.length) {
          renderQuestion();
        } else {
          renderFinal();
        }
      };
      document.getElementById('quiz-card').appendChild(nextBtn);
    }

    function renderFinal() {
      const card = document.getElementById('quiz-card');
      const pct = Math.round((score / quiz.questions.length) * 100);
      card.innerHTML = `
        <div class="final-score">
          <h2>${score} / ${quiz.questions.length}</h2>
          <p>${pct}% — ${pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Well done!' : pct >= 40 ? 'Not bad!' : 'Better luck next week!'}</p>
          <button class="btn" onclick="restartQuiz()">Play Again</button>
        </div>
      `;
    }

    function restartQuiz() {
      current = 0;
      score = 0;
      renderQuestion();
    }

    // ---- Archive ----
    function renderArchive(weeks, activeWeek) {
      const section = document.getElementById('archive-section');
      const list = document.getElementById('archive-list');
      if (weeks.length <= 1) return;
      section.style.display = 'block';
      list.innerHTML = weeks.map(w =>
        `<li><a href="#" class="${w === activeWeek ? 'active' : ''}" onclick="switchQuiz('${w}'); return false;">${w}</a></li>`
      ).join('');
    }

    async function switchQuiz(week) {
      const card = document.getElementById('quiz-card');
      card.innerHTML = '<p style="text-align:center;color:#888;">Loading...</p>';
      try {
        quiz = await loadQuiz(week);
        current = 0;
        score = 0;
        renderQuestion();
        document.querySelectorAll('.archive-list a').forEach(a => {
          a.classList.toggle('active', a.textContent === week);
        });
      } catch (e) {
        card.innerHTML = `<div class="error">Failed to load quiz: ${e.message}</div>`;
      }
    }

    // ---- Init ----
    async function init() {
      const card = document.getElementById('quiz-card');
      try {
        const weeks = await loadManifest();
        const thisWeek = getWeekLabel(new Date());
        const targetWeek = weeks.includes(thisWeek) ? thisWeek : (weeks[0] || thisWeek);

        quiz = await loadQuiz(targetWeek);
        renderQuestion();
        renderArchive(weeks, targetWeek);
      } catch (e) {
        card.innerHTML = `<div class="error">No quiz available yet. Check back on Friday!<br><small>${e.message}</small></div>`;
      }
    }

    init();
  </script>
</body>
</html>
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add quiz UI (index.html)"
```

---

## Task 5: Manifest File Update in Generator

The quiz UI loads `quizzes/manifest.json` to discover available quizzes (GitHub Pages doesn't support directory listings). Update `generate.js` to maintain this file.

**Files:**
- Modify: `generate.js`

**Step 1: Update generate.js to write manifest**

Replace the `main()` function in `generate.js` with:

```js
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { buildPrompt } from './src/prompt.js';
import { validateQuiz } from './src/schema.js';

function getWeekLabel(date) {
  const d = new Date(date);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - yearStart) / 86400000 + yearStart.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
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
```

**Step 2: Test manually again to verify manifest is created**

```bash
ANTHROPIC_API_KEY=your_key_here npm run generate
cat quizzes/manifest.json
```

Expected: `["2026-W10"]`

**Step 3: Commit**

```bash
git add generate.js
git commit -m "feat: update manifest on quiz generation"
```

---

## Task 6: GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/generate-quiz.yml`

**Step 1: Create the workflow**

```yaml
name: Generate Weekly Quiz

on:
  schedule:
    # 9pm UTC Thursday = 7am Friday AEST (UTC+10) / 8am AEDT (UTC+11)
    - cron: '0 21 * * 4'
  workflow_dispatch: # allows manual trigger from GitHub UI

jobs:
  generate:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate quiz
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: npm run generate

      - name: Commit and push new quiz
        run: |
          git config user.name "Quiz Bot"
          git config user.email "quiz-bot@users.noreply.github.com"
          git add quizzes/
          git diff --staged --quiet || git commit -m "chore: generate quiz for $(date +%Y-W%V)"
          git push
```

**Step 2: Commit**

```bash
git add .github/workflows/generate-quiz.yml
git commit -m "feat: add GitHub Actions workflow for weekly quiz generation"
```

---

## Task 7: GitHub Pages Setup and Deploy

**Step 1: Push everything to GitHub**

```bash
git push -u origin main
```

**Step 2: Enable GitHub Pages**

1. Go to your GitHub repo → Settings → Pages
2. Under "Source", select **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)`
4. Click Save

**Step 3: Wait ~1 minute, then visit your site**

URL will be: `https://<your-github-username>.github.io/trivia-quiz/`

**Step 4: Trigger a manual generation to test the full flow**

1. Go to repo → Actions → "Generate Weekly Quiz"
2. Click "Run workflow" → Run workflow
3. Watch it complete (~30 seconds)
4. Reload your GitHub Pages URL — the quiz should appear

---

## Task 8: Run All Tests

```bash
npm test
```

Expected: All tests pass.

---

## Done!

The quiz will now:
- Auto-generate every Friday at ~7am AEST
- Be available at your GitHub Pages URL on any device
- Archive all past weeks automatically

To add the first quiz now without waiting for Friday, use the manual workflow trigger (Task 7, Step 4).
