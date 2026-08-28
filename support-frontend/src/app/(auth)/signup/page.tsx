export default function SignupPage() {
  return (
    <div className="space-y-6 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Sign Up Disabled</h1>
      <p className="text-sm text-gray-600">
        This is an internal support system. Accounts are created by an
        administrator. Please contact your admin to request access.
      </p>
      <a
        href="/login"
        className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700"
      >
        Go to Login
      </a>
    </div>
  );
}