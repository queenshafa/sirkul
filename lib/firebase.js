import "dotenv/config";
import admin from "firebase-admin";

// Inisialisasi Firebase Admin SDK sekali aja (singleton)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // \n di .env perlu di-decode balik jadi newline asli
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(
        /\\n/g,
        "\n",
      ),
    }),
  });
}

export const db = admin.firestore();
export default admin;
