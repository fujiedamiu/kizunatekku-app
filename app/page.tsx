import Calendar from "./components/Calendar";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mx-auto max-w-6xl text-lg font-bold">
          キズナテック カレンダー
        </h1>
      </header>
      <Calendar />
    </div>
  );
}
