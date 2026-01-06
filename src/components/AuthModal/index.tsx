import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { login, register, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    emailOrUsername: '',
    password: '',
    confirmPassword: '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      clearError();
      setFormData({
        email: '',
        username: '',
        emailOrUsername: '',
        password: '',
        confirmPassword: '',
      });
      setValidationErrors({});
    }
  }, [isOpen, clearError]);

  useEffect(() => {
    if (isAuthenticated) {
      onClose();
    }
  }, [isAuthenticated, onClose]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (isLoginMode) {
      if (!formData.emailOrUsername.trim()) {
        errors.emailOrUsername = t('auth.validation.emailOrUsernameRequired');
      }
      if (!formData.password) {
        errors.password = t('auth.validation.passwordRequired');
      }
    } else {
      if (!formData.email.trim()) {
        errors.email = t('auth.validation.emailRequired');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = t('auth.validation.emailInvalid');
      }
      if (!formData.username.trim()) {
        errors.username = t('auth.validation.usernameRequired');
      } else if (formData.username.length < 3) {
        errors.username = t('auth.validation.usernameMinLength');
      }
      if (!formData.password) {
        errors.password = t('auth.validation.passwordRequired');
      } else if (formData.password.length < 6) {
        errors.password = t('auth.validation.passwordMinLength');
      }
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = t('auth.validation.passwordsDoNotMatch');
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      if (isLoginMode) {
        await login(formData.emailOrUsername, formData.password);
      } else {
        await register(formData.email, formData.username, formData.password);
      }
    } catch (err) {
      console.error('Auth error:', err);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const switchMode = () => {
    setIsLoginMode(!isLoginMode);
    clearError();
    setValidationErrors({});
  };

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">
          {isLoginMode ? t('auth.login.title') : t('auth.register.title')}
        </h3>

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

        <form onSubmit={handleSubmit}>
          {isLoginMode ? (
            <>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">{t('auth.login.emailOrUsername')}</span>
                </label>
                <input
                  type="text"
                  className={`input input-bordered ${
                    validationErrors.emailOrUsername ? 'input-error' : ''
                  }`}
                  value={formData.emailOrUsername}
                  onChange={(e) => handleInputChange('emailOrUsername', e.target.value)}
                  placeholder={t('auth.login.emailOrUsernamePlaceholder')}
                />
                {validationErrors.emailOrUsername && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {validationErrors.emailOrUsername}
                    </span>
                  </label>
                )}
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">{t('auth.login.password')}</span>
                </label>
                <input
                  type="password"
                  className={`input input-bordered ${
                    validationErrors.password ? 'input-error' : ''
                  }`}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder={t('auth.login.passwordPlaceholder')}
                />
                {validationErrors.password && (
                  <label className="label">
                    <span className="label-text-alt text-error">{validationErrors.password}</span>
                  </label>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">{t('auth.register.email')}</span>
                </label>
                <input
                  type="email"
                  className={`input input-bordered ${
                    validationErrors.email ? 'input-error' : ''
                  }`}
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder={t('auth.register.emailPlaceholder')}
                />
                {validationErrors.email && (
                  <label className="label">
                    <span className="label-text-alt text-error">{validationErrors.email}</span>
                  </label>
                )}
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">{t('auth.register.username')}</span>
                </label>
                <input
                  type="text"
                  className={`input input-bordered ${
                    validationErrors.username ? 'input-error' : ''
                  }`}
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder={t('auth.register.usernamePlaceholder')}
                />
                {validationErrors.username && (
                  <label className="label">
                    <span className="label-text-alt text-error">{validationErrors.username}</span>
                  </label>
                )}
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">{t('auth.register.password')}</span>
                </label>
                <input
                  type="password"
                  className={`input input-bordered ${
                    validationErrors.password ? 'input-error' : ''
                  }`}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder={t('auth.register.passwordPlaceholder')}
                />
                {validationErrors.password && (
                  <label className="label">
                    <span className="label-text-alt text-error">{validationErrors.password}</span>
                  </label>
                )}
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">{t('auth.register.confirmPassword')}</span>
                </label>
                <input
                  type="password"
                  className={`input input-bordered ${
                    validationErrors.confirmPassword ? 'input-error' : ''
                  }`}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder={t('auth.register.confirmPasswordPlaceholder')}
                />
                {validationErrors.confirmPassword && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {validationErrors.confirmPassword}
                    </span>
                  </label>
                )}
              </div>
            </>
          )}

          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isLoading}
            >
              {t('auth.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                isLoginMode
                  ? t('auth.login.submit')
                  : t('auth.register.submit')
              )}
            </button>
          </div>
        </form>

        <div className="divider"></div>

        <div className="text-center">
          <button
            type="button"
            className="link link-primary"
            onClick={switchMode}
            disabled={isLoading}
          >
            {isLoginMode
              ? t('auth.switchToRegister')
              : t('auth.switchToLogin')}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
};

export default AuthModal;

