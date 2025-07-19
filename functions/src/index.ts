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