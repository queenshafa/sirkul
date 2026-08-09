import { db } from "../lib/firebase.js";
import { sendJSON, readBody } from "../utils/http.js";

const COLLECTION = "transactions";

// POST /api/transactions -> collector submit sampah ke listing tertentu (ini yang disebut "sell" di sisi collector)
export async function createTransaction(req, res, user) {
  try {
    const body = await readBody(req);
    const { listingId, berat } = body;

    if (!listingId || !berat) {
      return sendJSON(res, 400, {
        success: false,
        message: "Field 'listingId' dan 'berat' wajib diisi",
      });
    }

    const listingDoc = await db.collection("listings").doc(listingId).get();
    if (!listingDoc.exists) {
      return sendJSON(res, 404, {
        success: false,
        message: "Listing tidak ditemukan",
      });
    }
    const listing = listingDoc.data();

    const totalHarga = Number(berat) * listing.hargaPerKg;

    const docRef = await db.collection(COLLECTION).add({
      listingId,
      sellerId: listing.sellerId,
      collectorId: user.uid,
      collectorName: user.name,
      jenisSampah: listing.jenisSampah,
      berat: Number(berat),
      hargaPerKg: listing.hargaPerKg,
      totalHarga,
      status: "pending", // pending -> approved / rejected (diubah oleh seller)
      createdAt: new Date().toISOString(),
    });

    sendJSON(res, 201, { success: true, id: docRef.id, totalHarga });
  } catch (err) {
    sendJSON(res, 500, { success: false, message: err.message });
  }
}

// GET /api/transactions -> riwayat/activity, otomatis kefilter sesuai role yang login
// seller lihat semua transaksi yang masuk ke listing-nya, collector lihat submission-nya sendiri
export async function getMyTransactions(req, res, user) {
  try {
    const field = user.role === "seller" ? "sellerId" : "collectorId";
    const snapshot = await db
      .collection(COLLECTION)
      .where(field, "==", user.uid)
      .orderBy("createdAt", "desc")
      .get();
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    sendJSON(res, 200, { success: true, data });
  } catch (err) {
    sendJSON(res, 500, { success: false, message: err.message });
  }
}

// PUT /api/transactions/:id/approve -> seller approve submission dari collector
export async function approveTransaction(req, res, id, user) {
  return updateTransactionStatus(res, id, user, "approved");
}

// PUT /api/transactions/:id/reject -> seller reject submission
export async function rejectTransaction(req, res, id, user) {
  return updateTransactionStatus(res, id, user, "rejected");
}

async function updateTransactionStatus(res, id, user, newStatus) {
  try {
    const docRef = db.collection(COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return sendJSON(res, 404, {
        success: false,
        message: "Transaksi tidak ditemukan",
      });
    }
    if (doc.data().sellerId !== user.uid) {
      return sendJSON(res, 403, {
        success: false,
        message: "Ini bukan transaksi di listing milikmu",
      });
    }
    if (doc.data().status !== "pending") {
      return sendJSON(res, 400, {
        success: false,
        message: "Transaksi ini sudah diproses sebelumnya",
      });
    }

    await docRef.update({
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
    sendJSON(res, 200, {
      success: true,
      message: `Transaksi berhasil di-${newStatus === "approved" ? "approve" : "reject"}`,
    });
  } catch (err) {
    sendJSON(res, 500, { success: false, message: err.message });
  }
}
