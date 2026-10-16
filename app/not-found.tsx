import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-[2rem] font-semibold">Такой страницы нет</h1>
      <p>
        Вернитесь на <Link href="/">главную</Link> или в <Link href="/cars">каталог</Link>.
      </p>
    </div>
  );
}
