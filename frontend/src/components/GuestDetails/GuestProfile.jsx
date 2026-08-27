//GuestProfile.jsx
import React, { useEffect } from "react";
import { UserCircle, Phone, Mail, Camera } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { IKContext, IKUpload } from "imagekitio-react";
import { 
  BACKEND_URL, 
  IMAGEKIT_PUBLIC_KEY, 
  IMAGEKIT_URL_ENDPOINT 
} from "../../utils/apiConfig";

const API = BACKEND_URL;

export default function GuestProfile({ 
  booking, 
  theme, 
  profilePicture,
  isUploadingProfile,
  setIsUploadingProfile,
  setUploadedProfileUrl,
  imagekitAuthenticator 
}) {
  const { showToast } = useToast();
  const b = booking;

  useEffect(() => {
    // Booking already has a persisted photo (or one was just uploaded) — nothing to recover.
    if (profilePicture) return;
    if (!b) return;

    const guestKey = b.rollNo || b.empId || b.rollOrEmpId || b.email || b.contact;
    if (!guestKey) return;

    const fetchImage = async () => {
      const candidates = [];

      // 1) Phone-based google profile filename (matches the enquiry upload convention)
      const cleanContact = (b.contact || "").toString().replace(/\D/g, "");
      if (cleanContact.length >= 10) {
        candidates.push(`${cleanContact.slice(-10)}_google_profile.jpg`);
      }

      // 2) Roll/Employee ID search (digits up to 15) - legacy ID-card photo convention
      const rollOrEmpId = (b.rollNo || b.empId || b.rollOrEmpId || "").toString();
      const rollDigits = rollOrEmpId.replace(/\D/g, "").slice(0, 15);
      if (rollDigits) {
        // ImageKit file example: 702200081__z_OttJ6r.jpg -> search by prefix
        candidates.push(rollDigits);
      }

      // 3) Email-based google profile filename (fallback upload convention)
      const email = (b.email || "").trim().toLowerCase();
      if (email) {
        // itmh_thapar.edu_google_profile.jpg (replace @ with _)
        const safeEmail = email.replace(/@/g, "_");
        candidates.push(`${safeEmail}_google_profile.jpg`);
      }

      if (candidates.length === 0) return;

      try {
        const token = localStorage.getItem("token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        for (const fileName of candidates) {
          const response = await fetch(
            `${API}/api/imagekit/search?fileName=${encodeURIComponent(fileName)}`,
            { headers, credentials: "include" }
          );

          if (!response.ok) continue;
          const data = await response.json();

          if (data.success && data.url) {
            setUploadedProfileUrl(data.url);

            // One-time recovery: persist to the booking so future loads read
            // Booking.profilePicture directly and never need this search again.
            const bookingId = b._id ?? b.id;
            if (bookingId && !String(bookingId).startsWith("b_")) {
              fetch(`${API}/api/bookings/${bookingId}/profile-picture`, {
                method: "PUT",
                credentials: "include",
                headers,
                body: JSON.stringify({ profilePicture: data.url }),
              }).catch((err) => console.error("Failed to persist recovered profile picture:", err));
            }
            return;
          }
        }
      } catch (err) {
        console.error("Error searching ImageKit:", err);
      }
    };

    fetchImage();
  }, [b, profilePicture, setUploadedProfileUrl]);

  // Handle profile picture upload validation
  const handleProfileUpload = (file) => {
    if (!file) return false;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      showToast("Only JPG, PNG, or WEBP images allowed", "error");
      return false;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast("Maximum file size is 2 MB", "error");
      return false;
    }

    return true;
  };

  const handleProfileUploadSuccess = async (response) => {
    console.log("âœ… Profile picture uploaded to ImageKit:", response);

    const uploadedUrl = response.url;
    setUploadedProfileUrl(uploadedUrl);

    const bookingId = booking?._id ?? booking?.id;

    if (bookingId && !bookingId.startsWith("b_")) {
      try {
        const authToken = localStorage.getItem("token");
        const headers = {
          "Content-Type": "application/json",
        };
        
        if (authToken) {
          headers["Authorization"] = `Bearer ${authToken}`;
        }
        
        const apiResponse = await fetch(`${API}/api/bookings/${bookingId}/profile-picture`, {
          method: "PUT",
          credentials: "include",
          headers: headers,
          body: JSON.stringify({ profilePicture: uploadedUrl }),
        });
        
        if (apiResponse.ok) {
          showToast("âœ… Profile picture uploaded successfully!", "success");
        } else {
          throw new Error("Failed to update profile picture in database");
        }
      } catch (err) {
        console.error("âŒ Failed to update profile picture:", err);
        showToast("Failed to update profile picture in database", "error");
      }
    }
    
    setIsUploadingProfile(false);
  };
  
  const handleProfileUploadError = (err) => {
    console.error("âŒ ImageKit upload error:", err);
    showToast("Failed to upload profile picture", "error");
    setIsUploadingProfile(false);
  };

  return (
    <div className={`p-6 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
      <div className="flex items-start gap-5">
        {/* Profile Picture */}
        <div className="relative group">
          {profilePicture ? (
            <img
              src={profilePicture}
              alt={b.guest || "Guest"}
              className="w-20 h-20 rounded-full object-cover border-4 border-red-300"
              onError={(e) => {
                const cacheKey = `guest_profile_missing_${b.rollNo || b.empId || b.email}`;
                localStorage.setItem(cacheKey, "true");
                e.target.onerror = null;
                e.target.src = "";
              }}
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center border-4 border-red-300">
              <UserCircle className="w-12 h-12 text-red-400" />
            </div>
          )}

          {/* Upload Button */}
          <div className="absolute -bottom-1 -right-1">
            <IKContext
              publicKey={IMAGEKIT_PUBLIC_KEY}
              urlEndpoint={IMAGEKIT_URL_ENDPOINT}
              authenticator={imagekitAuthenticator}
            >  
              <label
                htmlFor="profile-upload-ik"
                className="cursor-pointer bg-red-600 hover:bg-red-700 text-white rounded-full p-2 shadow-lg flex items-center justify-center transition transform hover:scale-110"
                title="Upload Profile Picture"
                onClick={() => {
                  const uploadInput = document.getElementById('profile-upload-ik');
                  if (uploadInput) uploadInput.click();
                }}
              >
                <Camera className="w-4 h-4" />
              </label>
              <IKUpload
                id="profile-upload-ik"
                folder="/profile-pictures"
                useUniqueFileName={true}
                isPrivateFile={false}
                tags={["profile", "guest"]}
                onUploadStart={() => setIsUploadingProfile(true)}
                onError={handleProfileUploadError}
                onSuccess={handleProfileUploadSuccess}
                validateFile={handleProfileUpload}
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
              />
            </IKContext>  
          </div>

          {isUploadingProfile && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full backdrop-blur-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-white"></div>
            </div>
          )}
        </div>

        {/* Guest Info */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {b.guest || "Guest Name"}
              </h3>

              {/* Contact Details */}
              <div className="mt-4 space-y-2">
                {b.contact && (
                  <a
                    href={`https://wa.me/${b.contact.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-base hover:bg-green-50 cursor-pointer px-3 py-2 rounded transition group"
                  >
                    <Phone className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition" />
                    <span className={`${theme === "dark" ? "text-gray-300" : "text-gray-600"} group-hover:text-green-700 transition`}>
                      {b.contact}
                    </span>
                    <span className="ml-auto text-xs bg-green-500 text-white px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition">
                      WhatsApp
                    </span>
                  </a>
                )}
                {b.email && (
                  <div className="flex items-center gap-3 text-base hover:bg-red-50 cursor-pointer px-3 py-2 rounded">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <a
                      href={`mailto:${b.email}`}
                      className={theme === "dark" ? "text-blue-300 hover:underline" : "text-blue-700 hover:underline"}
                    >
                      {b.email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
