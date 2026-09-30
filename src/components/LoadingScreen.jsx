import Spinner from './Spinner.jsx';

export default function LoadingScreen({ label = 'Loading', large = false }) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-4 p-16 text-slate-400 motion-safe:animate-fade-in-up ${
        large ? 'text-4xl' : 'text-lg'
      }`}
    >
      <Spinner className={`text-indigo-400 ${large ? 'h-12 w-12' : 'h-8 w-8'}`} />
      <span>{label}</span>
    </div>
  );
}
