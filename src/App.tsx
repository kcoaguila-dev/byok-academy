import { useStore } from './store/useStore';
import { BYOKSettings } from './features/BYOKSettings';
import { CourseLibrary } from './features/CourseLibrary';
import { ActiveLearning } from './features/ActiveLearning';

function App() {
  const { activeCourse } = useStore();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <BYOKSettings />

      {!activeCourse ? (
        <CourseLibrary />
      ) : (
        <ActiveLearning />
      )}
    </div>
  );
}

export default App;
