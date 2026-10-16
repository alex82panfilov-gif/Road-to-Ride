import { QuizForm } from "@/components/domain/quiz-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Экзамен покупателя" };

export default function QuizPage() {
  return <QuizForm />;
}
