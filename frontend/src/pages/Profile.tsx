import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { User, Phone, MapPin, Save, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  getProfile,
  updateProfile,
  type Profile as ProfileData,
} from "../services/profile";
import { isValidCameroonPhone } from "../utils/phoneValidator";

interface FormState {
  name: string;
  phone: string;
  location: string;
}

const EMPTY_FORM: FormState = { name: "", phone: "", location: "" };

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Load the current profile on mount so values appear immediately.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const profile: ProfileData | null = await getProfile();
        if (active && profile) {
          setForm({
            name: profile.name,
            phone: profile.phone ?? "",
            location: profile.location ?? "",
          });
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : t("profileLoadError", "Unable to load profile."),
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [t]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    // Local validation: name required, Cameroon phone when provided.
    if (!form.name.trim()) {
      setError(t("profileNameRequired", "Name is required."));
      return;
    }
    const phone = form.phone.trim();
    if (phone && !isValidCameroonPhone(phone)) {
      setError(
        t(
          "profilePhoneInvalid",
          "Phone number must be a valid Cameroon number (e.g. +237 6XXXXXXXX).",
        ),
      );
      return;
    }

    setSaving(true);
    try {
      const profile = await updateProfile({
        name: form.name.trim(),
        phone: phone || null,
        location: form.location.trim() || null,
      });
      // Reflect the saved values immediately.
      setForm({
        name: profile.name,
        phone: profile.phone ?? "",
        location: profile.location ?? "",
      });
      setSaved(true);
      toast.success(t("profileSaved", "Profile saved."));
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t("profileSaveError", "Unable to save profile.");
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full mt-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md mx-auto">
        <button
          onClick={() => navigate("/")}
          className="mb-6 flex items-center space-x-2 text-gray-600 hover:text-gray-900 font-medium transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("backButton", "Back")}</span>
        </button>

        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-2xl w-16 h-16 flex items-center justify-center bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg">
              <User className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("profileTitle", "My Profile")}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {t(
              "profileSubtitle",
              "This information helps others identify you.",
            )}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-2xl p-6 shadow-sm space-y-5"
        >
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              {t("profileName", "Name")}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                <User className="w-4 h-4" />
              </span>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder={t("profileNamePlaceholder", "Your full name")}
                className={inputClass + " pl-9"}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700"
            >
              {t("profilePhone", "Phone")}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                <Phone className="w-4 h-4" />
              </span>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="+237 6XX XX XX XX"
                className={inputClass + " pl-9"}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t("profilePhoneHint", "Cameroon format (e.g. +237 6XXXXXXX).")}
            </p>
          </div>

          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium text-gray-700"
            >
              {t("profileLocation", "Location")}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                <MapPin className="w-4 h-4" />
              </span>
              <input
                id="location"
                name="location"
                type="text"
                value={form.location}
                onChange={handleChange}
                placeholder={t("profileLocationPlaceholder", "City or region")}
                className={inputClass + " pl-9"}
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3"
            >
              {error}
            </div>
          )}

          {saved && !error && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3">
              {t("profileSaved", "Profile saved.")}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span>
              {saving
                ? t("profileSaving", "Saving...")
                : t("profileSave", "Save Profile")}
            </span>
          </button>
        </form>

        {loading && (
          <p className="text-center text-sm text-gray-500 mt-4">
            {t("profileLoading", "Loading profile...")}
          </p>
        )}
      </div>
    </div>
  );
};

export default Profile;
