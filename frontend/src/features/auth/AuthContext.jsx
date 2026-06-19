import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../../lib/firebase-client.js';
import { AuthContext } from './auth-context.js';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const register = async ({ email, password, username }) => {
    const normalizedUsername = username?.trim().toLowerCase();

    if (!normalizedUsername) {
      throw new Error('Username is required');
    }

    if (!/^[a-z0-9]{3,20}$/.test(normalizedUsername)) {
      throw new Error(
        'Username must be 3-20 characters and contain only letters and numbers'
      );
    }

    const usernameCheck = await fetch(
      `${import.meta.env.VITE_API_URL}/api/auth/check-username/${normalizedUsername}`
    );

    const usernameData = await usernameCheck.json();

    if (!usernameCheck.ok) {
      throw new Error(
        usernameData.error || 'Failed to check username availability'
      );
    }

    if (!usernameData.available) {
      throw new Error('Username already taken');
    }

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const token = await credential.user.getIdToken();

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            username: normalizedUsername,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        await credential.user.delete();
        throw new Error(data.error || data.message || 'Registration failed');
      }

      return credential.user;
    } catch (error) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          throw new Error('Email is already in use');

        case 'auth/invalid-email':
          throw new Error('Please enter a valid email address');

        case 'auth/weak-password':
          throw new Error('Password must be at least 6 characters');

        default:
          throw error;
      }
    }
  };

  const login = async ({ email, password }) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  };

  const resetPassword = async ({ email }) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
  };

  const value = useMemo(
    () => ({
      currentUser,
      loading,
      register,
      login,
      resetPassword,
      logout,
    }),
    [currentUser, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
