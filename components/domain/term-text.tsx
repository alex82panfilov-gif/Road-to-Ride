import { termParts } from "@/lib/view/terms";
import Link from "next/link";

export function TermText({ text }: { text: string }) {
  return (
    <>
      {termParts(text).map((part, index) =>
        part.href ? (
          <Link key={`${part.href}-${index}`} href={part.href}>
            {part.text}
          </Link>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}
