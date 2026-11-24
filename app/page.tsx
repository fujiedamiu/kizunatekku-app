import Calendar from "./components/Calendar";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <Calendar />
    </div>
  );
}
