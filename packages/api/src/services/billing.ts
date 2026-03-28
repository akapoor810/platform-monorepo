import Stripe from "stripe";
import { getDbClient } from "@acme/db";
import { logger } from "@acme/logger";
import { emailQueue } from "../queues/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export class BillingService {
  static async createSubscription(params: {
    userId: string;
    planId: string;
    paymentMethodId: string;
    couponCode?: string;
  }) {
    const db = getDbClient();
    const user = await db.user.findUniqueOrThrow({ where: { id: params.userId } });

    const customer = await stripe.customers.retrieve(user.stripeCustomerId!);
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: params.planId }],
      default_payment_method: params.paymentMethodId,
      coupon: params.couponCode || undefined,
    });

    await db.subscription.create({
      data: {
        userId: params.userId,
        stripeSubscriptionId: subscription.id,
        planId: params.planId,
        status: "active",
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });

    await emailQueue.add("subscription-created", {
      to: user.email,
      template: "subscription-welcome",
      data: { planName: params.planId },
    });

    return subscription;
  }

  static async getCurrentSubscription(userId: string) {
    const db = getDbClient();
    return db.subscription.findFirst({
      where: { userId, status: "active" },
      orderBy: { createdAt: "desc" },
    });
  }

  static async handleWebhook(body: Buffer, signature: string) {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    logger.info({ type: event.type }, "Processing Stripe webhook");

    switch (event.type) {
      case "invoice.payment_failed":
        await BillingService.handlePaymentFailed(event.data.object as any);
        break;
      case "customer.subscription.deleted":
        await BillingService.handleSubscriptionCanceled(event.data.object as any);
        break;
    }
  }

  private static async handlePaymentFailed(invoice: any) {
    const db = getDbClient();
    const sub = await db.subscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription },
    });
    if (sub) {
      await db.subscription.update({
        where: { id: sub.id },
        data: { status: "past_due" },
      });
    }
  }

  private static async handleSubscriptionCanceled(subscription: any) {
    const db = getDbClient();
    await db.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: { status: "canceled" },
    });
  }
}
