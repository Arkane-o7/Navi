import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql, upsertSubscription } from '@/lib/db';
import { logger } from '@/lib/logger';

// Lazy init Stripe
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
    });
  }
  return stripe;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    logger.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    const stripeClient = getStripe();
    event = stripeClient.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  logger.debug(`[Stripe Webhook] Event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) {
          logger.error('No userId in checkout session metadata');
          break;
        }

        // Get subscription details
        const stripeClient = getStripe();
        const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
        
        // Get current period end from subscription items
        const periodEnd = subscription.items?.data?.[0]?.current_period_end 
          ? new Date(subscription.items.data[0].current_period_end * 1000)
          : new Date();

        await upsertSubscription({
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          tier: 'pro',
          status: 'active',
          currentPeriodEnd: periodEnd,
        });

        logger.debug(`[Stripe Webhook] User ${userId} upgraded to Pro`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        
        // Get period end from subscription items
        const periodEnd = subscription.items?.data?.[0]?.current_period_end 
          ? new Date(subscription.items.data[0].current_period_end * 1000)
          : undefined;

        if (!userId) {
          // Try to find user by Stripe customer ID
          const customerId = subscription.customer as string;
          const users = await sql`
            SELECT user_id FROM subscriptions WHERE stripe_customer_id = ${customerId}
          ` as Array<{ user_id: string }>;

          if (users.length === 0) {
            logger.error('Could not find user for subscription update');
            break;
          }

          const foundUserId = users[0].user_id;
          
          await upsertSubscription({
            userId: foundUserId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
            tier: subscription.status === 'active' || subscription.status === 'trialing' ? 'pro' : 'free',
            status: mapStripeStatus(subscription.status),
            currentPeriodEnd: periodEnd,
          });
        } else {
          await upsertSubscription({
            userId,
            stripeSubscriptionId: subscription.id,
            tier: subscription.status === 'active' || subscription.status === 'trialing' ? 'pro' : 'free',
            status: mapStripeStatus(subscription.status),
            currentPeriodEnd: periodEnd,
          });
        }

        logger.debug('[Stripe Webhook] Subscription updated for user');
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Downgrade user to free tier
        await sql`
          UPDATE subscriptions 
          SET tier = 'free', status = 'canceled', updated_at = CURRENT_TIMESTAMP
          WHERE stripe_customer_id = ${customerId}
        `;

        logger.debug('[Stripe Webhook] Subscription canceled');
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await sql`
          UPDATE subscriptions 
          SET status = 'past_due', updated_at = CURRENT_TIMESTAMP
          WHERE stripe_customer_id = ${customerId}
        `;

        logger.debug(`[Stripe Webhook] Payment failed for customer ${customerId}`);
        break;
      }

      default:
        logger.debug(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

function mapStripeStatus(status: Stripe.Subscription.Status): 'active' | 'canceled' | 'past_due' | 'trialing' {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
    default:
      return 'canceled';
  }
}
