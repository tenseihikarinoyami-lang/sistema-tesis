import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import * as admin from 'firebase-admin';

// Verify Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}
const db = admin.firestore();

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('Stripe-Signature') as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  const session = event.data.object as any;

  if (event.type === 'checkout.session.completed') {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    if (!session?.metadata?.userId) {
      return new NextResponse("User id is required", { status: 400 });
    }

    await db.collection("users").doc(session.metadata.userId).set({
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      stripePriceId: subscription.items.data[0].price.id,
      stripeCurrentPeriodEnd: new Date(
        (subscription as any).current_period_end * 1000
      ),
      isSubscribed: true
    }, { merge: true });
  }

  if (event.type === 'invoice.payment_succeeded') {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    // Update the subscription in firebase
    // We would need to query by stripeSubscriptionId here to get the user
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("stripeSubscriptionId", "==", subscription.id).get();
    
    if (!snapshot.empty) {
      const docId = snapshot.docs[0].id;
      await db.collection("users").doc(docId).set({
        stripePriceId: subscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: new Date(
          (subscription as any).current_period_end * 1000
        ),
      }, { merge: true });
    }
  }

  return new NextResponse(null, { status: 200 });
}
