// Kumpulan helper kecil biar kode di server.js/routes lebih rapi
// (karena kita nggak pakai Express, jadi ini pengganti fitur-fitur bawaannya)

export function sendJSON(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*", // longgarkan CORS biar frontend statis bisa akses
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(body);
}

export function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      // proteksi sederhana biar body request nggak kebesaran (>1MB)
      if (raw.length > 1_000_000) {
        req.destroy();
        reject(new Error("Body terlalu besar"));
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error("JSON body tidak valid"));
      }
    });
    req.on("error", reject);
  });
}
