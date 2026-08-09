import admin, { db } from "../lib/firebase.js";
import { sendJSON } from "../utils/http.js";

// Cek header Authorization: Bearer <idToken>, verifikasi ke Firebase,
// lalu ambil role user dari Firestore. Kalau valid, data user ditempel ke req.user
export async function requireAuth(req, res) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    sendJSON(res, 401, {
      success: false,
      message: "Token tidak ditemukan, silakan login dulu",
    });
    return null;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const userDoc = await db.collection("users").doc(decoded.uid).get();

    if (!userDoc.exists) {
      sendJSON(res, 404, {
        success: false,
        message: "Data user tidak ditemukan",
      });
      return null;
    }

    return { uid: decoded.uid, email: decoded.email, ...userDoc.data() };
  } catch (err) {
    sendJSON(res, 401, {
      success: false,
      message: "Token tidak valid atau kadaluarsa",
    });
    return null;
  }
}

// Dipakai setelah requireAuth, buat batasi endpoint hanya untuk role tertentu
// contoh: requireRole(user, res, ["seller"])
export function requireRole(user, res, allowedRoles) {
  if (!allowedRoles.includes(user.role)) {
    sendJSON(res, 403, {
      success: false,
      message: `Akses ditolak, endpoint ini khusus untuk role: ${allowedRoles.join(", ")}`,
    });
    return false;
  }
  return true;
}
