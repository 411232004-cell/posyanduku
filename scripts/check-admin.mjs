import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import nextEnv from "@next/env";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { loadEnvConfig } = nextEnv;
loadEnvConfig(ROOT);

const requiredEnv = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
];
const missingEnv = requiredEnv.filter((key) => !process.env[key]?.trim());

if (missingEnv.length) {
  console.error(`Konfigurasi belum lengkap. Isi variabel berikut di file .env Next.js atau environment:\n- ${missingEnv.join("\n- ")}`);
  process.exitCode = 1;
} else {
  const ORTU_DOMAIN = process.env.NEXT_PUBLIC_ORTU_EMAIL_DOMAIN || "sipanak.app";
  const PETUGAS_DOMAIN =
    process.env.NEXT_PUBLIC_PETUGAS_EMAIL_DOMAIN || `petugas.${ORTU_DOMAIN}`;
  const ADMIN_USER = process.env.ADMIN_USERNAME.trim().toLowerCase();
  const ADMIN_PASS = process.env.ADMIN_PASSWORD;
  const email = ADMIN_USER.includes("@")
    ? ADMIN_USER
    : `${ADMIN_USER}@${PETUGAS_DOMAIN}`;

  async function checkAdmin() {
    const app = getApps().length
      ? getApps()[0]
      : initializeApp({
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        });
    const db = getFirestore(app);
    const auth = getAuth(app);

    console.log(`[1] Project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
    console.log(`[2] Login sebagai: ${email}`);

    let cred;
    try {
      cred = await signInWithEmailAndPassword(auth, email, ADMIN_PASS);
      console.log(`[3] Auth OK — uid: ${cred.user.uid}, email: ${cred.user.email}`);
    } catch (error) {
      console.error(`[3] Auth GAGAL: ${error.code || error.message}`);
      if (["auth/user-not-found", "auth/invalid-credential"].includes(error.code)) {
        console.error(`    → Akun "${email}" tidak ditemukan atau password salah.`);
      }
      return false;
    }

    let snap;
    try {
      snap = await getDoc(doc(db, "users", cred.user.uid));
    } catch (error) {
      console.error(
        `[4] Gagal membaca dokumen users: ${error.code || error.message} → periksa firestore.rules dan koneksi Firebase.`
      );
      return false;
    }

    if (!snap.exists()) {
      console.error(
        `[4] Dokumen users/${cred.user.uid} tidak ditemukan. Buat dokumen dengan ID UID tersebut dan field role="admin".`
      );
      return false;
    }

    const role = snap.data().role;
    if (!["admin", "nakes", "kader"].includes(role)) {
      console.error(`[5] Role "${role}" tidak valid — harus admin, nakes, atau kader.`);
      return false;
    }

    console.log(`[4] Dokumen users ditemukan.`);
    console.log(`[5] Role "${role}" valid — seharusnya bisa login di aplikasi.`);
    return true;
  }

  try {
    process.exitCode = (await checkAdmin()) ? 0 : 1;
  } catch (error) {
    console.error(`Pemeriksaan admin gagal: ${error.code || error.message}`);
    process.exitCode = 1;
  }
}
