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

/**
 * 422 BUSINESS_RULE per spec docs/spec/01-auth-identity.md §1.1 line 90 —
 * authenticated user violates a business rule (current password mismatch,
 * etc.). NOT the same semantic as 401 AUTH_ERROR: 401 = "not authenticated",
 * 422 = "authenticated but business rule violation". Downstream FE routes
 * on the code to choose between login-redirect (401) vs. inline error UX (422).
 */
export class BusinessRuleError extends AppError {
  readonly statusCode = 422;
  readonly code = 'BUSINESS_RULE';
}

/**
 * 403 TENANT_SCOPE_VIOLATION per spec docs/spec/01-auth-identity.md §6 +
 * MVP-AUTH-FIRST §4.1 fail-closed mandate. Thrown by `tenant-guard.ts`
 * plugin when a non-`super_admin` request lacks a `hotelId` claim (i.e.
 * the JWT is missing tenant context). Row-level cross-tenant rejection
 * (e.g. URL param mismatch) is delegated to handler boundaries via the
 * `req.tenantScope` filter per `scopedTickets` pattern (spec §6 line 388-398).
 */
export class TenantScopeViolationError extends AppError {
  readonly statusCode = 403;
  readonly code = 'TENANT_SCOPE_VIOLATION';
}
