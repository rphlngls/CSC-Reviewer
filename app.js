const EXAM_DURATION_SECONDS = 3 * 60 * 60;
const OPTION_LABELS = ["A", "B", "C", "D"];

const screens = {
  loading: document.querySelector("#loading-screen"),
  start: document.querySelector("#start-screen"),
  exam: document.querySelector("#exam-screen"),
  results: document.querySelector("#results-screen"),
  error: document.querySelector("#error-screen"),
};

const elements = {
  totalItems: document.querySelector("#total-items"),
  sectionList: document.querySelector("#section-list"),
  startButton: document.querySelector("#start-button"),
  modeLabel: document.querySelector("#mode-label"),
  sectionName: document.querySelector("#section-name"),
  timer: document.querySelector("#timer"),
  timerCard: document.querySelector(".timer-card"),
  questionCount: document.querySelector("#question-count"),
  answeredCount: document.querySelector("#answered-count"),
  progressTrack: document.querySelector(".progress-track"),
  progressFill: document.querySelector("#progress-fill"),
  questionLabel: document.querySelector("#question-label"),
  questionText: document.querySelector("#question-text"),
  options: document.querySelector("#options"),
  previousButton: document.querySelector("#previous-button"),
  nextButton: document.querySelector("#next-button"),
  submitButton: document.querySelector("#submit-button"),
  resultsEyebrow: document.querySelector("#results-eyebrow"),
  resultsTitle: document.querySelector("#results-title"),
  resultsMessage: document.querySelector("#results-message"),
  scoreNumber: document.querySelector("#score-number"),
  scorePercent: document.querySelector("#score-percent"),
  sectionResults: document.querySelector("#section-results"),
  missedCount: document.querySelector("#missed-count"),
  retryButton: document.querySelector("#retry-button"),
  restartButton: document.querySelector("#restart-button"),
  errorMessage: document.querySelector("#error-message"),
};

let sections = [];
let questions = [];
let answers = [];
let currentIndex = 0;
let deadline = 0;
let timerId = null;
let mode = "exam";
let reviewQueue = [];
let reviewAnswers = new Map();

function showScreen(name) {
  for (const [screenName, screen] of Object.entries(screens)) {
    screen.hidden = screenName !== name;
  }
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return [hours, minutes, remainingSeconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

function getCurrentQuestionIndex() {
  return mode === "exam" ? currentIndex : reviewQueue[currentIndex];
}

function getSelectedAnswer(questionIndex) {
  return mode === "exam" ? answers[questionIndex] : reviewAnswers.get(questionIndex) ?? null;
}

function setSelectedAnswer(questionIndex, answer) {
  if (mode === "exam") {
    answers[questionIndex] = answer;
  } else {
    reviewAnswers.set(questionIndex, answer);
  }
  renderQuestion();
}

function renderQuestion() {
  const questionIndex = getCurrentQuestionIndex();
  const question = questions[questionIndex];
  const selectedAnswer = getSelectedAnswer(questionIndex);
  const total = mode === "exam" ? questions.length : reviewQueue.length;
  const section = sections[question.sectionIndex];
  const answered = mode === "exam"
    ? answers.filter((answer) => answer !== null).length
    : reviewAnswers.size;

  elements.modeLabel.textContent = mode === "exam" ? "FULL PRACTICE EXAM" : "REVIEW MISSED QUESTIONS";
  elements.sectionName.textContent = section.name;
  elements.questionCount.textContent = `Question ${currentIndex + 1} of ${total}`;
  elements.answeredCount.textContent = `${answered} answered`;
  elements.questionLabel.textContent = `QUESTION ${question.number}`;
  elements.questionText.textContent = question.q;
  elements.progressTrack.setAttribute("aria-valuemax", String(total));
  elements.progressTrack.setAttribute("aria-valuenow", String(currentIndex + 1));
  elements.progressFill.style.width = `${((currentIndex + 1) / total) * 100}%`;

  elements.options.replaceChildren();
  question.opts.forEach((optionText, optionIndex) => {
    const label = document.createElement("label");
    label.className = "option";
    if (selectedAnswer === OPTION_LABELS[optionIndex]) {
      label.classList.add("selected");
    }

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "answer";
    input.value = OPTION_LABELS[optionIndex];
    input.checked = selectedAnswer === OPTION_LABELS[optionIndex];
    input.addEventListener("change", () => {
      setSelectedAnswer(questionIndex, input.value);
    });

    const text = document.createElement("span");
    text.textContent = `${OPTION_LABELS[optionIndex]}. ${optionText}`;
    label.append(input, text);
    elements.options.append(label);
  });

  elements.previousButton.disabled = currentIndex === 0;
  elements.nextButton.textContent = currentIndex === total - 1 ? "Last question" : "Next question";
}

function startExam() {
  mode = "exam";
  answers = Array(questions.length).fill(null);
  currentIndex = 0;
  deadline = Date.now() + EXAM_DURATION_SECONDS * 1000;
  elements.timerCard.hidden = false;
  showScreen("exam");
  renderQuestion();
  updateTimer();
  timerId = window.setInterval(updateTimer, 1000);
}

function updateTimer() {
  const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  elements.timer.textContent = formatTime(remaining);
  elements.timerCard.classList.toggle("is-low", remaining <= 10 * 60);
  if (remaining === 0) {
    window.clearInterval(timerId);
    timerId = null;
    submitExam(true);
  }
}

function getMissedQuestionIndices() {
  if (mode === "exam") {
    return questions
      .map((question, index) => (answers[index] === question.ans ? -1 : index))
      .filter((index) => index !== -1);
  }
  return reviewQueue.filter((questionIndex) => (
    reviewAnswers.get(questionIndex) !== questions[questionIndex].ans
  ));
}

function submitExam(isTimeout = false) {
  const total = mode === "exam" ? questions.length : reviewQueue.length;
  const completed = mode === "exam"
    ? answers.filter((answer) => answer !== null).length
    : reviewAnswers.size;
  const unanswered = total - completed;

  if (!isTimeout && unanswered > 0) {
    const message = `You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. Finish anyway?`;
    if (!window.confirm(message)) {
      return;
    }
  } else if (!isTimeout && !window.confirm("Submit your answers now?")) {
    return;
  }

  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
  renderResults(isTimeout);
}

function renderResults(isTimeout = false) {
  const wasReview = mode === "review";
  const indices = wasReview ? reviewQueue : questions.map((_, index) => index);
  const correct = indices.filter((index) => {
    const response = wasReview ? reviewAnswers.get(index) : answers[index];
    return response === questions[index].ans;
  }).length;
  const missed = getMissedQuestionIndices();
  const percentage = indices.length === 0 ? 0 : Math.round((correct / indices.length) * 100);

  elements.resultsEyebrow.textContent = wasReview
    ? "REVIEW ROUND COMPLETE"
    : isTimeout ? "TIME IS UP" : "EXAM COMPLETE";
  elements.resultsTitle.textContent = wasReview ? "Review your progress." : "Your results";
  elements.resultsMessage.textContent = wasReview
    ? missed.length === 0
      ? "Excellent work — you corrected every missed question."
      : `${missed.length} question${missed.length === 1 ? "" : "s"} still need another try.`
    : percentage >= 80
      ? "You reached the 80% passing mark. Keep practicing to stay exam-ready."
      : "You are below the 80% passing mark. Review the missed questions and try again.";
  elements.scoreNumber.textContent = `${correct}/${indices.length}`;
  elements.scorePercent.textContent = `${percentage}%`;

  elements.sectionResults.replaceChildren();
  sections.forEach((section, sectionIndex) => {
    const sectionIndices = indices.filter((index) => questions[index].sectionIndex === sectionIndex);
    if (sectionIndices.length === 0) {
      return;
    }
    const sectionCorrect = sectionIndices.filter((index) => {
      const response = wasReview ? reviewAnswers.get(index) : answers[index];
      return response === questions[index].ans;
    }).length;
    const row = document.createElement("div");
    row.className = "section-result";
    const name = document.createElement("span");
    name.textContent = section.name;
    const score = document.createElement("strong");
    score.textContent = `${sectionCorrect}/${sectionIndices.length}`;
    row.append(name, score);
    elements.sectionResults.append(row);
  });

  elements.missedCount.textContent = missed.length === 0
    ? "No missed questions this round."
    : `${missed.length} question${missed.length === 1 ? "" : "s"} to review. Correct answers are kept hidden until you answer them correctly.`;
  elements.retryButton.hidden = missed.length === 0;
  elements.retryButton.textContent = wasReview ? "Retry remaining questions" : "Review missed questions";
  elements.restartButton.textContent = wasReview ? "Start a new exam" : "Restart exam";
  showScreen("results");
}

function beginReview() {
  reviewQueue = getMissedQuestionIndices();
  reviewAnswers = new Map();
  currentIndex = 0;
  mode = "review";
  elements.timerCard.hidden = true;
  showScreen("exam");
  renderQuestion();
}

function initializeExam(exam) {
  sections = Object.entries(exam).map(([name, section]) => ({
    name,
    items: section.items,
  }));
  questions = sections.flatMap((section, sectionIndex) => (
    section.items.map((item, itemIndex) => ({
      ...item,
      sectionIndex,
      number: itemIndex + 1,
    }))
  ));
  answers = Array(questions.length).fill(null);
  elements.totalItems.textContent = String(questions.length);
  elements.sectionList.replaceChildren();

  sections.forEach((section) => {
    const item = document.createElement("li");
    item.textContent = `${section.name} · ${section.items.length} questions`;
    elements.sectionList.append(item);
  });
  showScreen("start");
}

elements.startButton.addEventListener("click", startExam);
elements.previousButton.addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex -= 1;
    renderQuestion();
  }
});
elements.nextButton.addEventListener("click", () => {
  const total = mode === "exam" ? questions.length : reviewQueue.length;
  if (currentIndex < total - 1) {
    currentIndex += 1;
    renderQuestion();
  }
});
elements.submitButton.addEventListener("click", () => submitExam());
elements.retryButton.addEventListener("click", beginReview);
elements.restartButton.addEventListener("click", startExam);

fetch("questions.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`Question data request failed (${response.status}).`);
    }
    return response.json();
  })
  .then(initializeExam)
  .catch((error) => {
    elements.errorMessage.textContent = `${error.message} Reload the page after checking the site files.`;
    showScreen("error");
  });
