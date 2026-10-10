import guardrail from "@/assets/photo-guardrail.jpg";
import drainage from "@/assets/photo-drainage.jpg";
import pothole from "@/assets/photo-pothole.jpg";
import highway from "@/assets/login-hero.jpg";

/** Sample photos are stored as `sample:<key>` so persisted state survives asset hashing. */
export const samplePhotos: Record<string, string> = { guardrail, drainage, pothole, highway };
export const sampleKeys = Object.keys(samplePhotos);

export function resolvePhotoUrl(url: string) {
  if (url.startsWith("sample:")) return samplePhotos[url.slice(7)] ?? highway;
  return url;
}
