import { resolveGooglePictureUpload } from "./GuestEnquiryPage";

const GOOGLE_PICTURE_URL = "https://lh3.googleusercontent.com/a/some-guest-photo=s96-c";
const IMAGEKIT_URL = "https://ik.imagekit.io/7khjnlfow/GuestPicture/9876543210_google_profile.jpg";

const authResponse = () => ({
  ok: true,
  status: 200,
  json: async () => ({ signature: "sig", expire: 123, token: "tok", publicKey: "pk" }),
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("no Google picture on the token resolves to empty string without calling ImageKit", async () => {
  global.fetch = jest.fn();

  const result = await resolveGooglePictureUpload("", "9876543210", "guest@thapar.edu");

  expect(result).toBe("");
  expect(global.fetch).not.toHaveBeenCalled();
});

test("successful ImageKit upload resolves to the permanent ImageKit URL", async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce(authResponse())
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ url: IMAGEKIT_URL }),
    });

  const result = await resolveGooglePictureUpload(GOOGLE_PICTURE_URL, "9876543210", "guest@thapar.edu");

  expect(result).toBe(IMAGEKIT_URL);
  expect(result).not.toBe(GOOGLE_PICTURE_URL);
});

test("failed ImageKit upload resolves to empty string, never the raw Google CDN URL", async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce(authResponse())
    .mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "ImageKit upload failed",
    });

  const result = await resolveGooglePictureUpload(GOOGLE_PICTURE_URL, "9876543210", "guest@thapar.edu");

  expect(result).toBe("");
  expect(result).not.toBe(GOOGLE_PICTURE_URL);
  expect(result).not.toMatch(/googleusercontent\.com/);
});

test("a failed ImageKit auth step also resolves to empty string, never the raw Google CDN URL", async () => {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: false,
    status: 500,
    text: async () => "Auth request failed",
  });

  const result = await resolveGooglePictureUpload(GOOGLE_PICTURE_URL, "9876543210", "guest@thapar.edu");

  expect(result).toBe("");
  expect(result).not.toBe(GOOGLE_PICTURE_URL);
});
