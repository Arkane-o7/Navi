import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '@/lib/db';
import { logger } from '@/lib/logger';

// Lazy init Stripe to avoid build errors
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

function getCheckoutErrorRedirect(request: NextRequest, reason: string): URL {
  return new URL(`/api/subscription/canceled?reason=${encodeURIComponent(reason)}`, request.url);
}

// Helper to get user ID from auth header
function getUserIdFromHeader(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.sub || null;
  } catch {
    return null;
  }
}

// GET: Redirect to Stripe checkout for browser-based upgrade flow
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.redirect(getCheckoutErrorRedirect(request, 'unauthorized'));
  }

  try {
    // Fetch user email
    const users = await sql`
      SELECT id, email FROM users WHERE id = ${userId}
    ` as Array<{ id: string; email: string }>;

    if (users.length === 0) {
      return NextResponse.redirect(getCheckoutErrorRedirect(request, 'user_not_found'));
    }

    const user = users[0];
    const stripeClient = getStripe();

    // Check if user already has a Stripe customer ID
    const existingSub = await sql`
      SELECT stripe_customer_id FROM subscriptions WHERE user_id = ${userId}
    ` as Array<{ stripe_customer_id: string | null }>;

    let customerId: string;

    if (existingSub.length > 0 && existingSub[0].stripe_customer_id) {
      customerId = existingSub[0].stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripeClient.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripeClient.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://navi-search.vercel.app'}/api/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://navi-search.vercel.app'}/api/subscription/canceled`,
      metadata: {
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
        },
      },
    });

    return NextResponse.redirect(session.url!);
  } catch (error) {
    logger.error('Checkout error:', error);
    return NextResponse.redirect(getCheckoutErrorRedirect(request, 'checkout_failed'));
  }
}

// POST: Create checkout session and return URL (for programmatic access)
export async function POST(request: NextRequest) {
  const userId = getUserIdFromHeader(request);

  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } },
      { status: 401 }
    );
  }

  try {
    // Fetch user email
    const users = await sql`
      SELECT id, email FROM users WHERE id = ${userId}
    ` as Array<{ id: string; email: string }>;

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    const user = users[0];
    const stripeClient = getStripe();

    // Check if user already has a Stripe customer ID
    const existingSub = await sql`
      SELECT stripe_customer_id FROM subscriptions WHERE user_id = ${userId}
    ` as Array<{ stripe_customer_id: string | null }>;

    let customerId: string;

    if (existingSub.length > 0 && existingSub[0].stripe_customer_id) {
      customerId = existingSub[0].stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripeClient.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripeClient.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://navi-search.vercel.app'}/api/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://navi-search.vercel.app'}/api/subscription/canceled`,
      metadata: {
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
      },
    });
  } catch (error) {
    logger.error('Checkout error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create checkout session' } },
      { status: 500 }
    );
  }
}
