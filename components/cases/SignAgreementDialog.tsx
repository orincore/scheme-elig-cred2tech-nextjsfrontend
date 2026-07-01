'use client';

import { useState } from 'react';
import { Caveat } from 'next/font/google';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import TravelingBorderButton from '@/components/ui/traveling-border-button';
import {
  fieldLabelClass,
  fieldWrapperClass,
  fieldInputClass,
} from '@/components/ui/underline-field';
import { Checkbox } from '@/components/ui/checkbox';
import { PenLine, Mail, Smartphone, ShieldCheck, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const caveat = Caveat({ subsets: ['latin'], weight: '600' });

type OtpMethod = 'email' | 'mobile';
type Step = 'choose-method' | 'verify-otp';

interface SignAgreementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestOtp: (method: OtpMethod) => Promise<{ success?: boolean; message?: string } | any>;
  onSign: (fullName: string, otp: string, otpMethod: OtpMethod) => Promise<{ success?: boolean; message?: string } | any>;
  onDone?: () => void | Promise<void>;
}

export function SignAgreementDialog({ open, onOpenChange, onRequestOtp, onSign, onDone }: SignAgreementDialogProps) {
  const [step, setStep] = useState<Step>('choose-method');
  const [method, setMethod] = useState<OtpMethod>('email');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [otpSentMsg, setOtpSentMsg] = useState('');

  const reset = () => {
    setStep('choose-method');
    setMethod('email');
    setFullName('');
    setOtp('');
    setAgreed(false);
    setSubmitting(false);
    setOtpSentMsg('');
  };

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSendOtp = async () => {
    if (!fullName.trim()) { toast.error('Please type your full name first'); return; }
    if (!agreed) { toast.error('Please confirm you agree to the terms'); return; }
    setSubmitting(true);
    try {
      const res = await onRequestOtp(method);
      if (res && res.success === false) {
        toast.error(res.message || 'Failed to send OTP');
        return;
      }
      setOtpSentMsg(res?.message || `OTP sent to your registered ${method === 'email' ? 'email' : 'mobile number'}`);
      setStep('verify-otp');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send OTP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setSubmitting(true);
    try {
      const res = await onRequestOtp(method);
      if (res && res.success === false) {
        toast.error(res.message || 'Failed to resend OTP');
        return;
      }
      toast.success('New OTP sent');
      setOtpSentMsg(res?.message || `New OTP sent to your ${method === 'email' ? 'email' : 'mobile number'}`);
      setOtp('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to resend OTP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSign = async () => {
    if (!otp.trim() || otp.length !== 6) { toast.error('Please enter the 6-digit OTP'); return; }
    setSubmitting(true);
    try {
      const res = await onSign(fullName.trim(), otp.trim(), method);
      if (res && res.success === false) {
        toast.error(res.message || 'Failed to sign the agreement');
        setSubmitting(false);
        return;
      }
      toast.success('Agreement signed successfully');
      await onDone?.();
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to sign the agreement');
      setSubmitting(false);
    }
  };

  const methodLabel = method === 'email' ? 'Email OTP' : 'Mobile OTP';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-[#0a1628] dark:text-[#e6edf7]">
            <div className="flex items-center justify-center w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 shrink-0">
              {step === 'verify-otp'
                ? <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                : <PenLine className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              }
            </div>
            {step === 'choose-method' ? 'Sign Agreement' : 'Verify & Sign'}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[#4a5d73] dark:text-[#94a3b8]">
            {step === 'choose-method'
              ? 'Your signature is verified with a one-time OTP for security. Choose how you want to receive it.'
              : `Enter the 6-digit OTP sent to your ${method === 'email' ? 'email' : 'mobile number'} to complete signing.`}
          </DialogDescription>
        </DialogHeader>

        {step === 'choose-method' ? (
          <div className="space-y-5 py-1">
            {/* Full name */}
            <div>
              <label className={fieldLabelClass}>Full Legal Name *</label>
              <div className={fieldWrapperClass(false, submitting)}>
                <input
                  type="text"
                  placeholder="Type your full name exactly"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={submitting}
                  autoComplete="name"
                  className={fieldInputClass}
                />
              </div>
            </div>

            {/* Signature preview */}
            <div className="border border-dashed border-border bg-muted/20 dark:bg-muted/10 px-4 py-5 min-h-[72px] flex items-center justify-center">
              {fullName.trim() ? (
                <p className={`${caveat.className} text-3xl text-[#0a1628] dark:text-[#e6edf7]`}>
                  {fullName}
                </p>
              ) : (
                <p className="text-xs text-[#4a5d73] dark:text-[#94a3b8] italic">
                  Your signature preview will appear here
                </p>
              )}
            </div>

            {/* OTP method selector */}
            <div>
              <label className={fieldLabelClass}>Send OTP Via</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {(['email', 'mobile'] as OtpMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    disabled={submitting}
                    onClick={() => setMethod(m)}
                    className={cn(
                      'flex items-center gap-2.5 px-3.5 py-3 border transition-colors text-left',
                      method === m
                        ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'border-border text-[#4a5d73] dark:text-[#94a3b8] hover:border-indigo-300 dark:hover:border-indigo-700',
                      submitting && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    {m === 'email'
                      ? <Mail className="h-4 w-4 shrink-0" />
                      : <Smartphone className="h-4 w-4 shrink-0" />
                    }
                    <div>
                      <p className="text-[12px] font-semibold leading-none">{m === 'email' ? 'Email OTP' : 'Mobile OTP'}</p>
                      <p className="text-[10px] mt-0.5 opacity-70">{m === 'email' ? 'Sent to registered email' : 'Sent via SMS'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Consent */}
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="agree-terms"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                disabled={submitting}
                className="mt-0.5"
              />
              <label
                htmlFor="agree-terms"
                className="text-[12px] text-[#4a5d73] dark:text-[#94a3b8] leading-snug cursor-pointer"
              >
                I have read and agree to the terms of this service agreement, and I am authorised to sign it on behalf of the business.
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-5 py-1">
            {/* OTP sent message */}
            <div className="flex items-start gap-2.5 border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/70 dark:bg-indigo-900/20 px-3.5 py-3">
              <ShieldCheck className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-indigo-700 dark:text-indigo-300">{otpSentMsg}</p>
                <p className="text-[11px] text-indigo-600/70 dark:text-indigo-400/60 mt-0.5">OTP is valid for 10 minutes.</p>
              </div>
            </div>

            {/* Signing as */}
            <div className="border border-border bg-muted/20 dark:bg-muted/10 px-4 py-3">
              <p className="text-[11px] text-[#4a5d73] dark:text-[#94a3b8] mb-1">Signing as</p>
              <p className={`${caveat.className} text-2xl text-[#0a1628] dark:text-[#e6edf7]`}>{fullName}</p>
              <p className="text-[10px] text-[#4a5d73] dark:text-[#94a3b8] mt-1">
                (Digitally signed via {methodLabel})
              </p>
            </div>

            {/* OTP input */}
            <div>
              <label className={fieldLabelClass}>Enter 6-Digit OTP *</label>
              <div className={fieldWrapperClass(false, submitting)}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={submitting}
                  className={cn(fieldInputClass, 'tracking-[0.3em] text-center text-lg')}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={submitting}
              className="text-[12px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-40"
            >
              Didn't receive it? Resend OTP
            </button>
          </div>
        )}

        <DialogFooter className="flex-row items-center justify-between sm:justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={step === 'verify-otp' ? () => { setStep('choose-method'); setOtp(''); } : () => handleOpenChange(false)}
            disabled={submitting}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-[#4a5d73] dark:text-[#94a3b8] hover:text-[#0a1628] dark:hover:text-white transition-colors disabled:opacity-40"
          >
            {step === 'verify-otp' && <ArrowLeft className="h-3.5 w-3.5" />}
            {step === 'verify-otp' ? 'Change Method' : 'Cancel'}
          </button>

          <TravelingBorderButton
            onClick={step === 'choose-method' ? handleSendOtp : handleSign}
            disabled={
              submitting ||
              (step === 'choose-method' && (!fullName.trim() || !agreed)) ||
              (step === 'verify-otp' && otp.length !== 6)
            }
            size="sm"
            solid
            showIcon={!submitting}
            className="rounded-[10px] min-w-[148px]"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin inline-block" />
                {step === 'choose-method' ? 'Sending OTP…' : 'Signing…'}
              </span>
            ) : (
              <span>{step === 'choose-method' ? `Send OTP via ${methodLabel}` : 'Sign Agreement'}</span>
            )}
          </TravelingBorderButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
