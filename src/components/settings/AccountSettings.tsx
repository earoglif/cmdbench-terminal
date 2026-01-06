import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { usersApi } from '@/shared/api/users';
import AuthModal from '@/components/AuthModal';

const AccountSettings: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, userProfile, fetchProfile } = useAuthStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
  });

  useEffect(() => {
    if (isAuthenticated && !userProfile) {
      fetchProfile();
    }
  }, [isAuthenticated, userProfile, fetchProfile]);

  useEffect(() => {
    if (isAuthenticated && userProfile) {
      setFormData({
        email: userProfile.email || '',
        firstName: userProfile.profile?.firstName || '',
      });
    }
  }, [isAuthenticated, userProfile]);

  const handleEdit = () => {
    if (userProfile) {
      setFormData({
        email: userProfile.email || '',
        firstName: userProfile.profile?.firstName || '',
      });
    }
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    if (userProfile) {
      setFormData({
        email: userProfile.email || '',
        firstName: userProfile.profile?.firstName || '',
      });
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated) return;

    setIsSaving(true);
    setError(null);

    try {
      await usersApi.updateProfile({
        email: formData.email,
        firstName: formData.firstName || undefined,
      });
      await fetchProfile();
      setIsEditing(false);
    } catch (err: any) {
      let errorMessage = t('accountSettings.updateError');
      if (err.response?.data) {
        if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
          errorMessage = err.response.data.errors
            .map((e: any) => e.message || e.path?.join('.'))
            .join(', ');
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const getDisplayName = () => {
    if (!userProfile) return '';
    const { profile } = userProfile;
    return profile?.firstName || userProfile.username;
  };

  if (!isAuthenticated) {
    return (
      <>
        <div className="flex flex-col items-center justify-center p-8">
          <p className="text-lg mb-4">{t('accountSettings.notAuthenticated')}</p>
          <button
            className="btn btn-primary"
            onClick={() => setIsAuthModalOpen(true)}
          >
            {t('accountSettings.loginRegister')}
          </button>
        </div>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t('accountSettings.title')}</h2>

      {error && (
        <div className="alert alert-error mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">{t('accountSettings.name')}</span>
          </label>
          {isEditing ? (
            <input
              type="text"
              className="input input-bordered"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder={t('accountSettings.namePlaceholder')}
            />
          ) : (
            <div className="p-3 bg-base-200 rounded-lg">
              {getDisplayName()}
            </div>
          )}
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">{t('accountSettings.email')}</span>
          </label>
          {isEditing ? (
            <input
              type="email"
              className="input input-bordered"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={t('accountSettings.emailPlaceholder')}
            />
          ) : (
            <div className="p-3 bg-base-200 rounded-lg">
              {userProfile?.email || ''}
            </div>
          )}
        </div>


        <div className="flex gap-2 mt-6">
          {isEditing ? (
            <>
              <button
                className="btn btn-ghost"
                onClick={handleCancel}
                disabled={isSaving}
              >
                {t('accountSettings.cancel')}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  t('accountSettings.save')
                )}
              </button>
            </>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleEdit}
            >
              {t('accountSettings.edit')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;

