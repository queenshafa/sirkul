import "dotenv/config";
import http from "node:http";
import { sendJSON } from "./utils/http.js";
import { register, login } from "./routes/auth.js";
import { requireAuth, requireRole } from "./lib/middleware.js";
import {
  getAllListings,
  getListingById,
  getMyListings,
  createListing,
  updateListing,
  deleteListing,
} from "./routes/listings.js";
import {
  createTransaction,
  getMyTransactions,
  approveTransaction,
  rejectTransaction,
} from "./routes/transactions.js";
import { getDashboard } from "./routes/dashboard.js";

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  // handle preflight CORS request
  if (req.method === "OPTIONS") {
    return sendJSON(res, 204, {});
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // contoh: /api/listings/abc123 -> ["api", "listings", "abc123"]

  try {
    // health check
    if (req.method === "GET" && url.pathname === "/") {
      return sendJSON(res, 200, { message: "Sirkul backend jalan" });
    }

    // ===== AUTH =====
    if (pathParts[0] === "api" && pathParts[1] === "auth") {
      if (req.method === "POST" && pathParts[2] === "register")
        return register(req, res);
      if (req.method === "POST" && pathParts[2] === "login")
        return login(req, res);
    }

    // ===== LISTINGS (dibuat seller, dicari collector) =====
    if (pathParts[0] === "api" && pathParts[1] === "listings") {
      const id = pathParts[2];

      if (req.method === "GET" && id === "mine") {
        const user = await requireAuth(req, res);
        if (!user) return;
        if (!requireRole(user, res, ["seller"])) return;
        return getMyListings(req, res, user);
      }
      if (req.method === "GET" && !id) return getAllListings(req, res);
      if (req.method === "GET" && id) return getListingById(req, res, id);

      if (req.method === "POST" && !id) {
        const user = await requireAuth(req, res);
        if (!user) return;
        if (!requireRole(user, res, ["seller"])) return;
        return createListing(req, res, user);
      }
      if (req.method === "PUT" && id) {
        const user = await requireAuth(req, res);
        if (!user) return;
        if (!requireRole(user, res, ["seller"])) return;
        return updateListing(req, res, id, user);
      }
      if (req.method === "DELETE" && id) {
        const user = await requireAuth(req, res);
        if (!user) return;
        if (!requireRole(user, res, ["seller"])) return;
        return deleteListing(req, res, id, user);
      }
    }

    // ===== TRANSACTIONS (submit oleh collector, approve/reject oleh seller) =====
    if (pathParts[0] === "api" && pathParts[1] === "transactions") {
      const id = pathParts[2];
      const action = pathParts[3]; // "approve" atau "reject"

      if (req.method === "GET" && !id) {
        const user = await requireAuth(req, res);
        if (!user) return;
        return getMyTransactions(req, res, user);
      }
      if (req.method === "POST" && !id) {
        const user = await requireAuth(req, res);
        if (!user) return;
        if (!requireRole(user, res, ["collector"])) return;
        return createTransaction(req, res, user);
      }
      if (req.method === "PUT" && id && action === "approve") {
        const user = await requireAuth(req, res);
        if (!user) return;
        if (!requireRole(user, res, ["seller"])) return;
        return approveTransaction(req, res, id, user);
      }
      if (req.method === "PUT" && id && action === "reject") {
        const user = await requireAuth(req, res);
        if (!user) return;
        if (!requireRole(user, res, ["seller"])) return;
        return rejectTransaction(req, res, id, user);
      }
    }

    // ===== DASHBOARD =====
    if (pathParts[0] === "api" && pathParts[1] === "dashboard") {
      if (req.method === "GET") {
        const user = await requireAuth(req, res);
        if (!user) return;
        return getDashboard(req, res, user);
      }
    }

    sendJSON(res, 404, { success: false, message: "Endpoint tidak ditemukan" });
  } catch (err) {
    sendJSON(res, 500, {
      success: false,
      message: "Terjadi kesalahan di server: " + err.message,
    });
  }
});

server.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});
