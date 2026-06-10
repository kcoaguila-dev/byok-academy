import { useRef, type ChangeEvent } from 'react';
import { useStore } from '../store/useStore';
import { useToast } from './Toast';

export const DataBackup = () => {
  const { exportCoursesData, importCoursesData } = useStore();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      const data = exportCoursesData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'byok-academy-backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Backup exported successfully.', 'success');
    } catch (error) {
      showToast('Failed to export backup.', 'error');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const result = importCoursesData(text);
        if (result.success) {
          showToast('Backup imported successfully.', 'success');
          showToast('Note: search index will rebuild when you re-open each course.', 'info');
        } else {
          showToast(result.error || 'Failed to import backup.', 'error');
        }
      }
      // Reset the file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      showToast('Error reading the backup file.', 'error');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full max-w-4xl mt-8 border border-gray-200 rounded-xl p-6 bg-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
      <div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Data Backup</h3>
        <p className="text-gray-600">
          Export your saved courses to a file, or restore them from a previous backup.
        </p>
      </div>
      <div className="flex gap-4">
        <button
          onClick={handleExport}
          className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
        >
          Export Backup
        </button>
        <button
          onClick={handleImportClick}
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap"
        >
          Import Backup
        </button>
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
};
