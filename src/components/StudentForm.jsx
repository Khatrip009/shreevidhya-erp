import { useState } from "react";
import { X, User, Phone, Mail, MapPin, School, Calendar, Hash, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../api/supabase";
import { useOrgDarkLogo } from "../hooks/useOrgDarkLogo";

export default function StudentForm({ onSubmit, onClose, initialData = {} }) {
  const isEdit = !!initialData.id;
  const darkLogo = useOrgDarkLogo();

  const [form, setForm] = useState({
    admission_no: initialData.admission_no || "",
    first_name: initialData.first_name || "",
    last_name: initialData.last_name || "",
    gender: initialData.gender || "",
    dob: initialData.dob || "",
    mobile: initialData.mobile || "",
    whatsapp: initialData.whatsapp || "",
    email: initialData.email || "",
    address: initialData.address || "",
    city: initialData.city || "",
    state: initialData.state || "",
    pincode: initialData.pincode || "",
    school_name: initialData.school_name || "",
    board: initialData.board || "",
    standard: initialData.standard || "",
    joining_date: initialData.joining_date || new Date().toISOString().split("T")[0],
    status: initialData.status || "active",
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.first_name || !form.last_name || !form.mobile) {
      toast.error("First name, last name, and mobile are required");
      return;
    }

    let photoUrl = initialData.photo_url || null;

    if (photoFile) {
      setUploading(true);
      try {
        const fileExt = photoFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `student-photos/students/${fileName}`; // folder inside bucket

        const { error: uploadError } = await supabase.storage
          .from("ShreeVidhya_Academy")
          .upload(filePath, photoFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("ShreeVidhya_Academy")
          .getPublicUrl(filePath);
        photoUrl = publicUrlData.publicUrl;
      } catch (err) {
        toast.error(`Photo upload failed: ${err.message || "Unknown error"}`);
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    // Sanitize date fields to avoid PostgreSQL errors
    const payload = {
      ...form,
      photo_url: photoUrl,
      dob: form.dob || null,
      joining_date: form.joining_date || null,
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      toast.error(err.message || "Submission failed");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header with logo */}
        <div className="sticky top-0 bg-white border-b border-secondary-light px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <img
              src={darkLogo}
              alt="ShreeVidhya Academy"
              className="h-10 w-auto"
            />
            <h2 className="text-xl font-righteous text-primary-dark">
              {isEdit ? "Edit Student" : "Add New Student"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-bg rounded-lg transition"
          >
            <X size={20} className="text-secondary-dark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Admission No & Photo Upload */}
          <div className="col-span-1 sm:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <Hash size={14} className="inline mr-1" />
                Admission No
              </label>
              <input
                name="admission_no"
                value={form.admission_no}
                onChange={handleChange}
                placeholder="Auto or manual"
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <Upload size={14} className="inline mr-1" />
                Student Photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files[0])}
                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary file:text-white hover:file:bg-primary-light file:cursor-pointer"
              />
              {initialData.photo_url && !photoFile && (
                <img
                  src={initialData.photo_url}
                  alt="Current"
                  className="h-12 w-12 rounded mt-2 object-cover border border-secondary-light"
                />
              )}
            </div>
          </div>

          {/* First & Last Name */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <User size={14} className="inline mr-1" />
              First Name *
            </label>
            <input
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              required
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
              placeholder="First name"
            />
          </div>
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <User size={14} className="inline mr-1" />
              Last Name *
            </label>
            <input
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              required
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
              placeholder="Last name"
            />
          </div>

          {/* Gender & DOB */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              Gender
            </label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <Calendar size={14} className="inline mr-1" />
              Date of Birth
            </label>
            <input
              type="date"
              name="dob"
              value={form.dob}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
          </div>

          {/* Mobile & WhatsApp */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <Phone size={14} className="inline mr-1" />
              Mobile *
            </label>
            <input
              name="mobile"
              value={form.mobile}
              onChange={handleChange}
              required
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
              placeholder="Phone number"
            />
          </div>
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <Phone size={14} className="inline mr-1" />
              WhatsApp
            </label>
            <input
              name="whatsapp"
              value={form.whatsapp}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
              placeholder="WhatsApp number"
            />
          </div>

          {/* Email */}
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <Mail size={14} className="inline mr-1" />
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
              placeholder="Email address"
            />
          </div>

          {/* Address */}
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <MapPin size={14} className="inline mr-1" />
              Address
            </label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              rows={2}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light resize-none"
              placeholder="Street address"
            />
          </div>

          {/* City, State, Pincode */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              City
            </label>
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
              placeholder="City"
            />
          </div>
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              State
            </label>
            <input
              name="state"
              value={form.state}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
              placeholder="State"
            />
          </div>
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              Pincode
            </label>
            <input
              name="pincode"
              value={form.pincode}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
              placeholder="Pincode"
            />
          </div>

          {/* School Details */}
          <div className="col-span-1 sm:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <School size={14} className="inline mr-1" />
                School Name
              </label>
              <input
                name="school_name"
                value={form.school_name}
                onChange={handleChange}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
                placeholder="School name"
              />
            </div>
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                Board
              </label>
              <input
                name="board"
                value={form.board}
                onChange={handleChange}
                placeholder="GSEB, CBSE, etc."
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
              />
            </div>
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                Standard
              </label>
              <input
                name="standard"
                value={form.standard}
                onChange={handleChange}
                placeholder="e.g., 10"
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
              />
            </div>
          </div>

          {/* Joining Date & Status */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <Calendar size={14} className="inline mr-1" />
              Joining Date
            </label>
            <input
              type="date"
              name="joining_date"
              value={form.joining_date}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              Status
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="graduated">Graduated</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="col-span-1 sm:col-span-2 flex flex-col sm:flex-row justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 border border-secondary-light rounded-lg text-secondary-dark hover:bg-secondary-bg font-montserrat transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="w-full sm:w-auto px-5 py-2.5 bg-primary hover:bg-primary-light text-white rounded-lg font-montserrat transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? "Uploading..." : isEdit ? "Update Student" : "Add Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}