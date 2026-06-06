import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <h1 className="text-6xl font-bold text-slate-300">404</h1>
        <p className="text-xl text-slate-600 mt-4">Page not found</p>
        <Link to="/" className="text-blue-600 hover:underline mt-6 inline-block">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}