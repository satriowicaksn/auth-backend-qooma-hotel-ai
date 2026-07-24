import { createHmac } from 'node:crypto';

import type { Logger } from 'winston';

import type { HotelBootstrapNotifierPort } from '../ports/hotel-bootstrap-notifier.port.js';

const REQUEST_TIMEOUT_MS = 5_000;

export interface HotelBootstrapEndpointsConfig {
  readonly aiServiceBaseUrl: string | undefined;
  readonly integrationBaseUrl: string | undefined;
  readonly coreBaseUrl: string | undefined;
  readonly authToAiHmacSecret: string | undefined;
  readonly internalRpcSecret: string | undefined;
}

interface FanoutTarget {
  readonly name: string;
  readonly url: string;
  readonly headers: Record<string, string>;
}

export class HttpHotelBootstrapNotifier implements HotelBootstrapNotifierPort {
  constructor(
    private readonly cfg: HotelBootstrapEndpointsConfig,
    private readonly logger: Logger,
  ) {}

  async notify(hotelId: string): Promise<void> {
    const body = JSON.stringify({ hotel_id: hotelId });
    const targets = this.buildTargets(body);

    const results = await Promise.allSettled(targets.map((t) => this.call(t, body, hotelId)));

    for (const [i, r] of results.entries()) {
      const target = targets[i];
      if (target === undefined) continue;
      if (r.status === 'rejected') {
        this.logger.warn('admin.hotels.bootstrap_leg_failed', {
          hotelId,
          leg: target.name,
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        });
      } else {
        this.logger.info('admin.hotels.bootstrap_leg_ok', { hotelId, leg: target.name });
      }
    }
  }

  private buildTargets(body: string): FanoutTarget[] {
    const targets: FanoutTarget[] = [];

    if (this.cfg.aiServiceBaseUrl !== undefined && this.cfg.authToAiHmacSecret !== undefined) {
      const sig = createHmac('sha256', this.cfg.authToAiHmacSecret).update(body).digest('hex');
      targets.push({
        name: 'ai-service',
        url: `${this.cfg.aiServiceBaseUrl.replace(/\/$/, '')}/internal/ai/hotels/bootstrap`,
        headers: {
          'content-type': 'application/json',
          'x-service-name': 'auth',
          'x-service-signature': `sha256=${sig}`,
        },
      });
    } else {
      this.logger.warn('admin.hotels.bootstrap_leg_skipped', {
        leg: 'ai-service',
        reason: 'AI_SERVICE_BASE_URL or AUTH_TO_AI_HMAC_SECRET unset',
      });
    }

    if (this.cfg.internalRpcSecret !== undefined) {
      if (this.cfg.integrationBaseUrl !== undefined) {
        targets.push({
          name: 'integration',
          url: `${this.cfg.integrationBaseUrl.replace(/\/$/, '')}/internal/hotels/bootstrap`,
          headers: {
            'content-type': 'application/json',
            'x-internal-secret': this.cfg.internalRpcSecret,
          },
        });
      } else {
        this.logger.warn('admin.hotels.bootstrap_leg_skipped', {
          leg: 'integration',
          reason: 'INTEGRATION_BASE_URL unset',
        });
      }
      if (this.cfg.coreBaseUrl !== undefined) {
        targets.push({
          name: 'core',
          url: `${this.cfg.coreBaseUrl.replace(/\/$/, '')}/internal/hotels/bootstrap`,
          headers: {
            'content-type': 'application/json',
            'x-internal-secret': this.cfg.internalRpcSecret,
          },
        });
      } else {
        this.logger.warn('admin.hotels.bootstrap_leg_skipped', {
          leg: 'core',
          reason: 'CORE_BASE_URL unset',
        });
      }
    } else {
      this.logger.warn('admin.hotels.bootstrap_leg_skipped', {
        leg: 'integration+core',
        reason: 'INTERNAL_RPC_SECRET unset',
      });
    }

    return targets;
  }

  private async call(target: FanoutTarget, body: string, hotelId: string): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(target.url, {
        method: 'POST',
        headers: target.headers,
        body,
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`${target.name} responded ${res.status.toString()}: ${text.slice(0, 200)}`);
      }
    } finally {
      clearTimeout(timer);
      void hotelId;
    }
  }
}
