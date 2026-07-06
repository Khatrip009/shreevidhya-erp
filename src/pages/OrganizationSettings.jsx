// src/pages/OrganizationSettings.jsx
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Upload, Save } from "lucide-react";
import AdminLayout from "../layouts/AdminLayout";
import BackButton from "../components/BackButton";

import {
  getOrganization,
  updateOrganization,
} from "../services/organizationService";
import { supabase } from "../api/supabase";
import { useOrgDarkLogo } from "../hooks/useOrgDarkLogo";

export default function OrganizationSettings() {
  const queryClient = useQueryClient();
  const darkLogo = useOrgDarkLogo();

  const [form, setForm] = useState({
    company_name: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    gstin: "",                  // NEW
    vision: "",
    mission: "",
    description: "",
  });
  const [selectedMediums, setSelectedMediums] = useState([]);
  const [logoLightFile, setLogoLightFile] = useState(null);
  const [logoDarkFile, setLogoDarkFile] = useState(null);
  const [logoLightPreview, setLogoLightPreview] = useState(null);
  const [logoDarkPreview, setLogoDarkPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ["organization"],
    queryFn: getOrganization,
    staleTime: 10 * 60 * 1000,
  });

  const { data: mediums = [], isLoading: mediumsLoading } = useQuery({
    queryKey: ["mediums"],
    queryFn: async () => {
      const { data } = await supabase
        .from("mediums")
        .select("id, name")
        .order("name");
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Populate form with fetched org data
  useEffect(() => {
    if (org) {
      setForm({
        company_name: org.company_name || "",
        address: org.address || "",
        phone: org.phone || "",
        email: org.email || "",
        website: org.website || "",
        gstin: org.gstin || "",      // NEW
        vision: org.vision || "",
        mission: org.mission || "",
        description: org.description || "",
      });
      setLogoLightPreview(org.logo_light_url);
      setLogoDarkPreview(org.logo_dark_url);

      const medIds = org.mediums ? org.mediums.map((m) => m.id) : [];
      setSelectedMediums(medIds);
    }
  }, [org]);

  const updateMutation = useMutation({
    mutationFn: updateOrganization,
    onSuccess: () => {
      toast.success("Organization updated");
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
    onError: (err) => toast.error(`Update failed: ${err.message}`),
  });

  async function uploadLogo(file, folder) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${folder}-${Date.now()}.${fileExt}`;
    const filePath = `organization/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("ShreeVidhya_Academy")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });

    if (uploadError) throw new Error(uploadError.message || "Upload failed");

    const { data: publicUrlData } = supabase.storage
      .from("ShreeVidhya_Academy")
      .getPublicUrl(filePath);
    return publicUrlData.publicUrl;
  }

  const toggleMedium = (mediumId) => {
    setSelectedMediums((prev) =>
      prev.includes(mediumId)
        ? prev.filter((id) => id !== mediumId)
        : [...prev, mediumId]
    );
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setUploading(true);
    let logoLightUrl = org?.logo_light_url;
    let logoDarkUrl = org?.logo_dark_url;

    try {
      if (logoLightFile) {
        logoLightUrl = await uploadLogo(logoLightFile, "light");
        toast.success("Light logo uploaded");
      }
      if (logoDarkFile) {
        logoDarkUrl = await uploadLogo(logoDarkFile, "dark");
        toast.success("Dark logo uploaded");
      }
    } catch (err) {
      toast.error(`Logo upload failed: ${err.message}`);
      setUploading(false);
      return;
    }

    const payload = {
      ...form,
      logo_light_url: logoLightUrl,
      logo_dark_url: logoDarkUrl,
      mediums: selectedMediums,
    };
    updateMutation.mutate(payload);
    setUploading(false);
  }

  if (orgLoading || mediumsLoading) {
    return (
      <AdminLayout>
      <BackButton to="/settings-hub" label="Settings" />
        <div className="p-8 text-center text-secondary font-montserrat">
          Loading settings…
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-righteous text-primary-dark">
          Organization Settings
        </h1>
        <p className="text-sm text-secondary-dark font-montserrat mt-1">
          Update academy details
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-secondary-light max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logos */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border">
              {logoLightPreview ? (
                <img src={logoLightPreview} alt="Light Logo" className="w-full h-full object-cover" />
              ) : (
                <Upload size={24} className="text-secondary" />
              )}
            </div>
            <div>
              <label className="text-sm font-montserrat text-secondary-dark">
                Light Logo (e.g., sidebar)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setLogoLightFile(file);
                    setLogoLightPreview(URL.createObjectURL(file));
                  }
                }}
                className="text-sm mt-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border">
              {logoDarkPreview ? (
                <img src={logoDarkPreview} alt="Dark Logo" className="w-full h-full object-cover" />
              ) : (
                <Upload size={24} className="text-secondary" />
              )}
            </div>
            <div>
              <label className="text-sm font-montserrat text-secondary-dark">
                Dark Logo (e.g., headers, PDFs)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setLogoDarkFile(file);
                    setLogoDarkPreview(URL.createObjectURL(file));
                  }
                }}
                className="text-sm mt-1"
              />
            </div>
          </div>

          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark">
                Company Name
              </label>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark">
                Phone
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark">
                Website
              </label>
              <input
                type="text"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            {/* NEW GSTIN field */}
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark">
                GSTIN
              </label>
              <input
                type="text"
                placeholder="e.g., 24AABCT1234Q1ZV"
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-montserrat text-secondary-dark">
              Address
            </label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={2}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-montserrat text-secondary-dark">
              Vision
            </label>
            <textarea
              value={form.vision}
              onChange={(e) => setForm({ ...form, vision: e.target.value })}
              rows={2}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-montserrat text-secondary-dark">
              Mission
            </label>
            <textarea
              value={form.mission}
              onChange={(e) => setForm({ ...form, mission: e.target.value })}
              rows={2}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-montserrat text-secondary-dark">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Mediums Selection */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-3">
              Mediums Supported
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {mediums.map((medium) => (
                <label
                  key={medium.id}
                  className="flex items-center gap-2 p-2 rounded border border-secondary-light hover:bg-primary-bg cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedMediums.includes(medium.id)}
                    onChange={() => toggleMedium(medium.id)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-montserrat text-secondary-dark">
                    {medium.name}
                  </span>
                </label>
              ))}
              {mediums.length === 0 && (
                <p className="text-sm text-secondary-light col-span-full">
                  No mediums defined yet.
                </p>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={uploading || updateMutation.isPending}
              className="bg-primary hover:bg-primary-light text-white px-6 py-2.5 rounded-lg font-montserrat transition flex items-center gap-2"
            >
              <Save size={18} />
              {uploading
                ? "Uploading..."
                : updateMutation.isPending
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}