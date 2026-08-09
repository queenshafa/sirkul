import "dotenv/config";
import http from "node:http";
import { sendJSON } from "./utils/http.js";
import {
  getAllSampah,
  getSampahById,
  createSampah,
  updateSampah,
  deleteSampah,
} from "./routes/sampah.js";
import { register, login } from "./routes/auth.js";
import { requireAuth, requireRole } from "./lib/middleware.js";

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  // handle preflight CORS request
  if (req.method === "OPTIONS") {
    return sendJSON(res, 204, {});
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.split("/").filter(Boolean); // ["api", "sampah", ":id"]

  // health check sederhana
  if (req.method === "GET" && url.pathname === "/") {
    return sendJSON(res, 200, { message: "Sirkul backend jalan 🚀" });
  }

  // routing auth: /api/auth/register dan /api/auth/login
  if (pathParts[0] === "api" && pathParts[1] === "auth") {
    if (req.method === "POST" && pathParts[2] === "register")
      return register(req, res);
    if (req.method === "POST" && pathParts[2] === "login")
      return login(req, res);
  }

  // routing manual: /api/sampah dan /api/sampah/:id
  if (pathParts[0] === "api" && pathParts[1] === "sampah") {
    const id = pathParts[2]; // undefined kalau nggak ada id di URL

    if (req.method === "GET" && !id) return getAllSampah(req, res);
    if (req.method === "GET" && id) return getSampahById(req, res, id);

    // POST/PUT/DELETE wajib login. Hanya "seller" yang boleh nambah/ubah/hapus data jual.
    if (req.method === "POST" && !id) {
      const user = await requireAuth(req, res);
      if (!user) return; // requireAuth udah kirim response error-nya
      if (!requireRole(user, res, ["seller"])) return;
      return createSampah(req, res);
    }
    if (req.method === "PUT" && id) {
      const user = await requireAuth(req, res);
      if (!user) return;
      if (!requireRole(user, res, ["seller"])) return;
      return updateSampah(req, res, id);
    }
    if (req.method === "DELETE" && id) {
      const user = await requireAuth(req, res);
      if (!user) return;
      if (!requireRole(user, res, ["seller"])) return;
      return deleteSampah(req, res, id);
    }
  }

  // kalau nggak ada route yang cocok
  sendJSON(res, 404, { success: false, message: "Endpoint tidak ditemukan" });
});

server.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});
