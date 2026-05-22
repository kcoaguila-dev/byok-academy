import { useStore } from './store/useStore';
import { BYOKSettings } from './features/BYOKSettings';
import { UploadDashboard } from './features/UploadDashboard';
import { ActiveLearning } from './features/ActiveLearning';

function App() {
  const { activeCourse } = useStore();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <BYOKSettings />

      {!activeCourse ? (
        <UploadDashboard />
      ) : (
        <ActiveLearning />
      )}
    </div>
  );
}

export default App;
