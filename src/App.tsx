import { useStore } from './store/useStore';
import { BYOKSettings } from './features/BYOKSettings';
import { CourseLibrary } from './features/CourseLibrary';
import { ActiveLearning } from './features/ActiveLearning';
import { ToastProvider, useToast } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const { activeCourse } = useStore();
  const { showToast } = useToast();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans relative">
      <BYOKSettings />
      {!activeCourse ? (
        <CourseLibrary />
      ) : (
        <ErrorBoundary onError={(msg) => showToast(msg, 'error')}>
          <ActiveLearning />
        </ErrorBoundary>
      )}
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AppContent />
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;
