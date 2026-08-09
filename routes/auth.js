import admin, { db } from "../lib/firebase.js";
import { sendJSON, readBody } from "../utils/http.js";

const VALID_ROLES = ["seller", "collector"];

// POST /api/auth/register
// body: { email, password, name, role }
export async function register(req, res) {
  try {
    const body = await readBody(req);
    const { email, password, name, role } = body;

    if (!email || !password || !name || !role) {
      return sendJSON(res, 400, {
        success: false,
        message: "Field 'email', 'password', 'name', dan 'role' wajib diisi",
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return sendJSON(res, 400, {
        success: false,
        message: `Role harus salah satu dari: ${VALID_ROLES.join(", ")}`,
      });
    }

    // Bikin user baru di Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Simpan data tambahan (termasuk role) di Firestore
    await db.collection("users").doc(userRecord.uid).set({
      name,
      email,
      role,
      createdAt: new Date().toISOString(),
    });

    sendJSON(res, 201, {
      success: true,
      message: "Registrasi berhasil",
      data: { uid: userRecord.uid, email, name, role },
    });
  } catch (err) {
    // Firebase kasih pesan error yang cukup jelas, misal email sudah dipakai
    sendJSON(res, 400, { success: false, message: err.message });
  }
}

// POST /api/auth/login
// body: { email, password }
export async function login(req, res) {
  try {
    const body = await readBody(req);
    const { email, password } = body;

    if (!email || !password) {
      return sendJSON(res, 400, {
        success: false,
        message: "Field 'email' dan 'password' wajib diisi",
      });
    }

    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      return sendJSON(res, 500, {
        success: false,
        message: "FIREBASE_API_KEY belum diisi di .env",
      });
    }

    // Backend nggak bisa cek password langsung (Firebase Admin SDK nggak support itu),
    // jadi verifikasi password dilakukan lewat Firebase Auth REST API.
    const firebaseRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );

    const firebaseData = await firebaseRes.json();

    if (!firebaseRes.ok) {
      return sendJSON(res, 401, {
        success: false,
        message: firebaseData.error?.message || "Email atau password salah",
      });
    }

    // Ambil role dari Firestore
    const userDoc = await db
      .collection("users")
      .doc(firebaseData.localId)
      .get();
    const userData = userDoc.exists ? userDoc.data() : null;

    sendJSON(res, 200, {
      success: true,
      message: "Login berhasil",
      data: {
        uid: firebaseData.localId,
        email: firebaseData.email,
        idToken: firebaseData.idToken, // dipakai sebagai Bearer token di request selanjutnya
        role: userData?.role || null,
        name: userData?.name || null,
      },
    });
  } catch (err) {
    sendJSON(res, 500, { success: false, message: err.message });
  }
}
