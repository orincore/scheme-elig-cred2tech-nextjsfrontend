import { redirect } from 'next/navigation';

// Password reset now happens entirely on the forgot-password page via email OTP.
export default function AgentResetPasswordPage() {
  redirect('/agent/forgot-password');
}
