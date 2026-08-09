import { db } from "../lib/firebase.js";
import { sendJSON, readBody } from "../utils/http.js";

const COLLECTION = "sampah";

// GET /api/sampah  -> ambil semua data
export async function getAllSampah(req, res) {
  try {
    const snapshot = await db
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .get();
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    sendJSON(res, 200, { success: true, data });
  } catch (err) {
    sendJSON(res, 500, { success: false, message: err.message });
  }
}

// GET /api/sampah/:id -> ambil satu data
export async function getSampahById(req, res, id) {
  try {
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) {
      return sendJSON(res, 404, {
        success: false,
        message: "Data tidak ditemukan",
      });
    }
    sendJSON(res, 200, { success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    sendJSON(res, 500, { success: false, message: err.message });
  }
}

// POST /api/sampah -> tambah data baru
export async function createSampah(req, res) {
  try {
    const body = await readBody(req);
    const { jenis, berat, userId } = body;

    if (!jenis || !berat || !userId) {
      return sendJSON(res, 400, {
        success: false,
        message: "Field 'jenis', 'berat', dan 'userId' wajib diisi",
      });
    }

    const docRef = await db.collection(COLLECTION).add({
      jenis,
      berat: Number(berat),
      userId,
      createdAt: new Date().toISOString(),
    });

    sendJSON(res, 201, { success: true, id: docRef.id });
  } catch (err) {
    sendJSON(res, 500, { success: false, message: err.message });
  }
}

// PUT /api/sampah/:id -> update data
export async function updateSampah(req, res, id) {
  try {
    const body = await readBody(req);
    await db.collection(COLLECTION).doc(id).update(body);
    sendJSON(res, 200, { success: true, message: "Data berhasil diupdate" });
  } catch (err) {
    sendJSON(res, 500, { success: false, message: err.message });
  }
}

// DELETE /api/sampah/:id -> hapus data
export async function deleteSampah(req, res, id) {
  try {
    await db.collection(COLLECTION).doc(id).delete();
    sendJSON(res, 200, { success: true, message: "Data berhasil dihapus" });
  } catch (err) {
    sendJSON(res, 500, { success: false, message: err.message });
  }
}
