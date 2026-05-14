import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    const { priceId, userId, successUrl, cancelUrl } = await req.json();

    if (!userId || !priceId) {
      return new NextResponse("Missing data", { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
      payment_method_types: ['card'],
      mode: 'subscription',
      billing_address_collection: 'auto',
      customer_email: userId, // ideally fetch the customer ID if already created
      line_items: [
        {
          price: priceId,
          quantity: 1,
        }
      ],
      metadata: {
        userId: userId,
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[STRIPE_CHECKOUT]', error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
