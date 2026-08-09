import { db } from "../lib/firebase.js";
import { sendJSON, readBody } from "../utils/http.js";

const COLLECTION = "listings";

// GET /api/listings -> semua listing aktif (dipakai collector buat cari/find)
export async function getAllListings(req, res) {
  try {
    const snapshot = await db
      .collection(COLLECTION)
      .where("status", "==", "aktif")
      .orderBy("createdAt", "desc")
      .get();
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    sendJSON(res, 200, { success: true, data });
  } catch (err) {
    sendJSON(res, 500, { success: false, message: err.message });
  }
}

// GET /api/listings/:id
export async function getListingById(req, res, id) {
  try {
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) {
      return sendJSON(res, 404, {
        success: false,
        message: "Listing tidak ditemukan",
      });
    }
    sendJSON(res, 200, { success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    sendJSON(res, 500, { success: false, message: err.message });
  }
}

// GET /api/listings/mine -> listing milik seller yang sedang login
export async function getMyListings(req, res, user) {
  try {
    const snapshot = await db
      .collection(COLLECTION)
      .where("sellerId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .get();
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    sendJSON(res, 200, { success: true, data });
  } catch (err) {
    sendJSON(res, 500, { success: false, message: err.message });
  }
}

// POST /api/listings -> seller bikin listing baru (jenis sampah yang dicari + harga)
export async function createListing(req, res, user) {
  try {
    const body = await readBody(req);
    const { jenisSampah, hargaPerKg, deskripsi } = body;

    if (!jenisSampah || !hargaPerKg) {
      return sendJSON(res, 400, {
        success: false,
        message: "Field 'jenisSampah' dan 'hargaPerKg' wajib diisi",
      });
    }

    const docRef = await db.collection(COLLECTION).add({
      sellerId: user.uid,
      sellerName: user.name,
      jenisSampah,
      hargaPerKg: Number(hargaPerKg),
      deskripsi: deskripsi || "",
      status: "aktif", // bisa diubah jadi "nonaktif" kalau seller udah nggak butuh
      createdAt: new Date().toISOString(),
    });

    sendJSON(res, 201, { success: true, id: docRef.id });
  } catch (err) {
    sendJSON(res, 500, { success: false, message: err.message });
  }
}

// PUT /api/listings/:id -> seller update listing miliknya sendiri
export async function updateListing(req, res, id, user) {
  try {
    const docRef = db.collection(COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return sendJSON(res, 404, {
        success: false,
        message: "Listing tidak ditemukan",
      });
    }
    if (doc.data().sellerId !== user.uid) {
      return sendJSON(res, 403, {
        success: false,
        message: "Ini bukan listing milikmu",
      });
    }

    const body = await readBody(req);
    await docRef.update(body);
    sendJSON(res, 200, { success: true, message: "Listing berhasil diupdate" });
  } catch (err) {
    sendJSON(res, 500, { success: false, message: err.message });
  }
}

// DELETE /api/listings/:id
export async function deleteListing(req, res, id, user) {
  try {
    const docRef = db.collection(COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return sendJSON(res, 404, {
        success: false,
        message: "Listing tidak ditemukan",
      });
    }
    if (doc.data().sellerId !== user.uid) {
      return sendJSON(res, 403, {
        success: false,
        message: "Ini bukan listing milikmu",
      });
    }

    await docRef.delete();
    sendJSON(res, 200, { success: true, message: "Listing berhasil dihapus" });
  } catch (err) {
    sendJSON(res, 500, { success: false, message: err.message });
  }
}
