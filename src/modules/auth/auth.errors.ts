// Module-scoped AppError subclasses. Module's own surface — entrypoint's
// inline setErrorHandler already maps any AppError to reply.code(err.statusCode)
// + reply.send({ error: err.toJson() }). New auth-domain errors land here
// (T07+ can add SessionExpiredError, etc., as scope grows).
//
// PM B AUX-Q1 ACK ruling (cycle 3): module-scoped errors home preferred over
// inline subclass in plugin file — SRP between transport (plugin) and domain
// (error class). Not re-exported via index.ts barrel: internal-only consumer
// today is the must-rotate-password plugin.
import { AppError } from '@core/errors/app-errors.js';

export class PasswordRotationRequiredError extends AppError {
  readonly statusCode = 403;
  readonly code = 'PASSWORD_ROTATION_REQUIRED';
}
