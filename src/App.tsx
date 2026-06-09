import { useStore } from './store/useStore';
import { BYOKSettings } from './features/BYOKSettings';
import { CourseLibrary } from './features/CourseLibrary';
import { ActiveLearning } from './features/ActiveLearning';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';

function App() {
  const { activeCourse } = useStore();
  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
          <BYOKSettings />
          {!activeCourse ? <CourseLibrary /> : <ActiveLearning />}
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;
