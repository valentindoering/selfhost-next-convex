import Realtime from "../components/Realtime";
import { TodoList } from "../components/TodoList";

export default function RealtimePage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-3">
            <Realtime />
          </div>
          <div className="md:col-span-2">
            <TodoList />
          </div>
        </div>
      </div>
    </div>
  );
}
