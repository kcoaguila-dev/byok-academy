import { useStore } from './store/useStore';
import { BYOKSettings } from './features/BYOKSettings';
import { UploadDashboard } from './features/UploadDashboard';
import { ActiveLearning } from './features/ActiveLearning';
import { ToastProvider } from './components/Toast';

function App() {
  const { activeCourse } = useStore();

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <BYOKSettings />

        {!activeCourse ? (
          <UploadDashboard />
        ) : (
          <ActiveLearning />
        )}
      </div>
    </ToastProvider>
  );
}

export default App;
