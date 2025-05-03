
import { QuestionData } from "@/components/Question";
import { ScaledScore } from "@/components/admin/tests/types";

// Mock test data service
export const getTestQuestions = (testId: string): { questions: QuestionData[], scaledScoring?: ScaledScore[] } => {
  // This would typically come from an API
  const questions: QuestionData[] = [
    {
      id: "q1",
      text: "The author's primary purpose in the passage is to:",
      options: [
        { id: "q1-a", text: "argue against a popular scientific theory", isCorrect: false },
        { id: "q1-b", text: "explain the historical development of an idea", isCorrect: true },
        { id: "q1-c", text: "compare competing interpretations of evidence", isCorrect: false },
        { id: "q1-d", text: "challenge a conventional understanding", isCorrect: false },
      ],
      explanation: "The passage primarily tracks how the concept evolved over time, making B the correct answer."
    },
    {
      id: "q2",
      text: "According to the passage, which of the following is true about the experiment?",
      options: [
        { id: "q2-a", text: "It confirmed the researchers' initial hypothesis", isCorrect: false },
        { id: "q2-b", text: "It yielded unexpected results that challenged existing theories", isCorrect: true },
        { id: "q2-c", text: "It failed to produce statistically significant data", isCorrect: false },
        { id: "q2-d", text: "It was criticized for methodological flaws", isCorrect: false },
      ],
      explanation: "The passage mentions that the results surprised researchers and contradicted established theories."
    },
    {
      id: "q3",
      text: "In the equation 3x + 5 = 17, what is the value of x?",
      options: [
        { id: "q3-a", text: "4", isCorrect: true },
        { id: "q3-b", text: "6", isCorrect: false },
        { id: "q3-c", text: "7", isCorrect: false },
        { id: "q3-d", text: "12", isCorrect: false },
      ],
      explanation: "3x + 5 = 17 → 3x = 12 → x = 4"
    },
    {
      id: "q4",
      text: "Which of the following best describes the function f(x) = x² - 3x + 2?",
      options: [
        { id: "q4-a", text: "Linear with y-intercept at (0, 2)", isCorrect: false },
        { id: "q4-b", text: "Quadratic with minimum value at x = 1.5", isCorrect: true },
        { id: "q4-c", text: "Quadratic with maximum value at x = 1.5", isCorrect: false },
        { id: "q4-d", text: "Exponential with horizontal asymptote at y = 2", isCorrect: false },
      ],
      explanation: "This is a quadratic function. The vertex form is f(x) = (x - 1.5)² - 0.25, which has a minimum at x = 1.5."
    },
    {
      id: "q5",
      text: "The main rhetorical strategy used in the third paragraph is:",
      options: [
        { id: "q5-a", text: "Comparison and contrast", isCorrect: true },
        { id: "q5-b", text: "Definition and example", isCorrect: false },
        { id: "q5-c", text: "Problem and solution", isCorrect: false },
        { id: "q5-d", text: "Cause and effect", isCorrect: false },
      ],
      explanation: "The paragraph primarily contrasts two different approaches or viewpoints."
    },
  ];
  
  // Add more questions for a complete test
  for (let i = 6; i <= 10; i++) {
    questions.push({
      id: `q${i}`,
      text: `Sample question ${i} for test ${testId}`,
      options: [
        { id: `q${i}-a`, text: "Option A", isCorrect: i % 4 === 0 },
        { id: `q${i}-b`, text: "Option B", isCorrect: i % 4 === 1 },
        { id: `q${i}-c`, text: "Option C", isCorrect: i % 4 === 2 },
        { id: `q${i}-d`, text: "Option D", isCorrect: i % 4 === 3 },
      ],
    });
  }

  // Mock scaled scoring data - in a real app, this would come from the test configuration
  const scaledScoring: ScaledScore[] = [
    { correct_answers: 0, scaled_score: 0 },
    { correct_answers: 3, scaled_score: 30 },
    { correct_answers: 5, scaled_score: 50 },
    { correct_answers: 7, scaled_score: 70 },
    { correct_answers: 10, scaled_score: 100 }
  ];

  return { questions, scaledScoring };
};
