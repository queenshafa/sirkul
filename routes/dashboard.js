import { db } from "../lib/firebase.js";
import { sendJSON } from "../utils/http.js";

// GET /api/dashboard -> ringkasan angka, isinya beda tergantung role yang login
export async function getDashboard(req, res, user) {
  try {
    if (user.role === "seller") {
      const listingsSnap = await db
        .collection("listings")
        .where("sellerId", "==", user.uid)
        .get();
      const txSnap = await db
        .collection("transactions")
        .where("sellerId", "==", user.uid)
        .get();

      let totalPending = 0;
      let totalApproved = 0;
      let totalKgTerkumpul = 0;
      let totalNilaiDibayar = 0;

      txSnap.forEach((doc) => {
        const t = doc.data();
        if (t.status === "pending") totalPending++;
        if (t.status === "approved") {
          totalApproved++;
          totalKgTerkumpul += t.berat;
          totalNilaiDibayar += t.totalHarga;
        }
      });

      return sendJSON(res, 200, {
        success: true,
        data: {
          role: "seller",
          totalListingAktif: listingsSnap.docs.filter(
            (d) => d.data().status === "aktif",
          ).length,
          totalTransaksiPending: totalPending,
          totalTransaksiApproved: totalApproved,
          totalKgTerkumpul,
          totalNilaiDibayar,
        },
      });
    }

    // role === "collector"
    const txSnap = await db
      .collection("transactions")
      .where("collectorId", "==", user.uid)
      .get();

    let totalPending = 0;
    let totalApproved = 0;
    let totalRejected = 0;
    let totalKgTerjual = 0;
    let totalPendapatan = 0;

    txSnap.forEach((doc) => {
      const t = doc.data();
      if (t.status === "pending") totalPending++;
      if (t.status === "rejected") totalRejected++;
      if (t.status === "approved") {
        totalApproved++;
        totalKgTerjual += t.berat;
        totalPendapatan += t.totalHarga;
      }
    });

    sendJSON(res, 200, {
      success: true,
      data: {
        role: "collector",
        totalSubmissionPending: totalPending,
        totalSubmissionApproved: totalApproved,
        totalSubmissionRejected: totalRejected,
        totalKgTerjual,
        totalPendapatan,
      },
    });
  } catch (err) {
    sendJSON(res, 500, { success: false, message: err.message });
  }
}
