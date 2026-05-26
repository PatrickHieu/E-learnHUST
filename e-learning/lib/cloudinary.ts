// Client-side unsigned upload to Cloudinary. The preset must allow the file
// types being uploaded (images, PDFs, etc. — see the Cloudinary dashboard's
// Upload presets settings). We use the `auto` endpoint so the same call
// works for both course banner images and lesson PDFs.
const CLOUD_NAME = "dxsoyupfv";
const UPLOAD_PRESET = "CoursesBanner";

export async function uploadToCloudinary(file: File): Promise<string> {
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    { method: "POST", body: data },
  );
  if (!res.ok) {
    throw new Error(`Cloudinary upload failed (${res.status})`);
  }
  const json = (await res.json()) as { secure_url?: string };
  if (!json.secure_url) {
    throw new Error("Cloudinary response missing secure_url");
  }
  return json.secure_url;
}
