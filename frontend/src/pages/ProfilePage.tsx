import React from "react";
import DeviceCertificateActions from "../components/DeviceCertificateActions";

const ProfilePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">Device Certificate Management</h2>
        <DeviceCertificateActions />
      </div>
    </div>
  );
};

export default ProfilePage;