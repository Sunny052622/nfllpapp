import { Link } from 'react-router-dom'

export function SetupDemo() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-xl">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Setup Users
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Username-only login. Password for all: <strong>123456</strong>
        </p>

        <div className="space-y-4 text-sm text-gray-700">
          <ol className="list-decimal list-inside space-y-2">
            <li>Go to Supabase Dashboard → <strong>Authentication</strong> → <strong>Users</strong></li>
            <li>Click <strong>Add user</strong> → <strong>Create new user</strong></li>
            <li>For each user, use <strong>Email</strong> = <code className="bg-gray-200 px-1 rounded">username@narprafoods.com</code> and <strong>Password</strong> = <code className="bg-gray-200 px-1 rounded">123456</code></li>
            <li>Create these 6 users:
              <ul className="mt-2 list-disc list-inside ml-4">
                <li>keshu@narprafoods.com</li>
                <li>raja@narprafoods.com</li>
                <li>tamasa@narprafoods.com</li>
                <li>atish@narprafoods.com</li>
                <li>lipsa@narprafoods.com</li>
                <li>admin@narprafoods.com</li>
              </ul>
            </li>
            <li>In SQL Editor, run:
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
{`UPDATE profiles SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@narprafoods.com');`}
              </pre>
            </li>
          </ol>

          <p className="pt-4 border-t">
            <strong>Login:</strong> Use username only (e.g. <code className="bg-gray-200 px-1 rounded">keshu</code> or <code className="bg-gray-200 px-1 rounded">admin</code>), not the full email.
          </p>
        </div>

        <Link
          to="/login"
          className="mt-6 block text-center text-indigo-600 hover:underline font-medium"
        >
          ← Back to Login
        </Link>
      </div>
    </div>
  )
}
