"use client";

import { useUser } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { quiz } from "@/lib/content";
import { useState } from "react";

export function QuizForm() {
  const { data, update } = useUser();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  const correct = quiz.filter((item) => answers[item.id] === item.answer).length;
  const passed = correct >= 8;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[2rem] leading-tight font-semibold">Экзамен покупателя</h1>
        <p className="mt-2 text-sm text-muted">Десять вопросов про риски. Восемь верных ответов открывают значок «Готов к осмотру».</p>
      </header>
      {data.quizPassed ? <p className="text-sm text-success">Значок уже у вас. Экзамен можно пройти ещё раз.</p> : null}
      <ol className="space-y-4">
        {quiz.map((item, index) => (
          <li key={item.id}>
            <Card>
              <p className="font-medium">
                {index + 1}. {item.question}
              </p>
              <div className="mt-3 space-y-2">
                {item.options.map((option, optionIndex) => (
                  <label key={option} className="flex items-start gap-3 text-sm">
                    <input
                      type="radio"
                      name={item.id}
                      checked={answers[item.id] === optionIndex}
                      onChange={() => setAnswers((current) => ({ ...current, [item.id]: optionIndex }))}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              {done ? <p className="mt-3 text-sm text-muted">{item.explain}</p> : null}
            </Card>
          </li>
        ))}
      </ol>
      <Button
        onClick={() => {
          setDone(true);
          if (passed) update((current) => ({ ...current, quizPassed: true }));
        }}
        disabled={Object.keys(answers).length < quiz.length}
      >
        Проверить
      </Button>
      {done ? (
        <p className="text-sm">
          {correct} из {quiz.length}. {passed ? "Можно ехать на осмотр с чек-листом." : "Перечитайте карточки рисков и гайд, затем попробуйте снова."}
        </p>
      ) : null}
    </div>
  );
}
