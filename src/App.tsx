import { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import { BYOKSettings } from './features/BYOKSettings';
import { CourseLibrary } from './features/CourseLibrary';
import { ActiveLearning } from './features/ActiveLearning';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';
import { warmupEmbeddingModel } from './lib/search';

function App() {
  const { activeCourse } = useStore();
  const [isWarmingUp, setIsWarmingUp] = useState(true);

  useEffect(() => {
    warmupEmbeddingModel().finally(() => {
      setIsWarmingUp(false);
    });
  }, []);

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans relative">
          <BYOKSettings />
          {!activeCourse ? <CourseLibrary /> : <ActiveLearning />}

          {isWarmingUp && (
            <div className="fixed bottom-2 left-2 text-xs text-gray-500 bg-white/80 p-1 rounded z-50">
              Loading AI models...
            </div>
          )}
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;
