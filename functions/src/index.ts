import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import Stripe from "stripe";

admin.initializeApp();

const stripe = new Stripe("sk_test_51R1Zm2FRvBExIzdOJLs6NZ5TAvBjGYKGzPAv9TM3ZLksVsL4rDW2A3z88aI73ZUZBI2SsBVulDRgj47y428ldAoI0022XYN3vo", {
  apiVersion: "2025-06-30.basil",
});

export const cancelSubscription = onCall(async (request) => {
    try {
      const { subscriptionId, userId } = request.data;
  
      if (!subscriptionId || !userId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "subscriptionId and userId are required"
        );
      }
  
      // 1. Cancelar la suscripción en Stripe
      const deletedSubscription = await stripe.subscriptions.cancel(subscriptionId);
  
      // 2. Buscar el documento en Firestore con userId
      const subsRef = admin.firestore().collection("subscriptions");
      const snapshot = await subsRef.where("userId", "==", userId).get();
  
      if (snapshot.empty) {
        console.warn(`No subscription document found for userId: ${userId}`);
      } else {
        const batch = admin.firestore().batch();
        snapshot.docs.forEach((doc: any) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }
  
      return { success: true, subscription: deletedSubscription };
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
});

export const upgradeSubscription = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  try {
    const { subscriptionId, newPriceId, userId } = req.body;

    if (!subscriptionId || !newPriceId || !userId) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    // Obtener la suscripción actual desde Stripe
    const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Hacer el upgrade
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
      proration_behavior: 'create_prorations',
      items: [
        {
          id: currentSubscription.items.data[0].id,
          price: newPriceId,
        },
      ],
    });

    // Actualizar tu Firestore (si guardas el plan ahí)
    const subSnap = await db
      .collection('subscriptions')
      .where('userId', '==', userId)
      .get();

    for (const doc of subSnap.docs) {
      await doc.ref.update({
        planId: newPriceId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return res.status(200).json({
      success: true,
      subscription: updatedSubscription,
    });
  } catch (err) {
    console.error('Error upgrading subscription:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});