import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TERMS_VERSION, PRIVACY_VERSION } from '@/lib/legal-versions';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TermsAcceptanceModalProps {
  onAccepted: () => void;
}

export function TermsAcceptanceModal({ onAccepted }: TermsAcceptanceModalProps) {
  const { user } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleCheckboxChange = async (checked: boolean | 'indeterminate') => {
    if (checked === true && user) {
      setAgreed(true);
      setSubmitting(true);

      try {
        const now = new Date().toISOString();

        // Insert acceptance record
        const { error: insertError } = await supabase
          .from('terms_acceptances')
          .insert({
            user_id: user.id,
            terms_version: TERMS_VERSION,
            privacy_version: PRIVACY_VERSION,
          });

        if (insertError && !insertError.message.includes('duplicate key')) {
          throw insertError;
        }

        // Update profile with accepted versions for quick lookup
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            terms_accepted_version: TERMS_VERSION,
            terms_accepted_at: now,
            privacy_accepted_version: PRIVACY_VERSION,
            privacy_accepted_at: now,
          })
          .eq('id', user.id);

        if (updateError) {
          throw updateError;
        }

        onAccepted();
      } catch (error) {
        console.error('Failed to record terms acceptance:', error);
        toast.error('Failed to save acceptance. Please try again.');
        setAgreed(false);
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent 
        className="sm:max-w-md [&>button]:hidden max-h-[85vh] flex flex-col" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Terms of Service Update</DialogTitle>
          <DialogDescription>
            Please review and accept our terms to continue using the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          <p className="text-sm text-muted-foreground">
            Before continuing, please review our updated legal agreements:
          </p>

          <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
            <li>
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80"
              >
                Terms of Service
              </a>
            </li>
            <li>
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80"
              >
                Privacy Policy
              </a>
            </li>
          </ul>

          <div className="flex items-center space-x-3 pt-2">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={handleCheckboxChange}
              disabled={submitting}
            />
            <Label
              htmlFor="agree"
              className="text-sm leading-relaxed cursor-pointer"
            >
              I have read and agree to the Terms of Service and Privacy Policy
            </Label>
            {submitting && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
