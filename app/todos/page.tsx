import { TodoList } from "../components/TodoList";
import { ResearchPanel } from "../components/ResearchPanel";

export default function TodosPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className="flex-1 py-8">
        <TodoList />
      </div>
      <ResearchPanel />
    </div>
  );
}


