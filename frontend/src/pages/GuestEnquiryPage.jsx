import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { IndianStates } from "../utils/indianStates";
import thaparLogo from "../assets/thapar_logo.png";
import bgImage from "../assets/ThaparBackground1.png";
import axios from "axios";

// Utility to convert uploaded files to base64
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

  
export default function GuestForm({ setActiveTab, addNotification }) {
  const [formType, setFormType] = useState(""); // "" | "individual" | "society"
  const [form, setForm] = useState({
    name: "",
    contact: "",
    email: "",
    gender: "Male",
    from: "",
    to: "",
    guests: "",
    females: "",
    males: "",
    state: "",
    city: "",
    reference: "",
    purpose: "",
    files: [],
  });

  const cityMap = Object.fromEntries(IndianStates.map((s) => [s.name, s.cities]));
  const [cities, setCities] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [dateError, setDateError] = useState("");


  useEffect(() => {
    setCities(cityMap[form.state] || []);
  }, [form.state]);

  // ✅ Validation
  const validate = () => {
    const { name, contact, email, from, to, guests, state, city, purpose, files } = form;
    const emailValid = email.toLowerCase().endsWith("@thapar.edu");
    const contactValid = /^[0-9]{10}$/.test(contact);

    return (
      name.trim() &&
      emailValid &&
      contactValid &&
      from &&
      to &&
      guests &&
      state &&
      city &&
      purpose.trim() &&
      files.length > 0
    );
  };

  const validateDates = (fromDate, toDate) => {
    if (!fromDate || !toDate) return "";

    const start = new Date(fromDate);
    const end = new Date(toDate);

    const diff = (end - start) / (1000 * 60 * 60 * 24);

    return diff > 5 ? "Please select a date within 5 days" : "";
  };  

  // 📂 Handle File Upload
  const handleFileChange = async (e) => {
    const newFiles = Array.from(e.target.files);
    const totalFiles = (form.files || []).length + newFiles.length;
    
    if (totalFiles > 5) {
      alert(`You can only upload up to 5 files. Currently selected: ${form.files.length}. Attempting to add: ${newFiles.length}`);
      return;
    }
    
    try {
      const base64Files = await Promise.all(newFiles.map(fileToBase64));
      setForm((f) => ({ ...f, files: [...(f.files || []), ...base64Files] }));
    } catch (err) {
      console.error("Error converting files:", err);
      alert("Error while uploading files. Try again.");
    }
  };

  // 🗑️ Remove uploaded file
  const removeFile = (index) => {
    setForm((f) => ({ ...f, files: f.files.filter((_, i) => i !== index) }));
  };

  // 📨 Submit Form
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) {
      alert("⚠️ Please fill all required fields correctly.");
      return;
    }

    // Show preview first
    setShowPreview(true);
  };

  const handleConfirmSubmit = async () => {
    try {
     const payload = {
      name: form.name,
      rollno: form.rollno,
      contact: form.contact,
      email: form.email,
      gender: form.gender,
      from: form.from,
      to: form.to,
      guests: form.guests,
      females: form.females,
      males: form.males,
      state: form.state,
      city: form.city,
      reference: form.reference,
      purpose: form.purpose,
      files: form.files,   // base64 array
      department: form.department,
    };
    
    await axios.post(
      `${process.env.REACT_APP_API_URL}/api/enquiry/create`,
      payload
    );
    
    addNotification?.({
      name: form.name,
      date: new Date().toLocaleString(),
      message: `New enquiry from ${form.city}, ${form.state}`,
    });
    
    setShowPreview(false);
    setSubmitted(true);
  } catch (err) {
    console.error("Failed to submit enquiry:", err);
    alert("Failed to submit. Please try again.");
  }
};        

    const departmentList = [
      "ALUMINI",
      "BETECH",
      "BEMBA",
      "BLAS",
      "JRF",
      "PHD",
      "PHDP",
      "MA",
      "ME",
      "MCA",
      "MSc",
      "MTECH",
      "RA",
    ]  

  // ==================== UI ====================
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-cover bg-center bg-fixed relative"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundColor: "rgba(255,248,240,0.4)",
        backgroundBlendMode: "overlay",
      }}
    >
      <AnimatePresence mode="wait">
        {!submitted && !showPreview ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.6 }}
            className="w-full flex flex-col items-center"
          >
            {/* Logo */}
            <motion.img
              src={thaparLogo}
              alt="Thapar Institute"
              className="w-40 mb-4 drop-shadow-lg"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            />

            {/* Title */}
            <h1 className="text-3xl font-bold text-red-700 mb-8 tracking-wide text-center drop-shadow-md">
              Hostel Guest Room Booking Form
            </h1>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="bg-white bg-opacity-90 border-2 border-red-600 rounded-3xl shadow-2xl p-8 w-full max-w-3xl"
            >
              <div className="grid grid-cols-2 gap-4">
                {/* Name / Contact / Email */}
                {[
                  { name: "name", placeholder: "Full Name / Society Name *" },
                  { name: "rollno", placeholder: "Roll No. / Employee ID *" },
                  { name: "contact", placeholder: "Contact Number (10 digits) *", maxLength: 10 },
                  { name: "email", placeholder: "Email (@thapar.edu only) *" },
                ].map((field, i) => (
                  <div key={i} className="flex flex-col col-span-2 md:col-span-1">
                    <input
                      key={i}
                      type="text"
                      placeholder={field.placeholder}
                      value={form[field.name]}
                      onChange={(e) => {
                        const value = e.target.value; 
                      
                        // Live email validation
                        if (field.name === "email") {
                          if (!value.endsWith("@thapar.edu")) {
                            setEmailError("Please enter @thapar.edu Domain");
                          } else {
                            setEmailError("");
                          }
                        }
                       
                        setForm({
                          ...form,
                          [field.name]:
                            field.name === "contact"
                              ? e.target.value.replace(/[^0-9]/g, "")
                              : e.target.value,
                        });
                      }}
                      className="border-2 border-red-400 p-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300"
                      {...(field.maxLength && { maxLength: field.maxLength })}
                      required
                    />

                    {field.name === "email" && emailError && (
                      <p className="text-red-600 text-xs mt-1">{emailError}</p>
                    )}
                  </div>    
                ))}

                {/* Department Dropdown */}
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="border-2 border-red-400 p-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300"
                  required
                >
                <option value="">Select Department *</option>
                {departmentList.map((dep) => (
                  <option key={dep} value={dep}>{dep}</option>
                ))}  
              </select> 
          
                {/* Gender */}
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="border-2 border-red-400 p-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300"
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Both</option>
                </select>

                {/* Dates */}
                <input
                  type="date"
                  value={form.from}
                  onChange={(e) => {
                    const newFrom = e.target.value;
                    const err = validateDates(newFrom, form.to);
                    setDateError(err);
                    setForm({ ...form, from: newFrom });
                  }}
                  className="border-2 border-red-400 p-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"  
                  required
                />
                <input
                  type="date"
                  value={form.to}
                  onChange={(e) => {
                    const selected = e.target.value;
                    const start = new Date(form.from);
                    const end = new Date(selected);

                    // Calculate difference in days
                    const diff = (end - start) / (1000 * 60 * 60 * 24);

                    if (diff > 5) {
                      setDateError("Please select a date within 5 days");
                    } else {
                      setDateError("");
                    }
                    
                    setForm({ ...form, to: selected });
                  }}
                  className="border-2 border-red-400 p-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  required  
                />

                {dateError && (
                  <p className="text-red-600 text-xs col-span-2">{dateError}</p>
                )}  

                {/* Guests */}
                <input
                  type="number"
                  placeholder="Total Guests *"
                  value={form.guests}
                  onChange={(e) => setForm({ ...form, guests: e.target.value })}
                  className="border-2 border-red-400 p-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
                <input
                  type="number"
                  placeholder="Number of Females"
                  value={form.females}
                  onChange={(e) => setForm({ ...form, females: e.target.value })}
                  className="border-2 border-red-400 p-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <input
                  type="number"
                  placeholder="Number of Males"
                  value={form.males}
                  onChange={(e) => setForm({ ...form, males: e.target.value })}
                  className="border-2 border-red-400 p-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                />

                {/* State / City */}
                <select
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="border-2 border-red-400 p-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Select State *</option>
                  {Object.keys(cityMap).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>

                <select
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="border-2 border-red-400 p-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Select City *</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                {/* Reference */}
                <input
                  placeholder="Reference"
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  className="col-span-2 border-2 border-red-400 p-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                />

                {/* Purpose */}
                <textarea
                  placeholder="Purpose of Stay *"
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  className="col-span-2 border-2 border-red-400 p-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500 h-32"
                  required
                />

                {/* File Upload */}
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Upload Address Proof (up to 5 files) * - {form.files?.length || 0} file(s) selected
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="text-sm border-2 border-red-400 p-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  {form.files && form.files.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-600 mb-1">
                        {form.files.length} file(s) uploaded. You can add more (max 5 total).
                      </div>
                      <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2">
                        {form.files.map((file, i) => (
                          <div key={i} className="relative text-xs px-3 py-1.5 rounded flex items-center gap-2 bg-red-50 text-gray-700 border border-red-200">
                            📎 File {i + 1}
                            <button
                              onClick={() => removeFile(i)}
                              className="ml-1 text-gray-500 hover:text-red-600 font-bold"
                              type="button"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit */}
              <div className="mt-6 text-center">
                <button
                  type="submit"
                  className="px-8 py-2 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-all duration-300"
                >
                  Preview & Submit
                </button>
              </div>
            </form>
          </motion.div>
        ) : showPreview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            className="w-full flex flex-col items-center"
          >
            <motion.img
              src={thaparLogo}
              alt="Thapar Institute"
              className="w-40 mb-4 drop-shadow-lg"
            />
            <h1 className="text-3xl font-bold text-red-700 mb-6 tracking-wide text-center drop-shadow-md">
              Review Your Information
            </h1>
            <div className="bg-white bg-opacity-90 border-2 border-red-600 rounded-3xl shadow-2xl p-8 w-full max-w-3xl">
              <div className="space-y-3 text-gray-700">
                <div className="grid grid-cols-2 gap-4">
                  <p><strong>Name:</strong> {form.name}</p>
                  <p><strong>Contact:</strong> {form.contact}</p>
                  <p><strong>Email:</strong> {form.email}</p>
                  <p><strong>Gender:</strong> {form.gender}</p>
                  <p><strong>Check-in:</strong> {form.from}</p>
                  <p><strong>Check-out:</strong> {form.to}</p>
                  <p><strong>Total Guests:</strong> {form.guests}</p>
                  {form.females && <p><strong>Females:</strong> {form.females}</p>}
                  {form.males && <p><strong>Males:</strong> {form.males}</p>}
                  <p><strong>State:</strong> {form.state}</p>
                  <p><strong>City:</strong> {form.city}</p>
                  {form.reference && <p><strong>Reference:</strong> {form.reference}</p>}
                </div>
                <div>
                  <p><strong>Purpose of Stay:</strong></p>
                  <p className="mt-1 text-sm bg-gray-50 p-3 rounded">{form.purpose}</p>
                </div>
                <p><strong>Files Uploaded:</strong> {form.files?.length || 0} file(s)</p>
              </div>

              <div className="mt-6 flex justify-center gap-4">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-8 py-2 bg-gray-400 text-white rounded-full shadow-lg hover:bg-gray-500 transition-all duration-300"
                >
                  Edit Information
                </button>
                <button
                  onClick={handleConfirmSubmit}
                  className="px-8 py-2 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-all duration-300"
                >
                  Confirm & Submit
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="thankyou"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.7 }}
            className="flex flex-col items-center justify-center text-center bg-white bg-opacity-90 border-2 border-red-500 rounded-3xl shadow-2xl p-12 max-w-lg mx-auto"
          >
            <img src={thaparLogo} alt="Thapar Institute" className="w-28 mb-4 drop-shadow-md" />
            <CheckCircle2 className="text-green-500 w-16 h-16 mb-4" />
            <h2 className="text-3xl font-bold text-red-700 mb-3">
              Thank You for Your Booking Request
            </h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              We're happy to assist you. A confirmation email will be sent shortly.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setShowPreview(false);
                setForm({
                  name: "",
                  contact: "",
                  email: "",
                  gender: "Male",
                  from: "",
                  to: "",
                  guests: "",
                  females: "",
                  males: "",
                  state: "",
                  city: "",
                  reference: "",
                  purpose: "",
                  files: [],
                });
              }}
              className="px-6 py-2 bg-red-600 text-white rounded-full shadow hover:bg-red-700 transition-all duration-300"
            >
              Submit Another Enquiry
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
