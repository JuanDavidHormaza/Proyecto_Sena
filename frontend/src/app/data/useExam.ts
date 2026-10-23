/**
 * useExam.ts - Custom Hook de React para consumir el ExamEngine adaptativo (A1 -> B2)
 */

import { useState, useRef, useCallback } from "react";
import {
  ExamEngine,
  ExamSessionState,
  ExamFinalSummary,
  UnifiedQuestion,
  UserAnswerRecord,
} from "../services/examEngine";

export function useExam() {
  const engineRef = useRef<ExamEngine>(new ExamEngine());
  const [session, setSession] = useState<ExamSessionState>(() =>
    engineRef.current.getSessionState()
  );
  const [lastAnswerRecord, setLastAnswerRecord] = useState<UserAnswerRecord | null>(null);

  const syncState = useCallback(() => {
    setSession(engineRef.current.getSessionState());
  }, []);

  const submitMultipleChoice = useCallback(
    (optionIndex: number): UserAnswerRecord => {
      const record = engineRef.current.submitMultipleChoiceAnswer(optionIndex);
      setLastAnswerRecord(record);
      syncState();
      return record;
    },
    [syncState]
  );

  const submitWriting = useCallback(
    (text: string): UserAnswerRecord => {
      const record = engineRef.current.submitWritingAnswer(text);
      setLastAnswerRecord(record);
      syncState();
      return record;
    },
    [syncState]
  );

  const submitSpeaking = useCallback(
    (audioUrl: string, audioBlob?: Blob): UserAnswerRecord => {
      const record = engineRef.current.submitSpeakingAnswer(audioUrl, audioBlob);
      setLastAnswerRecord(record);
      syncState();
      return record;
    },
    [syncState]
  );

  const advanceNextStep = useCallback((): "next_question" | "level_up" | "exam_completed" => {
    const outcome = engineRef.current.nextStep();
    setLastAnswerRecord(null);
    syncState();
    return outcome;
  }, [syncState]);

  const finishAndSummarize = useCallback(
    (elapsedSeconds: number): ExamFinalSummary => {
      return engineRef.current.generateFinalSummary(elapsedSeconds);
    },
    []
  );

  const restartExam = useCallback(() => {
    engineRef.current = new ExamEngine();
    setLastAnswerRecord(null);
    syncState();
  }, [syncState]);

  return {
    currentQuestion: session.currentQuestion as UnifiedQuestion | null,
    currentLevel: session.currentLevel,
    unlockedLevels: session.unlockedLevels,
    currentIndex: session.currentQuestionIndexInLevel,
    totalAnswered: session.totalQuestionsAnswered,
    streak: session.streak,
    answers: session.answers,
    isCompleted: session.isCompleted,
    lastAnswerRecord,
    submitMultipleChoice,
    submitWriting,
    submitSpeaking,
    advanceNextStep,
    finishAndSummarize,
    restartExam,
  };
}

export default useExam;
