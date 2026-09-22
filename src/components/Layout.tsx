import { Outlet, NavLink } from 'react-router-dom';

export default function Layout() {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors',
      isActive
        ? 'border-indigo-500 text-gray-900'
        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
    ].join(' ');

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Brand */}
              <div className="flex-shrink-0 flex items-center mr-6">
                <span className="text-xl font-bold text-indigo-600">PJL</span>
                <span className="ml-1 text-xl font-light text-gray-700">Portal</span>
              </div>
              {/* Nav links */}
              <div className="flex items-center space-x-6">
                <NavLink to="/" end className={navLinkClass}>
                  Submissions
                </NavLink>
                <NavLink to="/groups" className={navLinkClass}>
                  Groups
                </NavLink>
                <NavLink to="/new" className={navLinkClass}>
                  New Submission
                </NavLink>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
