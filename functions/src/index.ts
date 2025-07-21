import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import Stripe from "stripe";

admin.initializeApp();

const stripe = new Stripe(
  "sk_test_51R1Zm2FRvBExIzdOJLs6NZ5TAvBjGYKGzPAv9TM3ZLksVsL4rDW2A3z88aI73ZUZBI2SsBVulDRgj47y428ldAoI0022XYN3vo",
  {
    apiVersion: "2025-06-30.basil",
  }
);

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
    const deletedSubscription = await stripe.subscriptions.cancel(
      subscriptionId
    );

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

export const upgradeSubscription = onCall(async (request) => {
  try {
    const { subscriptionId, newPriceId, userId } = request.data;

    if (!subscriptionId || !newPriceId || !userId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "subscriptionId, newPriceId y userId son obligatorios"
      );
    }

    // Obtener la suscripción actual desde Stripe
    const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Hacer el upgrade con prorrateo
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
      proration_behavior: "create_prorations",
      items: [
        {
          id: currentSubscription.items.data[0].id,
          price: newPriceId,
        },
      ],
    });

    // Buscar en Firestore la suscripción activa del usuario
    const subsSnap = await admin
      .firestore()
      .collection("subscriptions")
      .where("userId", "==", userId)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (subsSnap.empty) {
      console.warn(`No se encontró una suscripción activa para el usuario ${userId}`);
    } else {
      const docRef = subsSnap.docs[0].ref;
      await docRef.update({
        planId: newPriceId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return {
      success: true,
      subscription: updatedSubscription,
    };
  } catch (err: any) {
    console.error("Error upgrading subscription:", err);
    throw new functions.https.HttpsError("internal", err.message);
  }
});
