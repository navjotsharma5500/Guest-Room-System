import React from "react";
import { UserCircle, Phone, Mail, Camera } from "lucide-react";
import { IKContext, IKUpload } from "imagekitio-react";

const API = process.env.REACT_APP_BACKEND_URL || "http://localhost:10000";

export default function GuestProfile({ 
  booking, 
  theme, 
  profilePicture,
  isUploadingProfile,
  setIsUploadingProfile,
  setUploadedProfileUrl,
  imagekitAuthenticator 
}) {
  const b = booking;

  // Handle profile picture upload validation
  const handleProfileUpload = (file) => {
    if (!file) return false;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      alert("Only JPG, PNG, or WEBP images allowed");
      return false;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Maximum file size is 2 MB");
      return false;
    }

    return true;
  };

  const handleProfileUploadSuccess = async (response) => {
    console.log("✅ Profile picture uploaded to ImageKit:", response);

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
          alert("✅ Profile picture uploaded successfully!");
        } else {
          throw new Error("Failed to update profile picture in database");
        }
      } catch (err) {
        console.error("❌ Failed to update profile picture:", err);
        alert("Failed to update profile picture in database");
      }
    }
    
    setIsUploadingProfile(false);
  };
  
  const handleProfileUploadError = (err) => {
    console.error("❌ ImageKit upload error:", err);
    alert("Failed to upload profile picture");
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
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center border-4 border-red-300">
              <UserCircle className="w-12 h-12 text-red-400" />
            </div>
          )}

          {/* Upload Button */}
          <div className="absolute -bottom-1 -right-1">
            <IKContext
              publicKey={process.env.REACT_APP_IMAGEKIT_PUBLIC_KEY}
              urlEndpoint={process.env.REACT_APP_IMAGEKIT_URL_KEY}
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