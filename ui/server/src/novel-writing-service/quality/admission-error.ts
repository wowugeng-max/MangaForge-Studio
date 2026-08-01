import { redactAndBoundCredentialText } from '../../novel-writing/credential-redaction'

export function formatAdmissionError(error: any, maxLength = 300) {
  return redactAndBoundCredentialText(error?.message || error || 'unknown error', maxLength)
}
